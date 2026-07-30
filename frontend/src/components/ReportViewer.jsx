import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { AI_ENGINE_URL } from "../lib/socket";

export default function ReportViewer({ reportMarkdown, patientName, sessionId }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  async function handleExportPdf() {
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await axios.post(
        `${AI_ENGINE_URL}/generate-pdf`,
        {
          report_markdown: reportMarkdown,
          patient_name: patientName,
          session_id: sessionId,
        },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `CAT_Report_${patientName.replace(/\s+/g, "_")}_${sessionId || "session"}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  if (!reportMarkdown) return null;

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between bg-slate-950/80 px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">AI Clinical Report Narrative</span>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
        >
          {isExporting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Exporting PDF...</span>
            </>
          ) : (
            <>
              <span>⬇ Download PDF Report</span>
            </>
          )}
        </button>
      </div>

      {exportError && (
        <div className="bg-rose-500/10 text-rose-300 text-xs px-4 py-2 border-b border-rose-500/20">
          {exportError}
        </div>
      )}

      <div className="p-6 max-h-[600px] overflow-y-auto font-sans text-slate-300 space-y-4 text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-extrabold text-white pb-2 border-b border-slate-800" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-indigo-300 mt-4 mb-2" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1" {...props} />,
            p: ({ node, ...props }) => <p className="text-slate-300 text-sm leading-relaxed" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm pl-2" {...props} />,
            li: ({ node, ...props }) => <li className="text-slate-300 text-sm" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
          }}
        >
          {reportMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

