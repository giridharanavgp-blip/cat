/**
 * CAT - Communication Assessment Tool
 * Real-Time Gateway: Node.js + Express + Socket.io
 * ---------------------------------------------------
 * Responsibilities:
 *  - Relay real-time Present/Absent/Not Observed score updates across
 *    all clinicians/observers viewing the same assessment session.
 *  - Relay VR telemetry / session data streams for real-time monitoring.
 *  - Provide a lightweight WebRTC signaling relay (offer/answer/ICE)
 *    for peer-to-peer VR session video streaming.
 *
 * Run:
 *   npm install
 *   npm run start        (or npm run dev for nodemon auto-reload)
 */

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

// Optional Supabase persistence layer for score updates
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// ------------------------------------------------------------------
// In-memory session state
// sessions: Map<sessionId, { clients: Set<socketId>, scores: Map<behaviorId, scoreObj> }>
// ------------------------------------------------------------------
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      clients: new Set(),
      scores: new Map(),
      vrTelemetry: [],
    });
  }
  return sessions.get(sessionId);
}

// ------------------------------------------------------------------
// REST health / debug endpoints
// ------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "cat-realtime-gateway",
    activeSessions: sessions.size,
    supabasePersistence: !!supabase,
  });
});

app.get("/sessions/:sessionId/state", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or has no active connections." });
  res.json({
    sessionId: req.params.sessionId,
    connectedClients: session.clients.size,
    scores: Array.from(session.scores.entries()).map(([behaviorId, data]) => ({ behaviorId, ...data })),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  let currentSessionId = null;

  // --------------------------------------------------------------
  // join-session: client joins a Socket.io "room" for a session
  // payload: { sessionId, clinicianName }
  // --------------------------------------------------------------
  socket.on("join-session", ({ sessionId, clinicianName }) => {
    if (!sessionId) return;

    currentSessionId = sessionId;
    socket.join(sessionId);

    const session = getOrCreateSession(sessionId);
    session.clients.add(socket.id);

    // Send the newly joined client the current known state
    socket.emit("session-state", {
      sessionId,
      scores: Array.from(session.scores.entries()).map(([behaviorId, data]) => ({ behaviorId, ...data })),
    });

    // Notify others in the room
    socket.to(sessionId).emit("participant-joined", {
      clinicianName: clinicianName || "Unknown clinician",
      socketId: socket.id,
      connectedCount: session.clients.size,
    });

    console.log(`[session:${sessionId}] ${clinicianName || socket.id} joined (${session.clients.size} connected)`);
  });

  // --------------------------------------------------------------
  // score-update: relays a Present/Absent/Not Observed toggle change
  // payload: { sessionId, behaviorId, status, notes, updatedBy }
  // --------------------------------------------------------------
  socket.on("score-update", async (payload) => {
    const { sessionId, behaviorId, status, notes, updatedBy } = payload || {};
    if (!sessionId || !behaviorId || !status) {
      socket.emit("error-event", { message: "score-update requires sessionId, behaviorId, and status." });
      return;
    }

    const session = getOrCreateSession(sessionId);
    const scoreRecord = {
      status,
      notes: notes || "",
      updatedBy: updatedBy || "unknown",
      updatedAt: new Date().toISOString(),
    };
    session.scores.set(behaviorId, scoreRecord);

    // Broadcast to everyone in the room, including sender, for consistent UI state
    io.to(sessionId).emit("score-update", { sessionId, behaviorId, ...scoreRecord });

    // Optional persistence to Supabase
    if (supabase) {
      try {
        await supabase
          .from("assessment_scores")
          .upsert(
            {
              session_id: sessionId,
              behavior_id: behaviorId,
              status,
              notes: notes || null,
              updated_at: scoreRecord.updatedAt,
            },
            { onConflict: "session_id,behavior_id" }
          );
      } catch (err) {
        console.error("[supabase] failed to persist score-update:", err.message);
      }
    }
  });

  // --------------------------------------------------------------
  // vr-telemetry-stream: relays live VR session data (head pose,
  // gaze, interaction events, or video frame metadata) to observers
  // payload: { sessionId, telemetryType, data, timestamp }
  // --------------------------------------------------------------
  socket.on("vr-telemetry-stream", (payload) => {
    const { sessionId, telemetryType, data, timestamp } = payload || {};
    if (!sessionId) return;

    const session = getOrCreateSession(sessionId);
    const entry = { telemetryType, data, timestamp: timestamp || Date.now(), from: socket.id };

    // Keep only the most recent 200 telemetry entries per session (rolling buffer)
    session.vrTelemetry.push(entry);
    if (session.vrTelemetry.length > 200) session.vrTelemetry.shift();

    // Broadcast to everyone else observing this session (e.g. supervising clinician dashboard)
    socket.to(sessionId).emit("vr-telemetry-stream", entry);
  });

  // --------------------------------------------------------------
  // WebRTC signaling relay for VR session video streaming
  // Generic offer/answer/ICE relay scoped to a session room
  // --------------------------------------------------------------
  socket.on("webrtc-offer", ({ sessionId, targetId, sdp }) => {
    io.to(targetId || sessionId).emit("webrtc-offer", { sdp, from: socket.id });
  });

  socket.on("webrtc-answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc-answer", { sdp, from: socket.id });
  });

  socket.on("webrtc-ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("webrtc-ice-candidate", { candidate, from: socket.id });
  });

  // --------------------------------------------------------------
  // Disconnect cleanup
  // --------------------------------------------------------------
  socket.on("disconnect", () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
    if (currentSessionId && sessions.has(currentSessionId)) {
      const session = sessions.get(currentSessionId);
      session.clients.delete(socket.id);
      socket.to(currentSessionId).emit("participant-left", {
        socketId: socket.id,
        connectedCount: session.clients.size,
      });

      // Clean up empty sessions to avoid unbounded memory growth
      if (session.clients.size === 0) {
        sessions.delete(currentSessionId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`CAT real-time gateway listening on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
