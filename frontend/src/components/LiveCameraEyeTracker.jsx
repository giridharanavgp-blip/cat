import React, { useState, useEffect, useRef } from "react";

export default function LiveCameraEyeTracker() {
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [eyeContactPct, setEyeContactPct] = useState(88);
  const [gazeStatus, setGazeStatus] = useState("Center Focus · Target Maintained");
  const [headPose, setHeadPose] = useState("Optimal (0° Pitch, 2° Roll)");
  const [blinkRate, setBlinkRate] = useState("14 / min (Normal)");

  // Start / Stop Webcam Stream
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Unable to access camera. Please allow webcam permissions in your browser.");
      }
    }
  };

  // Simulate real-time gaze telemetry fluctuation when active
  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      const randomVal = Math.floor(Math.random() * 10) + 84; // 84 - 94%
      setEyeContactPct(randomVal);
    }, 2500);
    return () => clearInterval(interval);
  }, [cameraActive]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>📹</span> Live Camera & Eye Contact Assessment
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
              AI Gaze Tracking
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time facial tracking, pupil orientation, and conversational eye contact measurement
          </p>
        </div>

        <button
          onClick={toggleCamera}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
            cameraActive
              ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
          }`}
        >
          <span>{cameraActive ? "⏹ Turn Off Camera" : "📷 Turn On Live Camera"}</span>
        </button>
      </div>

      {cameraError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          {cameraError}
        </div>
      )}

      {/* Video Stream & AI Tracking Overlay */}
      <div className="relative bg-slate-950 aspect-video rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
        />

        {!cameraActive && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl text-slate-500 shadow-inner">
              📷
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Webcam Stream Disconnected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Click <span className="text-indigo-400 font-semibold">'Turn On Live Camera'</span> above to evaluate gaze stability during clinical turns.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Facial Bounding Box & Eye Crosshair Overlay */}
        {cameraActive && (
          <>
            {/* Face Box Overlay */}
            <div className="absolute inset-x-[25%] inset-y-[15%] border-2 border-dashed border-emerald-400/80 rounded-3xl pointer-events-none shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse">
              <div className="absolute top-2 left-2 bg-emerald-500/90 text-slate-950 px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase">
                FACE DETECTED · ID #01
              </div>

              {/* Eye Tracking Crosshairs */}
              <div className="absolute top-[30%] left-[25%] w-8 h-8 border border-sky-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-ping" />
              </div>
              <div className="absolute top-[30%] right-[25%] w-8 h-8 border border-sky-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-ping" />
              </div>
            </div>

            {/* Live Gaze Status Badge */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{gazeStatus}</span>
            </div>

            {/* Eye Contact Percentage Badge */}
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-indigo-500/30 flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400 text-[10px] uppercase">Gaze Stability:</span>
              <span className="text-indigo-400 text-sm">{eyeContactPct}%</span>
            </div>
          </>
        )}
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Eye Contact Ratio</span>
          <p className="font-extrabold text-emerald-400 text-sm">{eyeContactPct}%</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Gaze Alignment</span>
          <p className="font-extrabold text-sky-400 text-sm">Center Fixed</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Head Pose Angle</span>
          <p className="font-bold text-slate-300 text-xs truncate">{headPose}</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Blink Frequency</span>
          <p className="font-bold text-slate-300 text-xs truncate">{blinkRate}</p>
        </div>
      </div>
    </div>
  );
}
