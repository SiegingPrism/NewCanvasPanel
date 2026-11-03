import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Download, FileText, CheckCircle2, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/share")({
  component: SharedNotesDownloadPage,
});

function SharedNotesDownloadPage() {
  const [title, setTitle] = useState("Lesson Notes");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const fileUrl = url.searchParams.get("url");
    const id = url.searchParams.get("id");
    const qTitle = url.searchParams.get("title") || "Lesson Notes";
    setTitle(qTitle);

    // 1. Direct Supabase Storage Cloud URL
    if (fileUrl) {
      setDownloadUrl(fileUrl);
      setLoading(false);
      return;
    }

    // 2. Same-device fallback from localStorage
    if (id) {
      try {
        const stored =
          localStorage.getItem(`slate_shared_notes_${id}`) ||
          localStorage.getItem("slate_shared_notes_pdf");
        if (stored) {
          setDownloadUrl(stored);
        }
      } catch {}
    } else {
      try {
        const stored = localStorage.getItem("slate_shared_notes_pdf");
        if (stored) setDownloadUrl(stored);
      } catch {}
    }
    setLoading(false);
  }, []);

  const handleDownload = () => {
    const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloaded(true);
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
          <FileText className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-slate-400 text-sm">Official Classroom Lecture Notes</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-400 space-y-2 text-left">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Multi-Page Board Summary</span>
          </div>
          <p>
            Complete high-resolution document including handwriting, diagrams, equations, and annotations generated directly from the Smart Board.
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={loading || !downloadUrl}
          className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : downloaded ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          <span>{loading ? "Preparing PDF..." : downloaded ? "Downloaded (Tap to Download Again)" : "Download Notes (PDF)"}</span>
        </Button>

        {downloadUrl && downloadUrl.startsWith("http") && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Open PDF directly in browser</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}