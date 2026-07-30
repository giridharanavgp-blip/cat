import React, { useEffect, useRef } from "react";

export default function TeachingVideoModal({ behavior, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!behavior) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl max-w-2xl w-full overflow-hidden border border-slate-700/60 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
              {behavior.category} · Instructional Video
            </span>
            <h3 className="font-bold text-white text-lg">{behavior.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="bg-black/90 relative">
          {behavior.teaching_video_url ? (
            <video
              ref={videoRef}
              src={behavior.teaching_video_url}
              controls
              className="w-full max-h-[380px] object-contain bg-black"
              preload="metadata"
            >
              Your browser does not support embedded video playback.
            </video>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              No teaching video URL specified for this target behavior.
            </div>
          )}
        </div>

        <div className="p-6 space-y-4 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Caregiver & Clinician Guidance</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {behavior.description ||
              "Observe how the target behavior is modeled in the video above. Practice this behavior in short, low-pressure conversational turns, and provide specific praise when demonstrated correctly."}
          </p>
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-indigo-300">Implementation Protocols:</p>
            <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
              <li>Watch the complete clip before attempting guided home practice.</li>
              <li>Demonstrate the behavior yourself prior to asking the patient to try.</li>
              <li>Maintain short, positive intervention blocks (5-10 minutes).</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Protocol Window
          </button>
        </div>
      </div>
    </div>
  );
}

