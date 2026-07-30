"""
CAT - Communication Assessment Tool
Python FastAPI AI & Analytics Engine
====================================
Endpoints:
  POST /analyze-audio    -> transcription + pitch/pace/fluency metrics
  POST /generate-report  -> LLM-generated narrative SLP clinical report
  POST /generate-pdf     -> converts markdown report into a downloadable PDF
  GET  /health           -> health check

Run:
    uvicorn main:app --reload --port 8000
"""

import os
import io
import uuid
import tempfile
import shutil
from datetime import datetime
from typing import List, Optional, Literal

import numpy as np
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from faster_whisper import WhisperModel

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
import markdown2
from html.parser import HTMLParser

load_dotenv()

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
PDF_OUTPUT_DIR = os.getenv("PDF_OUTPUT_DIR", "./generated_reports")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)

# ------------------------------------------------------------------
# App init
# ------------------------------------------------------------------
app = FastAPI(
    title="CAT AI Engine",
    description="Speech analysis & AI clinical report generation for the Communication Assessment Tool",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Lazy-loaded Whisper model (loaded once, reused across requests)
# ------------------------------------------------------------------
_whisper_model: Optional[WhisperModel] = None


def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        # compute_type="int8" keeps this runnable on CPU-only free-tier hardware
        _whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return _whisper_model


# ------------------------------------------------------------------
# LLM client setup (Gemini primary, Groq fallback — both free tiers)
# ------------------------------------------------------------------
def call_llm(prompt: str) -> str:
    """Dispatches the prompt to whichever free LLM provider is configured."""
    if LLM_PROVIDER == "groq":
        return _call_groq(prompt)
    return _call_gemini(prompt)


def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    if not response or not response.text:
        raise HTTPException(status_code=502, detail="Empty response from Gemini API.")
    return response.text


def _call_groq(prompt: str) -> str:
    from groq import Groq

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")

    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=2048,
    )
    return completion.choices[0].message.content


# ------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------
class AudioAnalysisResult(BaseModel):
    transcript: str
    duration: float
    tempo_bpm: float
    pitch_avg: float
    pitch_std: float
    pause_count: int
    words_per_minute: float
    language: str


class BehaviorScore(BaseModel):
    title: str
    category: str
    status: Literal["Present", "Absent", "Not Observed"]
    notes: Optional[str] = ""


class PatientInfo(BaseModel):
    name: str
    age: Optional[int] = None
    primary_diagnosis: Optional[str] = None


class GenerateReportRequest(BaseModel):
    patient: PatientInfo
    clinician_name: str
    session_date: Optional[str] = None
    scores: List[BehaviorScore]
    audio_metrics: Optional[AudioAnalysisResult] = None


class GenerateReportResponse(BaseModel):
    report_markdown: str
    generated_at: str


class GeneratePdfRequest(BaseModel):
    report_markdown: str
    patient_name: str
    session_id: Optional[str] = None


# ------------------------------------------------------------------
# Helper: Audio Metrics via librosa
# ------------------------------------------------------------------
def compute_audio_metrics(audio_path: str, transcript_word_count: int) -> dict:
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    # --- Tempo / speaking pace (onset-strength based, proxy for speech rate) ---
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    tempo_bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])

    # --- Pitch (fundamental frequency) via pyin ---
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
    )
    voiced_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
    pitch_avg = float(np.mean(voiced_f0)) if voiced_f0.size > 0 else 0.0
    pitch_std = float(np.std(voiced_f0)) if voiced_f0.size > 0 else 0.0

    # --- Pause detection via silence intervals ---
    intervals = librosa.effects.split(y, top_db=30)
    # pauses = gaps between voiced intervals
    pause_count = max(0, len(intervals) - 1)

    # --- Words per minute from transcript + duration ---
    words_per_minute = float((transcript_word_count / duration) * 60) if duration > 0 else 0.0

    return {
        "duration": round(duration, 2),
        "tempo_bpm": round(tempo_bpm, 2),
        "pitch_avg": round(pitch_avg, 2),
        "pitch_std": round(pitch_std, 2),
        "pause_count": pause_count,
        "words_per_minute": round(words_per_minute, 2),
    }


