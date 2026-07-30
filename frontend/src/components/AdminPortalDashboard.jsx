import React, { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import { supabase } from "../lib/supabaseClient";

export default function AdminPortalDashboard({ clinicName = "Metro Speech & Language Clinic", adminName = "Dr. Admin, Director", onSignOut }) {
  const [liveMetrics, setLiveMetrics] = useState({
    activeSLPs: 4,
    totalPatients: 142,
    evaluationsConducted: 1840,
    aiReportsGenerated: 1410,
    activeSessions: 3,
  });

  const [liveActivityFeed, setLiveActivityFeed] = useState([
    { id: 1, type: "report", text: "AI Clinical Report generated for Maya Patel (Articulation Deficit)", time: "Just now", badge: "AI Synthesis" },
    { id: 2, type: "audio", text: "Speech recording analyzed for Maya Patel (160 WPM, 195 Hz Pitch, 0 Fillers)", time: "2 mins ago", badge: "Acoustics" },
    { id: 3, type: "score", text: "Dr. Demo SLP scored 'Correct Production of /s/ Sound' -> Present", time: "4 mins ago", badge: "Checklist" },
    { id: 4, type: "session", text: "Dr. Demo SLP joined live session room for Maya Patel", time: "6 mins ago", badge: "Socket.io" },
    { id: 5, type: "patient", text: "New Patient Registered: John Doe (Age 8, Speech Delay)", time: "12 mins ago", badge: "Roster" },
  ]);

  const [staffList, setStaffList] = useState([
    { id: "slp-1", name: "Dr. Demo SLP", email: "dr.demo.slp@example.com", role: "Senior SLP", activePatients: 12, sessionsThisMonth: 48, status: "Live Evaluation" },
    { id: "slp-2", name: "Sarah Jenkins, M.S., CCC-SLP", email: "s.jenkins@clinic.org", role: "Pediatric SLP", activePatients: 18, sessionsThisMonth: 62, status: "Online" },
    { id: "slp-3", name: "Marcus Vance, M.A., SLP", email: "m.vance@clinic.org", role: "Voice & Fluency Specialist", activePatients: 9, sessionsThisMonth: 34, status: "Online" },
    { id: "slp-4", name: "Elena Rostova, Ph.D.", email: "e.rostova@clinic.org", role: "Clinical Supervisor", activePatients: 15, sessionsThisMonth: 51, status: "Idle" }
  ]);

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Pediatric SLP");

  // --------------------------------------------------------------
  // Real-Time Socket.io & Supabase Subscription Listener
  // --------------------------------------------------------------
  useEffect(() => {
    // Join global admin telemetry room
    socket.emit("join-admin-room", { adminName });

    const handleScoreUpdate = (payload) => {
      setLiveMetrics((prev) => ({
        ...prev,
        evaluationsConducted: prev.evaluationsConducted + 1,
      }));

      const newLog = {
        id: Date.now(),
        type: "score",
        text: `${payload.updatedBy || "Clinician"} updated score for behavior ${payload.behaviorId || "target"} -> ${payload.status}`,
        time: "Just now",
        badge: "Real-time Sync",
      };
      setLiveActivityFeed((prev) => [newLog, ...prev.slice(0, 15)]);
    };

    const handleParticipantJoined = (payload) => {
      setLiveMetrics((prev) => ({
        ...prev,
        activeSLPs: Math.max(1, payload.connectedCount || prev.activeSLPs),
      }));

      const newLog = {
        id: Date.now(),
        type: "session",
        text: `Clinician joined evaluation session room (Connected: ${payload.connectedCount})`,
        time: "Just now",
        badge: "Socket.io",
      };
      setLiveActivityFeed((prev) => [newLog, ...prev.slice(0, 15)]);
    };

    socket.on("score-update", handleScoreUpdate);
    socket.on("participant-joined", handleParticipantJoined);

    // Supabase Real-Time DB Subscription (if connected)
    try {
      const channel = supabase
        .channel("admin-realtime-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "assessment_scores" }, (payload) => {
          setLiveMetrics((prev) => ({ ...prev, evaluationsConducted: prev.evaluationsConducted + 1 }));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "clinical_reports" }, (payload) => {
          setLiveMetrics((prev) => ({ ...prev, aiReportsGenerated: prev.aiReportsGenerated + 1 }));
          setLiveActivityFeed((prev) => [
            { id: Date.now(), type: "report", text: "New AI Clinical Report synthesized and persisted", time: "Just now", badge: "Database" },
            ...prev.slice(0, 15),
          ]);
        })
        .subscribe();

      return () => {
        socket.off("score-update", handleScoreUpdate);
        socket.off("participant-joined", handleParticipantJoined);
        supabase.removeChannel(channel);
      };
    } catch (_) {
      return () => {
        socket.off("score-update", handleScoreUpdate);
        socket.off("participant-joined", handleParticipantJoined);
      };
    }
  }, [adminName]);

  function handleAddStaff(e) {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newStaff = {
      id: `slp-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, ".")}@clinic.org`,
      role: newStaffRole,
      activePatients: 0,
      sessionsThisMonth: 0,
      status: "Online",
    };

    setStaffList((prev) => [newStaff, ...prev]);
    setLiveMetrics((prev) => ({ ...prev, activeSLPs: prev.activeSLPs + 1 }));
    setNewStaffName("");
    setNewStaffEmail("");
    setShowAddStaffModal(false);

    setLiveActivityFeed((prev) => [
      { id: Date.now(), type: "staff", text: `Admin added new staff member: ${newStaff.name} (${newStaff.role})`, time: "Just now", badge: "Admin Action" },
      ...prev.slice(0, 15),
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">CAT Executive Admin Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold uppercase">
                Live Director Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">{clinicName}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Sign Out ({adminName})
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Executive Banner */}
        <div className="glass-panel rounded-2xl p-6 relative gradient-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Real-Time Clinic Telemetry Dashboard</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">{clinicName}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Director: <span className="text-slate-200 font-medium">{adminName}</span> · Connected to WebSocket & Supabase Real-time
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-semibold">Live WebSocket Gateway Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinic KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Active SLP Staff" value={`${liveMetrics.activeSLPs} SLPs`} change="Online in clinic" icon="👨‍⚕️" color="text-indigo-400" />
          <KpiCard title="Total Patients Roster" value={`${liveMetrics.totalPatients} Patients`} change="+14% this month" icon="👥" color="text-sky-400" />
          <KpiCard title="Evaluations Conducted" value={`${liveMetrics.evaluationsConducted.toLocaleString()} Sessions`} change="Live auto-updated" icon="📋" color="text-emerald-400" />
          <KpiCard title="AI Reports Generated" value={`${liveMetrics.aiReportsGenerated.toLocaleString()} Reports`} change="Gemini 1.5 Flash" icon="✨" color="text-amber-400" />
        </div>

        {/* Real-Time Clinical Activity Log Stream */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">Live Clinical Activity & Telemetry Stream</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Real-time Broadcast Channel</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {liveActivityFeed.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-[10px]">
                    {item.badge}
                  </span>
                  <span className="text-slate-200 font-medium">{item.text}</span>
                </div>
                <span className="text-slate-500 text-[11px] whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Roster Management */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Clinical Staff Roster & Live Status</h2>
              <p className="text-xs text-slate-400">Manage clinician staff accounts and active patient workloads</p>
            </div>

            <button
              onClick={() => setShowAddStaffModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
            >
              + Add New Clinician
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pt-2 font-semibold">Clinician Name</th>
                  <th className="pb-3 pt-2 font-semibold">Role</th>
                  <th className="pb-3 pt-2 font-semibold">Active Patients</th>
                  <th className="pb-3 pt-2 font-semibold">Sessions (Month)</th>
                  <th className="pb-3 pt-2 font-semibold">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 font-semibold text-white">
                      {staff.name}
                      <span className="block text-[11px] text-slate-400 font-normal">{staff.email}</span>
                    </td>
                    <td className="py-3">{staff.role}</td>
                    <td className="py-3 font-semibold text-indigo-300">{staff.activePatients}</td>
                    <td className="py-3 font-semibold text-emerald-300">{staff.sessionsThisMonth}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        staff.status === "Live Evaluation"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : staff.status === "Online"
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {staff.status === "Live Evaluation" ? "🟢 " : staff.status === "Online" ? "🔵 " : "⚪ "}
                        {staff.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure & Security Monitor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">🔒 Security & RLS Compliance Status</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Row-Level Security (RLS)</span>
                <span className="text-emerald-400 font-semibold">Enforced (PostgreSQL)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Data Encryption at Rest</span>
                <span className="text-emerald-400 font-semibold">AES-256 Enabled</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Socket.io Gateway SSL</span>
                <span className="text-emerald-400 font-semibold">TLS 1.3 Active</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">⚡ AI Microservice Health Telemetry</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Whisper STT Latency</span>
                <span className="text-sky-400 font-semibold">~1.2s / audio clip</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>LLM Generation Latency</span>
                <span className="text-amber-400 font-semibold">~2.1s (Gemini 1.5)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Librosa Acoustic Pipeline</span>
                <span className="text-emerald-400 font-semibold">100% Operational</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Clinician Staff</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name & Credentials</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Connor, CCC-SLP"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="s.connor@clinic.org"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specialty Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Pediatric SLP">Pediatric SLP</option>
                  <option value="Senior SLP">Senior SLP</option>
                  <option value="Voice & Fluency Specialist">Voice & Fluency Specialist</option>
                  <option value="Clinical Supervisor">Clinical Supervisor</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Save Clinician Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, change, icon, color }) {
  return (
    <div className="glass-panel rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{change}</p>
    </div>
  );
}
