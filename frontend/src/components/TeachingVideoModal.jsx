import React, { useEffect, useRef } from "react";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;
  if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
  } else if (url.includes("youtube.com/watch")) {
    try {
      const searchParams = new URLSearchParams(url.split("?")[1]);
      videoId = searchParams.get("v");
    } catch (_) {}
  }
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }
  return null;
}

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

  const youtubeEmbedUrl = getYouTubeEmbedUrl(behavior.teaching_video_url);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-700/60 shadow-2xl animate-fade-in"
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

        <div className="bg-black relative aspect-video flex items-center justify-center">
          {youtubeEmbedUrl ? (
            <iframe
              className="w-full h-full border-0 rounded-none"
              src={youtubeEmbedUrl}
              title={behavior.title || "Speech Training Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : behavior.teaching_video_url ? (
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide">Caregiver & Clinician Guidance</h4>
            </div>
            {behavior.teaching_video_url && (
              <a
                href={behavior.teaching_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 transition hover:bg-indigo-500/20"
              >
                <span>Watch directly on YouTube</span>
                <span>↗</span>
              </a>
            )}
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

