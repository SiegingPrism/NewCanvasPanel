import React, { useState } from "react";
import { Video, Globe, Upload, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmbeddedMediaWidget() {
  const [tab, setTab] = useState<"youtube" | "web" | "local">("youtube");
  const [inputUrl, setInputUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [localVideoSrc, setLocalVideoSrc] = useState<string | null>(null);

  const loadMedia = () => {
    if (tab === "youtube") {
      let videoId = "";
      const match = inputUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        videoId = match[1];
        setEmbedSrc(`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`);
      } else {
        setEmbedSrc(inputUrl);
      }
    } else if (tab === "web") {
      let url = inputUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      setEmbedSrc(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalVideoSrc(url);
      setTab("local");
    }
  };

  return (
    <div className="w-[420px] select-none space-y-3 p-1">
      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => {
            setTab("youtube");
            setEmbedSrc(null);
          }}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "youtube" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Video className="h-3.5 w-3.5 inline mr-1 text-red-500" />
          YouTube Video
        </button>
        <button
          onClick={() => {
            setTab("web");
            setEmbedSrc(null);
          }}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "web" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="h-3.5 w-3.5 inline mr-1 text-sky-500" />
          Web Page
        </button>
        <button
          onClick={() => setTab("local")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "local" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Upload className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
          Upload MP4
        </button>
      </div>

      {tab !== "local" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder={tab === "youtube" ? "Paste YouTube link..." : "Enter educational webpage URL..."}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={loadMedia}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Play className="h-3.5 w-3.5" />
            Load
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex h-20 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer bg-muted/20">
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-xs font-semibold text-muted-foreground">Select local MP4 / WebM video file</span>
            <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Media Player Frame */}
      <div className="relative h-64 w-full rounded-2xl bg-black overflow-hidden border border-border shadow-lg">
        {tab === "local" && localVideoSrc ? (
          <video src={localVideoSrc} controls className="h-full w-full object-contain" />
        ) : embedSrc ? (
          <iframe
            src={embedSrc}
            title="Embedded educational content"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/60 text-xs gap-2">
            <Video className="h-8 w-8 opacity-40" />
            <span>Enter a video link or web URL above to play</span>
          </div>
        )}
      </div>
    </div>
  );
}

