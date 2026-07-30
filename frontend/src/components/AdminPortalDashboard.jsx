import React, { useState } from "react";

export default function AdminPortalDashboard({ clinicName = "Metro Speech & Language Clinic", adminName = "Dr. Admin, Director", onSignOut }) {
  const [staffList, setStaffList] = useState([
    { id: "slp-1", name: "Dr. Demo SLP", email: "dr.demo.slp@example.com", role: "Senior SLP", activePatients: 12, sessionsThisMonth: 48, status: "Active" },
    { id: "slp-2", name: "Sarah Jenkins, M.S., CCC-SLP", email: "s.jenkins@clinic.org", role: "Pediatric SLP", activePatients: 18, sessionsThisMonth: 62, status: "Active" },
    { id: "slp-3", name: "Marcus Vance, M.A., SLP", email: "m.vance@clinic.org", role: "Voice & Fluency Specialist", activePatients: 9, sessionsThisMonth: 34, status: "Active" },
    { id: "slp-4", name: "Elena Rostova, Ph.D.", email: "e.rostova@clinic.org", role: "Clinical Supervisor", activePatients: 15, sessionsThisMonth: 51, status: "Active" }
  ]);

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
                Director Mode
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
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Clinic Telemetry Dashboard</span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">{clinicName}</h1>
              <p className="text-xs text-slate-400 mt-1">Logged in as <span className="text-slate-200 font-medium">{adminName}</span></p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">System Status: 100% Operational (HIPAA Compliant)</span>
            </div>
          </div>
        </div>

        {/* Clinic KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Active SLP Staff" value="12 SLPs" change="+2 this quarter" icon="👨‍⚕️" color="text-indigo-400" />
          <KpiCard title="Total Clinic Patients" value="142 Patients" change="+14% MoM" icon="👥" color="text-sky-400" />
          <KpiCard title="Evaluations Conducted" value="1,840 Sessions" change="Real-time synced" icon="📋" color="text-emerald-400" />
          <KpiCard title="AI Reports Generated" value="1,410 Reports" change="Gemini 1.5 Flash" icon="✨" color="text-amber-400" />
        </div>

        {/* Staff Roster Management */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Clinical Staff Roster & Activity Metrics</h2>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition">
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
                  <th className="pb-3 pt-2 font-semibold">Status</th>
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
