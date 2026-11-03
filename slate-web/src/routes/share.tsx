import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Download, FileText, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/share")({
  component: SharedNotesDownloadPage,
});

function SharedNotesDownloadPage() {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("Lesson Notes");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    const qTitle = url.searchParams.get("title") || "Lesson Notes";
    setTitle(qTitle);
    setNoteId(id);

    // 1. Fetch PDF from the Smart Board server API
    if (id) {
      fetch(`/api/notes-share?id=${id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Not found on server");
        })
        .then((data) => {
          if (data.title) setTitle(data.title);
          // Prefer direct binary download endpoint
          setDownloadUrl(data.downloadUrl || data.pdfBase64);
        })
        .catch(() => {
          // 2. Fallback to local storage if accessed on same device
          try {
            const stored =
              localStorage.getItem(`slate_shared_notes_${id}`) ||
              localStorage.getItem("slate_shared_notes_pdf");
            if (stored) {
              setDownloadUrl(stored);
            }
          } catch {}
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Fallback if no ID passed
      try {
        const stored = localStorage.getItem("slate_shared_notes_pdf");
        if (stored) setDownloadUrl(stored);
      } catch {}
      setLoading(false);
    }
  }, []);

  const handleDownload = () => {
    const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    if (noteId) {
      // Trigger native download directly from server binary endpoint
      const a = document.createElement("a");
      a.href = `/api/notes-share?id=${noteId}&download=true`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloaded(true);
      return;
    }

    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
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
            Complete high-resolution document including handwriting, diagrams, equations, and annotations generated from the Smart Board.
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : downloaded ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          <span>{loading ? "Preparing PDF..." : downloaded ? "Downloaded Again" : "Download Notes (PDF)"}</span>
        </Button>
      </div>
    </div>
  );
}
