import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { socket, AI_ENGINE_URL } from "../lib/socket";
import { supabase } from "../lib/supabaseClient";
import TeachingVideoModal from "./TeachingVideoModal";
import ReportViewer from "./ReportViewer";

const STATUS_OPTIONS = ["Present", "Absent", "Not Observed"];

const STATUS_STYLES = {
  Present: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10",
  Absent: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10",
  "Not Observed": "bg-slate-800 text-slate-400 border-slate-700",
};

const CATEGORY_COLORS = {
  Pragmatics: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  Articulation: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Fluency: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Voice: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  Language: "bg-violet-500/10 text-violet-300 border-violet-500/20",
};

export default function AssessmentDashboard({ sessionId, patient, clinicianName }) {
  const [behaviors, setBehaviors] = useState([]);
  const [scores, setScores] = useState({});
  const [connectedCount, setConnectedCount] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");

  const [activeVideoBehavior, setActiveVideoBehavior] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const DEFAULT_BEHAVIORS = [
    { id: "b1", title: "Eye Contact During Conversation", category: "Pragmatics", description: "Client initiates and maintains appropriate eye contact during conversational turns.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/eye_contact_demo.mp4" },
    { id: "b2", title: "Turn-Taking in Dialogue", category: "Pragmatics", description: "Client waits for conversational partner to finish before responding.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/turn_taking_demo.mp4" },
    { id: "b3", title: "Correct Production of /s/ Sound", category: "Articulation", description: "Client produces /s/ phoneme correctly in initial, medial, and final word positions.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/s_sound_demo.mp4" },
    { id: "b4", title: "Fluent Speech Without Repetitions", category: "Fluency", description: "Client speaks without part-word or whole-word repetitions exceeding typical disfluency norms.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/fluency_demo.mp4" },
    { id: "b5", title: "Appropriate Vocal Pitch Variation", category: "Voice", description: "Client demonstrates natural pitch inflection appropriate to age and gender norms.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/pitch_demo.mp4" },
    { id: "b6", title: "Use of Appropriate Sentence Length", category: "Language", description: "Client produces sentences of age-appropriate mean length of utterance (MLU).", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/mlu_demo.mp4" },
    { id: "b7", title: "Requesting Clarification", category: "Pragmatics", description: "Client appropriately requests clarification when a message is not understood.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/clarification_demo.mp4" },
    { id: "b8", title: "Appropriate Vocal Loudness", category: "Voice", description: "Client maintains vocal intensity appropriate to context without excessive strain.", teaching_video_url: "https://res.cloudinary.com/demo/video/upload/v1/cat/loudness_demo.mp4" }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const { data: behaviorRows, error: behaviorErr } = await supabase
          .from("behaviors")
          .select("*")
          .order("category", { ascending: true });

        if (!behaviorErr && behaviorRows && behaviorRows.length > 0) {
          setBehaviors(behaviorRows);
        } else {
          setBehaviors(DEFAULT_BEHAVIORS);
        }
      } catch (_) {
        setBehaviors(DEFAULT_BEHAVIORS);
      }

      if (sessionId) {
        try {
          const { data: scoreRows, error: scoreErr } = await supabase
            .from("assessment_scores")
            .select("*")
            .eq("session_id", sessionId);

          if (!scoreErr && scoreRows) {
            const scoreMap = {};
            scoreRows.forEach((row) => {
              scoreMap[row.behavior_id] = {
                status: row.status,
                notes: row.notes || "",
                updatedAt: row.updated_at,
              };
            });
            setScores(scoreMap);
          }
        } catch (_) {}
      }
    }
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit("join-session", { sessionId, clinicianName });

    const handleSessionState = (payload) => {
      if (payload.sessionId !== sessionId) return;
      setScores((prev) => {
        const next = { ...prev };
        payload.scores.forEach((s) => {
          next[s.behaviorId] = { status: s.status, notes: s.notes, updatedAt: s.updatedAt };
        });
        return next;
      });
    };

    const handleScoreUpdate = (payload) => {
      if (payload.sessionId !== sessionId) return;
      setScores((prev) => ({
        ...prev,
        [payload.behaviorId]: {
          status: payload.status,
          notes: payload.notes,
          updatedBy: payload.updatedBy,
          updatedAt: payload.updatedAt,
        },
      }));
    };

    const handleParticipantJoined = (payload) => setConnectedCount(payload.connectedCount);
    const handleParticipantLeft = (payload) => setConnectedCount(payload.connectedCount);

    socket.on("session-state", handleSessionState);
    socket.on("score-update", handleScoreUpdate);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("participant-left", handleParticipantLeft);

    return () => {
      socket.off("session-state", handleSessionState);
      socket.off("score-update", handleScoreUpdate);
      socket.off("participant-joined", handleParticipantJoined);
      socket.off("participant-left", handleParticipantLeft);
    };
  }, [sessionId, clinicianName]);

  function handleStatusChange(behaviorId, status) {
    const notes = scores[behaviorId]?.notes || "";
    socket.emit("score-update", {
      sessionId,
      behaviorId,
      status,
      notes,
      updatedBy: clinicianName,
    });
    setScores((prev) => ({
      ...prev,
      [behaviorId]: { ...prev[behaviorId], status, notes },
    }));
  }

  function handleNotesChange(behaviorId, notes) {
    const status = scores[behaviorId]?.status || "Not Observed";
    setScores((prev) => ({ ...prev, [behaviorId]: { ...prev[behaviorId], notes, status } }));
  }

  function handleNotesBlur(behaviorId) {
    const entry = scores[behaviorId];
    if (!entry) return;
    socket.emit("score-update", {
      sessionId,
      behaviorId,
      status: entry.status || "Not Observed",
      notes: entry.notes || "",
      updatedBy: clinicianName,
    });
  }

  async function handleAudioUpload() {
    if (!audioFile) return;
    setIsAnalyzingAudio(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await axios.post(`${AI_ENGINE_URL}/analyze-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAudioAnalysis(response.data);

      if (sessionId) {
        try {
          await supabase.from("audio_analyses").insert({
            session_id: sessionId,
            transcript: response.data.transcript,
            tempo_bpm: response.data.tempo_bpm,
            pitch_avg: response.data.pitch_avg,
            duration: response.data.duration,
          });
        } catch (_) {}
      }
    } catch (err) {
      setErrorMessage(
        `Audio analysis failed: ${err.response?.data?.detail || err.message}`
      );
    } finally {
      setIsAnalyzingAudio(false);
    }
  }

  async function handleGenerateReport() {
    setIsGeneratingReport(true);
    setErrorMessage(null);
    try {
      const scorePayload = behaviors.map((b) => ({
        title: b.title,
        category: b.category,
        status: scores[b.id]?.status || "Not Observed",
        notes: scores[b.id]?.notes || "",
      }));

      const response = await axios.post(`${AI_ENGINE_URL}/generate-report`, {
        patient: {
          name: patient?.name || "Unknown",
          age: patient?.age ?? null,
          primary_diagnosis: patient?.primary_diagnosis || null,
        },
        clinician_name: clinicianName,
        session_date: new Date().toISOString().split("T")[0],
        scores: scorePayload,
        audio_metrics: audioAnalysis || null,
      });

      setReportMarkdown(response.data.report_markdown);

      if (sessionId) {
        try {
          await supabase.from("clinical_reports").insert({
            session_id: sessionId,
            report_markdown: response.data.report_markdown,
          });
        } catch (_) {}
      }
    } catch (err) {
      setErrorMessage(
        `Report generation failed: ${err.response?.data?.detail || err.message}`
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(behaviors.map((b) => b.category));
    return ["all", ...Array.from(cats)];
  }, [behaviors]);

  const filteredBehaviors = useMemo(() => {
    if (activeCategory === "all") return behaviors;
    return behaviors.filter((b) => b.category === activeCategory);
  }, [behaviors, activeCategory]);

  const progressSummary = useMemo(() => {
    const total = behaviors.length;
    const scored = behaviors.filter((b) => scores[b.id]?.status && scores[b.id]?.status !== "Not Observed").length;
    return { total, scored, percentage: total ? Math.round((scored / total) * 100) : 0 };
  }, [behaviors, scores]);

  return (
    <div className="space-y-6">
      {/* Session Overview Header */}
      <div className="glass-panel rounded-2xl p-6 relative gradient-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Clinical Evaluation</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                Standardized Checklist
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evaluating <span className="font-semibold text-slate-200">{patient?.name}</span>
              {patient?.age ? ` · Age ${patient.age}` : ""}
              {patient?.primary_diagnosis ? ` · Diagnosis: ${patient.primary_diagnosis}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">{connectedCount} Clinician{connectedCount !== 1 ? "s" : ""} Live</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Card */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Assessment Completion Rate</span>
            <span className="text-indigo-400">
              {progressSummary.scored} of {progressSummary.total} Behaviors Scored ({progressSummary.percentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-1.5 rounded-full transition-all duration-500 shadow-sm shadow-indigo-500/50"
              style={{ width: `${progressSummary.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold text-rose-400 hover:text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition border whitespace-nowrap ${
              activeCategory === cat
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {cat === "all" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      {/* Behavior Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBehaviors.map((behavior) => {
          const entry = scores[behavior.id] || {};
          const categoryStyle = CATEGORY_COLORS[behavior.category] || "bg-slate-800 text-slate-300 border-slate-700";

          return (
            <div
              key={behavior.id}
              className="glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4 glass-card-hover"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoryStyle}`}>
                    {behavior.category}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">{behavior.title}</h3>
                {behavior.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">{behavior.description}</p>
                )}
              </div>

              {/* Status Option Toggle Buttons */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((status) => {
                    const isSelected = entry.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(behavior.id, status)}
                        className={`text-xs font-semibold py-2 rounded-lg border transition ${
                          isSelected
                            ? STATUS_STYLES[status]
                            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  placeholder="Clinical notes & observation details..."
                  value={entry.notes || ""}
                  onChange={(e) => handleNotesChange(behavior.id, e.target.value)}
                  onBlur={() => handleNotesBlur(behavior.id)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  rows={2}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Audio Recording Analysis Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-base font-bold">
              🎙️
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Audio Recording & Acoustic Analytics</h2>
              <p className="text-xs text-slate-400">Upload audio for automatic Whisper transcription & acoustic metrics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.ogg,.flac"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />

          <button
            onClick={handleAudioUpload}
            disabled={!audioFile || isAnalyzingAudio}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-sky-600/20 whitespace-nowrap flex items-center justify-center gap-2"
          >
            {isAnalyzingAudio ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Analyzing Acoustic Data...</span>
              </>
            ) : (
              <span>Upload & Analyze File</span>
            )}
          </button>
        </div>

        {isAnalyzingAudio && (
          <div className="flex items-center justify-center gap-1.5 py-6">
            <div className="w-1.5 h-6 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-8 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-10 bg-emerald-400 rounded-full animate-bounce" />
            <div className="w-1.5 h-8 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-6 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          </div>
        )}

        {audioAnalysis && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <AudioMetricCard label="Recording Duration" value={`${audioAnalysis.duration}s`} icon="⏱️" />
              <AudioMetricCard label="Speech Tempo" value={`${audioAnalysis.tempo_bpm} BPM`} icon="🎵" />
              <AudioMetricCard label="Speaking Rate" value={`${audioAnalysis.words_per_minute} WPM`} icon="⚡" />
              <AudioMetricCard label="Avg Pitch Frequency" value={`${audioAnalysis.pitch_avg} Hz`} icon="📊" />
            </div>

            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Automated Speech Transcript</p>
              <p className="text-sm text-slate-200 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                "{audioAnalysis.transcript}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Clinical Report Generation Section */}
      <div className="glass-panel rounded-2xl p-6 space-y-6 gradient-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-base font-bold">
              ✨
            </div>
            <div>
              <h2 className="font-bold text-white text-base">LLM Clinical Report Generation</h2>
              <p className="text-xs text-slate-400">Synthesize scored observations and acoustic metrics into a formal SLP report</p>
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || behaviors.length === 0}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-40 transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
          >
            {isGeneratingReport ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <span>Generate AI Clinical Narrative</span>
            )}
          </button>
        </div>

        {reportMarkdown && (
          <ReportViewer
            reportMarkdown={reportMarkdown}
            patientName={patient?.name || "patient"}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}

function AudioMetricCard({ label, value, icon }) {
  return (
    <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="font-bold text-white text-sm mt-0.5">{value}</p>
      </div>
      <span className="text-base">{icon}</span>
    </div>
  );
}

