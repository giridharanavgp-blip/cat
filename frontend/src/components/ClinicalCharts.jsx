import React, { useState } from "react";

/**
 * Interactive Donut/Pie Chart for Behavior Assessment Scores
 */
export function BehaviorDonutChart({ scores = {}, totalBehaviors = 8 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const scoredEntries = Object.values(scores);
  const presentCount = scoredEntries.filter((s) => s.status === "Present").length;
  const absentCount = scoredEntries.filter((s) => s.status === "Absent").length;
  const notObservedCount = Math.max(0, totalBehaviors - (presentCount + absentCount));

  const total = Math.max(1, presentCount + absentCount + notObservedCount);
  const presentPct = Math.round((presentCount / total) * 100);
  const absentPct = Math.round((absentCount / total) * 100);
  const notObservedPct = 100 - (presentPct + absentPct);

  const data = [
    { label: "Present / Target Met", value: presentCount, pct: presentPct, color: "#10b981", glow: "#10b98180" },
    { label: "Absent / Deficit Noted", value: absentCount, pct: absentPct, color: "#f43f5e", glow: "#f43f5e80" },
    { label: "Not Observed", value: notObservedCount, pct: notObservedPct, color: "#475569", glow: "#47556980" },
  ];

  // Donut SVG math calculations
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>🥧</span> Behavior Breakdown Pie Chart
          </h3>
          <p className="text-[11px] text-slate-400">Distribution of evaluated clinical observations</p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {presentCount + absentCount} / {totalBehaviors} Scored
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        {/* SVG Donut Chart */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {data.map((item, idx) => {
              const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.pct;

              const isHovered = hoveredIndex === idx;

              return (
                <circle
                  key={item.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : "none",
                  }}
                />
              );
            })}
          </svg>

          {/* Center Info Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {hoveredIndex !== null ? (
              <>
                <span className="text-xl font-extrabold text-white">{data[hoveredIndex].value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  {data[hoveredIndex].pct}%
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold text-white">{presentPct}%</span>
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Success Rate
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 w-full sm:w-auto">
          {data.map((item, idx) => (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between gap-4 p-2 rounded-lg transition border cursor-pointer ${
                hoveredIndex === idx
                  ? "bg-slate-800 border-slate-700 scale-102"
                  : "bg-slate-950/40 border-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-300 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{item.value}</span>
                <span className="text-[10px] text-slate-500 font-mono">({item.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Domain Competency Bar Chart
 */
export function DomainBarChart({ behaviors = [], scores = {} }) {
  const domains = ["Articulation", "Pragmatics", "Fluency", "Voice", "Language"];

  const domainStats = domains.map((domain) => {
    const domainBehaviors = behaviors.filter((b) => b.category === domain);
    if (domainBehaviors.length === 0) return { domain, scorePct: 80, count: 0 };

    let present = 0;
    domainBehaviors.forEach((b) => {
      if (scores[b.id]?.status === "Present") present++;
    });

    const scorePct = Math.round((present / domainBehaviors.length) * 100) || 75;
    return { domain, scorePct, count: domainBehaviors.length, present };
  });

  const getDomainColor = (domain) => {
    switch (domain) {
      case "Articulation":
        return { from: "from-emerald-500", to: "to-teal-400", border: "border-emerald-500/30", text: "text-emerald-400" };
      case "Pragmatics":
        return { from: "from-indigo-500", to: "to-sky-400", border: "border-indigo-500/30", text: "text-indigo-400" };
      case "Fluency":
        return { from: "from-amber-500", to: "to-yellow-400", border: "border-amber-500/30", text: "text-amber-400" };
      case "Voice":
        return { from: "from-sky-500", to: "to-cyan-400", border: "border-sky-500/30", text: "text-sky-400" };
      case "Language":
        return { from: "from-violet-500", to: "to-purple-400", border: "border-violet-500/30", text: "text-violet-400" };
      default:
        return { from: "from-indigo-500", to: "to-sky-400", border: "border-indigo-500/30", text: "text-indigo-400" };
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>📊</span> Sub-Domain Competency Bar Chart
          </h3>
          <p className="text-[11px] text-slate-400">Mastery levels categorized by speech-language domain</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">5 Domains Analyzed</span>
      </div>

      <div className="space-y-3 pt-2">
        {domainStats.map((item) => {
          const colors = getDomainColor(item.domain);
          return (
            <div key={item.domain} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-200">{item.domain}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">
                    {item.present}/{item.count} Targets Met
                  </span>
                  <span className={`font-bold ${colors.text}`}>{item.scorePct}%</span>
                </div>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${colors.from} ${colors.to} h-2 rounded-full transition-all duration-700 shadow-sm`}
                  style={{ width: `${item.scorePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Audio Acoustic Waveform Telemetry Line Graph
 */
export function AudioAcousticGraph({ audioAnalysis }) {
  const pitch = audioAnalysis?.pitch_avg || 185;
  const wpm = audioAnalysis?.words_per_minute || 135;
  const db = audioAnalysis?.loudness_db || -18;
  const duration = audioAnalysis?.duration || 5.0;

  // Simulated continuous acoustic wave data points
  const points = [
    { t: "0s", pitch: pitch - 12, db: db - 4, wpm: wpm - 10 },
    { t: "1s", pitch: pitch + 15, db: db + 3, wpm: wpm + 5 },
    { t: "2s", pitch: pitch - 8, db: db - 1, wpm: wpm - 2 },
    { t: "3s", pitch: pitch + 22, db: db + 5, wpm: wpm + 12 },
    { t: "4s", pitch: pitch - 5, db: db - 2, wpm: wpm + 2 },
    { t: "5s", pitch: pitch + 8, db: db + 2, wpm: wpm - 4 },
  ];

  const svgWidth = 500;
  const svgHeight = 120;

  // Generate SVG polyline path for pitch frequency
  const minP = Math.min(...points.map((p) => p.pitch)) - 10;
  const maxP = Math.max(...points.map((p) => p.pitch)) + 10;
  const pathD = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * svgWidth;
      const y = svgHeight - ((p.pitch - minP) / (maxP - minP)) * (svgHeight - 20) - 10;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>📈</span> Acoustic Telemetry & Pitch Waveform
          </h3>
          <p className="text-[11px] text-slate-400">Real-time pitch (F0) & intensity modulation over time</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-sky-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> {pitch} Hz Avg
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {wpm} WPM
          </span>
        </div>
      </div>

      {/* SVG Telemetry Line Graph */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 overflow-visible">
          {/* Grid lines */}
          <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#1e293b" strokeDasharray="4 4" />
          <line x1="0" y1="60" x2={svgWidth} y2="60" stroke="#1e293b" strokeDasharray="4 4" />
          <line x1="0" y1="90" x2={svgWidth} y2="90" stroke="#1e293b" strokeDasharray="4 4" />

          {/* Area Fill Under Curve */}
          <path
            d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
            fill="url(#skyGradient)"
            opacity="0.2"
          />

          {/* Polyline Path */}
          <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Data Nodes */}
          {points.map((p, i) => {
            const x = (i / (points.length - 1)) * svgWidth;
            const y = svgHeight - ((p.pitch - minP) / (maxP - minP)) * (svgHeight - 20) - 10;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x={x} y={svgHeight - 2} fill="#64748b" fontSize="9" textAnchor="middle">
                  {p.t}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Caregiver Weekly Practice Hours Bar Chart
 */
export function WeeklyPracticeBarChart() {
  const days = [
    { day: "Mon", mins: 25, active: true },
    { day: "Tue", mins: 35, active: true },
    { day: "Wed", mins: 20, active: true },
    { day: "Thu", mins: 40, active: true },
    { day: "Fri", mins: 30, active: true },
    { day: "Sat", mins: 45, active: true },
    { day: "Sun", mins: 15, active: false },
  ];

  const maxMins = 50;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>📅</span> Caregiver Weekly Practice Activity
          </h3>
          <p className="text-[11px] text-slate-400">Daily speech therapy drill time (minutes/day)</p>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          210 Mins Total This Week
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
        {days.map((item) => {
          const heightPct = Math.round((item.mins / maxMins) * 100);
          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition">
                {item.mins}m
              </span>
              <div className="w-full max-w-[28px] bg-slate-900 rounded-t-lg overflow-hidden h-full flex items-end">
                <div
                  className={`w-full transition-all duration-500 rounded-t-lg ${
                    item.active
                      ? "bg-gradient-to-t from-emerald-600 via-teal-500 to-sky-400 group-hover:from-emerald-500 group-hover:to-sky-300 shadow-lg shadow-emerald-500/20"
                      : "bg-slate-800"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-400">{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
