# CAT — Communication Assessment Tool

An AI-assisted communication assessment platform for Speech-Language Pathologists (SLPs). Built entirely on free/open-source tiers.

## Architecture

```
cat-project/
├── database/
│   └── schema.sql          # Supabase/Postgres schema, RLS policies, seed data
├── ai-engine/               # Python FastAPI — audio analysis + AI report generation
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── gateway/                  # Node.js + Express + Socket.io — real-time sync
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/                 # React (Vite) + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── AssessmentDashboard.jsx
    │   │   ├── TeachingVideoModal.jsx
    │   │   └── ReportViewer.jsx
    │   ├── lib/
    │   │   ├── supabaseClient.js
    │   │   └── socket.js
    │   ├── App.jsx
    │   └── main.jsx
    └── .env.example
```

**Data flow:**
1. Clinician signs in (Supabase Auth) → creates/selects a patient → starts an assessment session.
2. `AssessmentDashboard` loads standardized behaviors and syncs Present/Absent scoring in real time over the Node/Socket.io **gateway** (so multiple clinicians/trainees can view the same live session).
3. Clinician uploads a client audio recording → sent to the Python **AI engine** `/analyze-audio`, which runs `faster-whisper` (transcription) and `librosa` (pitch, pace, pauses).
4. Clinician clicks "Generate Report" → scores + audio metrics are sent to `/generate-report`, which prompts Gemini 1.5 Flash (or Groq/Llama 3) to write a narrative clinical report.
5. Clinician clicks "Export PDF" → `/generate-pdf` converts the Markdown report to a downloadable PDF via `reportlab`.
6. `TeachingVideoModal` streams Cloudinary-hosted instructional videos for caregivers/trainees.
7. `vr-telemetry-stream` and WebRTC signaling events on the gateway are ready to wire up a VR headset/session client for live streaming and monitoring.

---

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- A free **Supabase** account: https://supabase.com
- A free **Google Gemini API key**: https://aistudio.google.com/app/apikey
  (or a free **Groq API key** as an alternative: https://console.groq.com/keys)
- (Optional) A free **Cloudinary** account for hosting teaching videos: https://cloudinary.com

---

## 1. Set up Supabase (Database & Auth)

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of `database/schema.sql`, and run it.
   This creates all 7 tables, Row-Level Security policies, and seeds 8 sample standardized behaviors.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key (for the frontend)
   - `service_role` key (for the backend/gateway — keep this secret, never expose it client-side)
4. Go to **Authentication → Providers** and confirm **Email** sign-up is enabled (it is by default).

---

## 2. Run the Python AI Engine (FastAPI)

```bash
cd ai-engine
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_key_here
#   LLM_PROVIDER=gemini
#   WHISPER_MODEL_SIZE=base      (use "tiny" for faster/lower-resource dev)

uvicorn main:app --reload --port 8000
```

Verify it's running: open http://localhost:8000/health — you should see `{"status": "ok", ...}`.
Interactive API docs are auto-generated at http://localhost:8000/docs.

> **Note:** the first request to `/analyze-audio` will download the Whisper model weights (a few hundred MB), so it may take a minute the first time.

---

## 3. Run the Node.js Real-Time Gateway

```bash
cd gateway
npm install

cp .env.example .env
# Edit .env:
#   PORT=4000
#   ALLOWED_ORIGINS=http://localhost:5173
#   SUPABASE_URL=...            (optional, enables score persistence from the socket layer)
#   SUPABASE_SERVICE_KEY=...    (use the service_role key here, not anon)

npm run start        # or: npm run dev  (auto-reload via nodemon)
```

Verify: open http://localhost:4000/health.

---

## 4. Run the React Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your_anon_key_here
#   VITE_GATEWAY_URL=http://localhost:4000
#   VITE_AI_ENGINE_URL=http://localhost:8000

npm run dev
```

Open http://localhost:5173, sign up with an email/password (this also creates your `clinicians` row), add a patient, and start a session.

---

## 5. (Optional) Host Teaching Videos on Cloudinary

1. Create a free Cloudinary account and upload behavior demonstration videos.
2. Copy each video's secure URL.
3. Update the `teaching_video_url` column for the relevant row in the `behaviors` table (via Supabase Table Editor or SQL), e.g.:
   ```sql
   update behaviors
   set teaching_video_url = 'https://res.cloudinary.com/<your-cloud-name>/video/upload/v1/eye_contact.mp4'
   where title = 'Eye Contact During Conversation';
   ```

---

## Running Everything Together (Dev)

Open three terminals:

| Terminal | Command | Port |
|---|---|---|
| 1 — AI Engine | `cd ai-engine && uvicorn main:app --reload --port 8000` | 8000 |
| 2 — Gateway | `cd gateway && npm run dev` | 4000 |
| 3 — Frontend | `cd frontend && npm run dev` | 5173 |

Then visit **http://localhost:5173**.

---

## Real-Time / VR Events Reference (Socket.io)

| Event | Direction | Payload |
|---|---|---|
| `join-session` | client → server | `{ sessionId, clinicianName }` |
| `session-state` | server → client | `{ sessionId, scores: [...] }` (sent on join) |
| `score-update` | client ↔ server | `{ sessionId, behaviorId, status, notes, updatedBy }` |
| `participant-joined` / `participant-left` | server → client | `{ connectedCount, ... }` |
| `vr-telemetry-stream` | client ↔ server | `{ sessionId, telemetryType, data, timestamp }` |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | client ↔ server | Standard WebRTC signaling relay, scoped by `sessionId`/`targetId` |

---

## Free-Tier Notes & Swaps

- **LLM provider**: defaults to Gemini 1.5 Flash (generous free tier). Set `LLM_PROVIDER=groq` in `ai-engine/.env` and add `GROQ_API_KEY` to use Llama 3 via Groq instead — no code changes needed, `main.py` already supports both.
- **Whisper model size**: `base` is a good CPU-friendly default. Use `tiny` on very limited hardware, or `small`/`medium` for better accuracy if you have more compute.
- **Cloudinary** free tier easily covers a small library of short instructional clips; Supabase Storage is a drop-in alternative if preferred.
- **Supabase** free tier includes Postgres, Auth, and Storage — sufficient for development and small-scale deployment.

---

## Troubleshooting

- **CORS errors in the browser console**: make sure `ALLOWED_ORIGINS` in `ai-engine/.env` and `gateway/.env` includes `http://localhost:5173`.
- **`GEMINI_API_KEY is not configured`**: confirm `.env` is in `ai-engine/` (not the repo root) and that you restarted `uvicorn` after editing it.
- **Whisper is slow**: switch `WHISPER_MODEL_SIZE=tiny` in `ai-engine/.env` for faster iteration during development.
- **Socket.io not connecting**: confirm the gateway is running on the port referenced by `VITE_GATEWAY_URL`, and that no firewall is blocking WebSocket upgrades.
