import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Copy,
  ExternalLink,
  Wifi,
  Flame,
  Camera,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";
import { getSupabase } from "@/lib/supabase/client";

export interface TeacherRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId?: string;
}

export function TeacherRemoteDialog({
  open,
  onOpenChange,
  boardId = "default",
}: TeacherRemoteDialogProps) {
  const {
    nextPage,
    prevPage,
    addPage,
    undo,
    clearPage,
    setTool,
    addObject,
    pushHistory,
    camera,
    reachabilityOffset,
    setReachabilityOffset,
  } = useWhiteboard();

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const remoteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/remote?session=${boardId}`
    : `https://slate.local/remote?session=${boardId}`;

  // Generate QR Code for Phone Pairing
  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(remoteUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [open, remoteUrl]);

  // Execute Remote Commands
  useEffect(() => {
    const handleRemoteCommand = (payload: any) => {
      if (!payload || !payload.command) return;
      setConnected(true);
      setLastCommand(payload.command);

      switch (payload.command) {
        case "page_next":
          nextPage();
          toast("Remote: Next Slide");
          break;
        case "page_prev":
          prevPage();
          toast("Remote: Previous Slide");
          break;
        case "page_new":
          addPage();
          toast("Remote: Added Blank Slide");
          break;
        case "laser_on":
          setTool("laser");
          toast("Remote: Laser Pointer ON");
          break;
        case "laser_off":
          setTool("pen");
          toast("Remote: Laser Pointer OFF");
          break;
        case "undo":
          undo();
          toast("Remote: Undo");
          break;
        case "clear":
          clearPage();
          pushHistory();
          toast("Remote: Cleared Board");
          break;
        case "lower_board":
          setReachabilityOffset(reachabilityOffset > 0 ? 0 : 0.25);
          toast(reachabilityOffset > 0 ? "Remote: Board Restored" : "Remote: Board Lowered");
          break;
        case "timer_start":
          window.dispatchEvent(new CustomEvent("slate:open-big-timer"));
          toast("Remote: Timer Opened");
          break;
        case "insert_photo":
          if (payload.data?.dataUrl) {
            const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
            const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;
            const photoObj: CanvasObject = {
              id: `remote_photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              kind: "image",
              x: cx - 240,
              y: cy - 180,
              w: 480,
              h: 360,
              src: payload.data.dataUrl,
            };
            addObject(photoObj);
            pushHistory();
            toast.success("Remote: Inserted photo from teacher's phone onto board!");
          }
          break;
      }
    };

    // 1. Supabase Realtime Channel
    const supabase = getSupabase();
    let channel: any = null;
    if (supabase && boardId) {
      channel = supabase
        .channel(`slate_remote_${boardId}`)
        .on("broadcast", { event: "command" }, (msg: any) => {
          if (msg.payload) handleRemoteCommand(msg.payload);
        })
        .subscribe();
    }

    // 2. BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`slate_remote_${boardId}`);
      bc.onmessage = (ev) => {
        if (ev.data) handleRemoteCommand(ev.data);
      };
    } catch {}

    // 3. Storage event fallback
    const onStorage = (e: StorageEvent) => {
      if (e.key === `slate_remote_cmd_${boardId}` && e.newValue) {
        try {
          handleRemoteCommand(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (channel) channel.unsubscribe();
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [boardId, nextPage, prevPage, addPage, undo, clearPage, setTool, addObject, pushHistory, camera, reachabilityOffset, setReachabilityOffset]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    toast.success("Remote URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Smartphone className="h-6 w-6" />
              </span>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  Teacher’s Phone as a Remote
                  {connected && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Walk around the classroom while advancing slides, pointing the laser, and snapping photos.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Pairing Display */}
        <div className="py-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
            {qrDataUrl && (
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                <img src={qrDataUrl} alt="Pair Remote QR" className="w-32 h-32" />
              </div>
            )}
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Scan with Teacher Phone Camera
              </p>
              <p className="text-sm font-semibold text-foreground">
                No app installation required. Opens instantly in your phone's browser.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={remoteUrl}
                  className="flex-1 bg-background px-3 py-1.5 text-xs font-mono rounded-lg border text-muted-foreground truncate"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="h-8 gap-1 text-xs shrink-0 rounded-lg"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(remoteUrl, "_blank")}
                  className="h-8 w-8 p-0 shrink-0"
                  title="Open remote in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl border bg-card/60 text-center space-y-1">
              <ChevronRight className="h-5 w-5 mx-auto text-indigo-500" />
              <p className="text-xs font-bold text-foreground">Slide Flipper</p>
              <p className="text-[10px] text-muted-foreground">Previous / Next slide</p>
            </div>
            <div className="p-3 rounded-2xl border bg-card/60 text-center space-y-1">
              <Flame className="h-5 w-5 mx-auto text-rose-500" />
              <p className="text-xs font-bold text-foreground">Laser Pointer</p>
              <p className="text-[10px] text-muted-foreground">Guide student focus</p>
            </div>
            <div className="p-3 rounded-2xl border bg-card/60 text-center space-y-1">
              <Camera className="h-5 w-5 mx-auto text-teal-500" />
              <p className="text-xs font-bold text-foreground">Snap & Project</p>
              <p className="text-[10px] text-muted-foreground">Photo to board</p>
            </div>
          </div>

          {lastCommand && (
            <div className="text-center py-1">
              <span className="text-xs text-muted-foreground font-mono">
                Last remote command received: <b className="text-foreground">{lastCommand}</b>
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
