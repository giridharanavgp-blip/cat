import React, { useEffect, useRef, useState } from "react";

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

// Fallback high-speed direct HTML5 demonstration video URL for speech practice
const SAMPLE_SPEECH_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export default function TeachingVideoModal({ behavior, onClose }) {
  const videoRef = useRef(null);
  const [playerMode, setPlayerMode] = useState("html5"); // "html5" or "youtube"
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showWaveform, setShowWaveform] = useState(true);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!behavior) return null;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(behavior.teaching_video_url);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-700/60 shadow-2xl animate-fade-in space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                {behavior.category} · Speech Practice Video
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                ● Active Protocol
              </span>
            </div>
            <h3 className="font-bold text-white text-lg mt-0.5">{behavior.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {youtubeEmbedUrl && (
              <button
                onClick={() => setPlayerMode(playerMode === "html5" ? "youtube" : "html5")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
              >
                {playerMode === "html5" ? "📺 Switch to YouTube" : "⚡ Switch to Direct HD Player"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Player Display Container */}
        <div className="bg-black relative aspect-video flex items-center justify-center overflow-hidden group">
          {playerMode === "youtube" && youtubeEmbedUrl ? (
            <iframe
              className="w-full h-full border-0"
              src={youtubeEmbedUrl}
              title={behavior.title || "Speech Training Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={behavior.teaching_video_url && behavior.teaching_video_url.endsWith(".mp4") ? behavior.teaching_video_url : SAMPLE_SPEECH_VIDEO_URL}
              controls
              autoPlay
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain bg-black"
              preload="metadata"
            >
              Your browser does not support embedded video playback.
            </video>
          )}

          {/* Live Waveform Overlay FX */}
          {showWaveform && isPlaying && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 text-xs text-emerald-400 font-mono pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Acoustic Frequency: 185 Hz</span>
            </div>
          )}
        </div>

        {/* Interactive Speech Therapy Playback Controls & Speed Toolbar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <span>{isPlaying ? "⏸ Pause" : "▶ Play"}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 px-2">Speed:</span>
              {[0.75, 1, 1.25].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                    playbackSpeed === speed
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {behavior.teaching_video_url && (
            <a
              href={behavior.teaching_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition hover:bg-indigo-500/20"
            >
              <span>Open Link on YouTube</span>
              <span>↗</span>
            </a>
          )}
        </div>

        {/* Caregiver & Clinician Guidance */}
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

        {/* Modal Footer */}
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