# ------------------------------------------------------------------
# Endpoint: /analyze-audio
# ------------------------------------------------------------------
@app.post("/analyze-audio", response_model=AudioAnalysisResult)
async def analyze_audio(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".wav", ".mp3", ".m4a", ".ogg", ".flac")):
        raise HTTPException(status_code=400, detail="Unsupported audio format. Use wav, mp3, m4a, ogg, or flac.")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Normalize to WAV for consistent librosa/whisper handling
        y, sr = librosa.load(tmp_path, sr=16000, mono=True)
        wav_path = tmp_path + "_norm.wav"
        sf.write(wav_path, y, sr)

        # --- Transcription ---
        model = get_whisper_model()
        segments, info = model.transcribe(wav_path, beam_size=5, vad_filter=True)
        segment_list = list(segments)
        transcript = " ".join(seg.text.strip() for seg in segment_list).strip()
        word_count = len(transcript.split())

        # --- Acoustic metrics ---
        metrics = compute_audio_metrics(wav_path, word_count)

        return AudioAnalysisResult(
            transcript=transcript,
            duration=metrics["duration"],
            tempo_bpm=metrics["tempo_bpm"],
            pitch_avg=metrics["pitch_avg"],
            pitch_std=metrics["pitch_std"],
            pause_count=metrics["pause_count"],
            words_per_minute=metrics["words_per_minute"],
            language=info.language if info else "unknown",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")
    finally:
        for p in [tmp_path, tmp_path + "_norm.wav"]:
            if os.path.exists(p):
                os.remove(p)


# ------------------------------------------------------------------
# Endpoint: /generate-report
# ------------------------------------------------------------------
def build_report_prompt(payload: GenerateReportRequest) -> str:
    present = [s for s in payload.scores if s.status == "Present"]
    absent = [s for s in payload.scores if s.status == "Absent"]
    not_observed = [s for s in payload.scores if s.status == "Not Observed"]

    def format_list(items: List[BehaviorScore]) -> str:
        if not items:
            return "  - None"
        return "\n".join(
            f"  - {i.title} ({i.category})" + (f" — Note: {i.notes}" if i.notes else "")
            for i in items
        )

    audio_section = "No audio recording was analyzed for this session."
    if payload.audio_metrics:
        m = payload.audio_metrics
        audio_section = f"""
- Transcript excerpt: "{m.transcript[:500]}"
- Recording duration: {m.duration} seconds
- Speaking pace (tempo): {m.tempo_bpm} BPM
- Words per minute: {m.words_per_minute}
- Average pitch (F0): {m.pitch_avg} Hz
- Pitch variability (std dev): {m.pitch_std} Hz
- Detected pause segments: {m.pause_count}
"""

    prompt = f"""
You are an experienced, licensed Speech-Language Pathologist (SLP) writing a formal clinical evaluation report.
Write in professional, objective, third-person clinical language suitable for inclusion in a patient's medical record.

PATIENT INFORMATION:
- Name: {payload.patient.name}
- Age: {payload.patient.age if payload.patient.age is not None else "Not specified"}
- Primary Diagnosis / Referral Reason: {payload.patient.primary_diagnosis or "Not specified"}
- Evaluating Clinician: {payload.clinician_name}
- Session Date: {payload.session_date or datetime.utcnow().strftime("%Y-%m-%d")}

BEHAVIORS OBSERVED AS PRESENT (typical/appropriate skill demonstrated):
{format_list(present)}

BEHAVIORS OBSERVED AS ABSENT (skill deficit noted):
{format_list(absent)}

BEHAVIORS NOT OBSERVED DURING SESSION:
{format_list(not_observed)}

AUDIO/ACOUSTIC ANALYSIS DATA:
{audio_section}

TASK:
Write a complete clinical report in Markdown with the following sections, using level-2 headings ("## Section Name"):
## Background and Reason for Referral
## Assessment Procedures
## Clinical Observations and Findings
   (Synthesize the Present/Absent behavior data into a narrative discussion, organized by category — Articulation, Fluency, Voice, Language, Pragmatics — as applicable)
## Acoustic and Speech Analysis Summary
   (Interpret the tempo, pitch, and pause data in clinical terms — e.g., whether pace/pitch fall within typical conversational ranges, and what that may suggest)
## Clinical Impressions
## Recommendations
   (Provide 3-6 specific, actionable recommendations for therapy goals, caregiver strategies, or further evaluation)

Keep the tone professional and evidence-based. Do not invent scores or data not provided above. If audio data was not provided, omit unsupported claims and note that acoustic analysis was not performed.
Output ONLY the Markdown report, with no preamble or explanation before or after it.
"""
    return prompt.strip()


@app.post("/generate-report", response_model=GenerateReportResponse)
async def generate_report(payload: GenerateReportRequest):
    if not payload.scores:
        raise HTTPException(status_code=400, detail="At least one behavior score is required to generate a report.")

    prompt = build_report_prompt(payload)
    try:
        report_text = call_llm(prompt)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM report generation failed: {str(e)}")

    return GenerateReportResponse(
        report_markdown=report_text.strip(),
        generated_at=datetime.utcnow().isoformat(),
    )


# ------------------------------------------------------------------
# Endpoint: /generate-pdf
# ------------------------------------------------------------------
class _MarkdownToPdfParser(HTMLParser):
    """Minimal HTML -> ReportLab flowable converter for markdown2 output."""

    def __init__(self, styles):
        super().__init__()
        self.styles = styles
        self.flowables = []
        self._buffer = ""
        self._current_tag = None
        self._list_items = []
        self._in_list = False

    def handle_starttag(self, tag, attrs):
        if tag in ("h1", "h2", "h3", "p", "li"):
            self._current_tag = tag
            self._buffer = ""
        if tag == "ul" or tag == "ol":
            self._in_list = True
            self._list_items = []

    def handle_endtag(self, tag):
        text = self._buffer.strip()
        if tag == "h1" and text:
            self.flowables.append(Paragraph(text, self.styles["ReportH1"]))
            self.flowables.append(Spacer(1, 10))
        elif tag == "h2" and text:
            self.flowables.append(Spacer(1, 8))
            self.flowables.append(Paragraph(text, self.styles["ReportH2"]))
            self.flowables.append(Spacer(1, 4))
        elif tag == "h3" and text:
            self.flowables.append(Paragraph(text, self.styles["ReportH3"]))
        elif tag == "p" and text:
            self.flowables.append(Paragraph(text, self.styles["ReportBody"]))
            self.flowables.append(Spacer(1, 6))
        elif tag == "li" and text:
            self.flowables.append(Paragraph(f"&bull;&nbsp;&nbsp;{text}", self.styles["ReportBullet"]))
        elif tag in ("ul", "ol"):
            self._in_list = False
            self.flowables.append(Spacer(1, 6))
        self._current_tag = None
        self._buffer = ""

    def handle_data(self, data):
        if self._current_tag:
            self._buffer += data


def markdown_to_pdf_flowables(md_text: str, styles) -> list:
    html = markdown2.markdown(md_text, extras=["tables"])
    parser = _MarkdownToPdfParser(styles)
    parser.feed(html)
    return parser.flowables


@app.post("/generate-pdf")
async def generate_pdf(payload: GeneratePdfRequest):
    if not payload.report_markdown.strip():
        raise HTTPException(status_code=400, detail="report_markdown cannot be empty.")

    file_id = payload.session_id or str(uuid.uuid4())
    filename = f"CAT_Report_{file_id}.pdf"
    filepath = os.path.join(PDF_OUTPUT_DIR, filename)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", fontSize=18, leading=22, spaceAfter=6, alignment=TA_LEFT, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="ReportMeta", fontSize=10, textColor=colors.grey, spaceAfter=14))
    styles.add(ParagraphStyle(name="ReportH1", fontSize=15, leading=18, fontName="Helvetica-Bold", spaceBefore=10))
    styles.add(ParagraphStyle(name="ReportH2", fontSize=13, leading=16, fontName="Helvetica-Bold", textColor=colors.HexColor("#1f4e79"), spaceBefore=10))
    styles.add(ParagraphStyle(name="ReportH3", fontSize=11, leading=14, fontName="Helvetica-Bold", spaceBefore=6))
    styles.add(ParagraphStyle(name="ReportBody", fontSize=10.5, leading=15, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="ReportBullet", fontSize=10.5, leading=15, leftIndent=14))

    doc = SimpleDocTemplate(
        filepath,
        pagesize=LETTER,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.8 * inch,
        rightMargin=0.8 * inch,
        title=f"Clinical Report - {payload.patient_name}",
    )

    story = [
        Paragraph("Speech-Language Pathology Clinical Evaluation Report", styles["ReportTitle"]),
        Paragraph(
            f"Patient: {payload.patient_name} &nbsp;|&nbsp; Generated: {datetime.utcnow().strftime('%B %d, %Y')}",
            styles["ReportMeta"],
        ),
    ]
    story.extend(markdown_to_pdf_flowables(payload.report_markdown, styles))

    doc.build(story)

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/pdf",
    )


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "cat-ai-engine", "llm_provider": LLM_PROVIDER, "whisper_model": WHISPER_MODEL_SIZE}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
