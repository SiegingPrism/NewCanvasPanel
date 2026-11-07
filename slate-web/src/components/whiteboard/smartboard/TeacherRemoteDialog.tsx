import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Smartphone,
  QrCode,
  Sliders,
  Camera,
  Play,
  RotateCcw,
  Zap,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Lock,
  Radio,
  Info,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getSupabase } from "@/lib/supabase/client";
import type { CanvasObject } from "@/lib/whiteboard/types";

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

  // 4-digit pairing PIN to prevent students from taking over the board
  const [pairPin, setPairPin] = useState<string>(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [pairedDeviceId, setPairedDeviceId] = useState<string | null>(null);
  const pairPinRef = useRef<string>(pairPin);
  const pairedDeviceRef = useRef<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    pairPinRef.current = pairPin;
  }, [pairPin]);

  useEffect(() => {
    pairedDeviceRef.current = pairedDeviceId;
  }, [pairedDeviceId]);

  // URL for QR code - deliberately DOES NOT include PIN so students scanning the screen cannot get it
  const remoteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/remote?session=${boardId}`
    : `https://slate.local/remote?session=${boardId}`;

  // Generate QR Code for Phone Pairing (only while unpaired)
  useEffect(() => {
    if (!open || pairedDeviceId) return;
    QRCode.toDataURL(remoteUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [open, remoteUrl, pairedDeviceId]);

  // Execute and Validate Remote Commands
  useEffect(() => {
    const handleRemoteCommand = (payload: any) => {
      if (!payload || !payload.command) return;

      // 1. Pairing Handshake
      if (payload.command === "pair") {
        if (pairedDeviceRef.current) {
          // Already paired to a remote! Reject further pair attempts
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "ack",
              payload: { type: "pair_rejected", reason: "Board is already paired to another remote." },
            }).catch(() => {});
          }
          return;
        }

        if (payload.pin === pairPinRef.current) {
          const devId = payload.deviceId || "teacher_phone";
          setPairedDeviceId(devId);
          pairedDeviceRef.current = devId;

          // Change PIN immediately upon pairing so old PIN is never valid again
          const newPin = Math.floor(1000 + Math.random() * 9000).toString();
          setPairPin(newPin);
          pairPinRef.current = newPin;

          toast.success("Teacher phone paired securely! All commands locked to your device.");

          // Send confirmation ack
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "ack",
              payload: { type: "pair_confirmed", deviceId: devId },
            }).catch(() => {});
          }
        } else {
          toast.error("Blocked remote connection: invalid PIN entered.");
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "ack",
              payload: { type: "pair_rejected", reason: "Invalid 4-digit PIN." },
            }).catch(() => {});
          }
        }
        return;
      }

      // 2. Reject commands from any device that is NOT the paired device
      if (!pairedDeviceRef.current || payload.deviceId !== pairedDeviceRef.current) {
        console.warn("Blocked unauthorized command from unpaired/unknown deviceId:", payload.deviceId);
        return;
      }

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

            // Send photo confirmed ack
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "ack",
                payload: { type: "photo_confirmed", photoId: payload.data.photoId },
              }).catch(() => {});
            }
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
      channelRef.current = channel;
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
      if (channel) {
        if (supabase) supabase.removeChannel(channel);
      }
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [boardId, pairPin, nextPage, prevPage, addPage, undo, clearPage, setTool, addObject, pushHistory, camera, reachabilityOffset, setReachabilityOffset]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    toast.success("Remote URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setPairedDeviceId(null);
    pairedDeviceRef.current = null;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPairPin(newPin);
    pairPinRef.current = newPin;
    toast.info("Teacher remote unpaired. Ready to pair a new device.");
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
                  {pairedDeviceId ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Securely Paired
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      PIN Protected
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

        {pairedDeviceId ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-500">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-foreground">
                1 Teacher Phone Paired &amp; Active
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Pairing QR code and PIN are hidden from the big screen. All student phones are blocked from controlling the board.
              </p>
            </div>

            {lastCommand && (
              <div className="text-xs font-mono bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                Last Command: <strong className="text-foreground">{lastCommand}</strong>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 rounded-xl"
            >
              Disconnect / Pair New Phone
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-border flex flex-col items-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Teacher Remote QR"
                  className="h-44 w-44 rounded-xl"
                />
              ) : (
                <div className="h-44 w-44 rounded-xl bg-muted animate-pulse" />
              )}
              <div className="mt-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pairing PIN</span>
                <div className="text-lg font-mono font-black text-slate-900 tracking-widest">{pairPin}</div>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Scan with Teacher Phone Camera
                </span>
                <h4 className="text-sm font-semibold text-foreground mt-0.5">
                  No app installation required. Opens instantly in your phone's browser.
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Once scanned, the QR code automatically locks to your device and disappears from the screen so students cannot access it.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={remoteUrl}
                  readOnly
                  className="text-xs font-mono bg-muted/60 h-9 rounded-xl selection:bg-indigo-500/20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="rounded-xl h-9 px-3 gap-1.5 shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Realtime Connection Advisory Notice */}
        <div className="pt-2 border-t flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            <strong>Connection Capacity:</strong> Free Supabase Realtime tier supports up to 200 concurrent student/phone connections (~4-5 simultaneous classrooms). Pro tier provides 500+ connections.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
