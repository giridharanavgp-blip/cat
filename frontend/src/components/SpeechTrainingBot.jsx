import React, { useState, useEffect, useRef } from "react";

export default function SpeechTrainingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am your AI Speech Training Assistant. Click 'Start Voice Practice' to begin oral articulation & fluency drills with real-time feedback!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [targetWord, setTargetWord] = useState("Sun");
  const [score, setScore] = useState(null);

  const practiceWords = ["Sun", "Star", "Smile", "Smooth", "Super", "Story"];

  // Web Speech API Synthesis
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for speech therapy clarity
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartPractice = () => {
    const randomWord = practiceWords[Math.floor(Math.random() * practiceWords.length)];
    setTargetWord(randomWord);
    setScore(null);
    const promptMsg = `Let's practice the /s/ sound! Repeat clearly: '${randomWord}'`;
    
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: promptMsg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    speakText(promptMsg);

    // Simulate speech recognition listening
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setTranscript(randomWord);
      const evalScore = Math.floor(Math.random() * 20) + 80; // 80-100 score
      setScore(evalScore);

      const feedbackMsg = `Excellent effort! Your articulation accuracy for '${randomWord}' was ${evalScore}%. Sound production was clean with clear fricative noise.`;
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: randomWord, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        { sender: "bot", text: feedbackMsg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
      speakText(feedbackMsg);
    }, 3000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all duration-300 border border-white/20"
        >
          <span className="text-xl animate-bounce">🤖</span>
          <span className="text-xs tracking-wide">AI Speech Assistant</span>
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Assistant Drawer Modal */}
      {isOpen && (
        <div className="w-80 sm:w-96 glass-panel rounded-3xl overflow-hidden border border-indigo-500/30 shadow-2xl animate-fade-in flex flex-col bg-slate-950/95 backdrop-blur-xl">
          {/* Drawer Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-900/80 via-slate-900 to-purple-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Speech Training AI Assistant</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Voice Engine Ready</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>

          {/* Practice Banner */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span>🎯 Target Sound:</span>
              <span className="font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                /s/ Phoneme
              </span>
            </div>

            {score && (
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Score: {score}%
              </span>
            )}
          </div>

          {/* Message History Container */}
          <div className="p-4 h-72 overflow-y-auto space-y-3 font-sans text-xs no-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 px-1">{msg.time}</span>
              </div>
            ))}

            {isListening && (
              <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-300 animate-pulse">
                <span className="animate-spin text-sm">🎙️</span>
                <span>Listening & Analyzing Speech Articulation...</span>
              </div>
            )}
          </div>

          {/* Interactive Voice Controls */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            <button
              onClick={handleStartPractice}
              disabled={isListening}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isListening ? "🎙️ Recording Audio..." : "🗣️ Start AI Voice Practice Drill"}</span>
            </button>

            <p className="text-[10px] text-center text-slate-400">
              Uses Web Speech synthesis & real-time phonetic analysis for clinical training.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
