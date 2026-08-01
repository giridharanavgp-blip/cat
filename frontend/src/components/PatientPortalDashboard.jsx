import React, { useState } from "react";
import TeachingVideoModal from "./TeachingVideoModal";

export default function PatientPortalDashboard({ patientName = "Maya Patel", age = 10, diagnosis = "Articulation Deficit / Sigmatism", onSignOut }) {
  const [activeVideo, setActiveVideo] = useState(null);

  const ASSIGNED_TARGETS = [
    {
      id: "b3",
      title: "Correct Production of /s/ Sound",
      category: "Articulation",
      description: "Practice producing the /s/ sound cleanly at the beginning and end of words (e.g., 'sun', 'bus').",
      progress: 75,
      status: "In Progress",
      teaching_video_url: "https://www.youtube.com/watch?v=Kk_t9L-y74k",
      notes: "Great improvement on initial position. Work on final /s/ sounds this week!"
    },
    {
      id: "b1",
      title: "Eye Contact During Conversation",
      category: "Pragmatics",
      description: "Maintain natural eye contact during conversational turns with family members.",
      progress: 90,
      status: "Achieved Target",
      teaching_video_url: "https://www.youtube.com/watch?v=O9tE25YV-rE",
      notes: "Maintained steady eye contact for 5 minutes during story time."
    },
    {
      id: "b4",
      title: "Fluent Speech Without Repetitions",
      category: "Fluency",
      description: "Speak smoothly without repeating words or stopping mid-sentence.",
      progress: 60,
      status: "In Progress",
      teaching_video_url: "https://www.youtube.com/watch?v=gzb-uFv5z8g",
      notes: "Practice gentle speech onset when starting new sentences."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            👤
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">CAT Patient & Caregiver Portal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold uppercase">
                Patient Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">Caregiver Home Practice Hub</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Sign Out ({patientName})
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="glass-panel rounded-2xl p-6 relative gradient-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Welcome Back</span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">{patientName}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Age: {age} yrs · Diagnosis: <span className="text-slate-200 font-medium">{diagnosis}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-emerald-400 text-sm">3 Active</span> Homework Goals
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Home Practice Video Cards */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">Assigned Speech Targets & Guided Videos</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ASSIGNED_TARGETS.map((target) => (
              <div key={target.id} className="glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {target.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{target.status}</span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{target.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{target.description}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                      <span>Goal Progress</span>
                      <span className="text-emerald-400">{target.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${target.progress}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-bold text-indigo-300">Clinician Note:</span> {target.notes}
                  </div>

                  <button
                    onClick={() => setActiveVideo(target)}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                  >
                    <span>▶ Watch Demonstration Video</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical History & Practice Guidance */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">💡 Home Practice Instructions for Caregivers</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Practice home speech exercises in brief 5-to-10 minute daily intervals.</li>
            <li>Watch the instructional video together with {patientName} before starting practice turns.</li>
            <li>Offer immediate positive praise when target sounds are produced correctly.</li>
          </ul>
        </div>
      </main>

      {activeVideo && (
        <TeachingVideoModal
          behavior={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
