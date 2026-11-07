import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Radio,
  Tv,
  Users,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  StopCircle,
  Play,
  Share2,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getSupabase } from "@/lib/supabase/client";
import { broadcastService } from "@/lib/whiteboard/broadcastService";

export interface BroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId?: string;
}

export function BroadcastDialog({ open, onOpenChange, boardId = "default" }: BroadcastDialogProps) {
  const { pages, activePageId, camera, tool } = useWhiteboard();
  const [mode, setMode] = useState<"host" | "join">("host");
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastCode, setBroadcastCode] = useState<string>(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  });
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [connectedRooms, setConnectedRooms] = useState<string[]>([
    "Room 102 (Class 9B)",
    "Room 104 (Class 10A)",
  ]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const broadcastUrl = typeof window !== "undefined"
    ? `${window.location.origin}/board/${boardId}?broadcast=${broadcastCode}`
    : `https://slate.local/board/${boardId}?broadcast=${broadcastCode}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(broadcastUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code error:", err));
  }, [open, broadcastUrl]);

  // Manage single stable broadcast session
  useEffect(() => {
    if (isBroadcasting) {
      broadcastService.startHost(
        broadcastCode,
        () => ({ pages, activePageId, camera }),
        (roomName) => {
          setConnectedRooms((prev) => Array.from(new Set([...prev, roomName])));
          toast.info(`Room connected to broadcast: ${roomName}`);
        }
      );
    } else {
      broadcastService.stop();
    }
  }, [isBroadcasting, broadcastCode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      broadcastService.stop();
    };
  }, []);

  const handleToggleBroadcast = () => {
    if (isBroadcasting) {
      setIsBroadcasting(false);
      broadcastService.stop();
      toast("Broadcast stopped");
    } else {
      setIsBroadcasting(true);
      toast.success(`Live room broadcast started! Code: ${broadcastCode}`);
    }
  };

  const handleJoinBroadcast = () => {
    const code = joinCodeInput.trim();
    if (!code || code.length < 6) {
      toast.error("Please enter a valid 6-digit broadcast code");
      return;
    }
    window.dispatchEvent(new CustomEvent("slate:join-broadcast", { detail: { code } }));
    toast.success(`Connecting to Room Broadcast #${code}...`);
    onOpenChange(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(broadcastCode);
    setCopied(true);
    toast.success("Broadcast code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Radio className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                Broadcast to Other Rooms
                {isBroadcasting && (
                  <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    LIVE
                  </span>
                )}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stream this board's live lesson to boards in other classrooms or assemblies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border">
            <Button
              size="sm"
              variant={mode === "host" ? "default" : "ghost"}
              onClick={() => setMode("host")}
              className={`rounded-xl text-xs font-bold h-8 px-3 ${
                mode === "host" ? "bg-indigo-600 text-white" : ""
              }`}
            >
              Host
            </Button>
            <Button
              size="sm"
              variant={mode === "join" ? "default" : "ghost"}
              onClick={() => setMode("join")}
              className={`rounded-xl text-xs font-bold h-8 px-3 ${
                mode === "join" ? "bg-indigo-600 text-white" : ""
              }`}
            >
              Join
            </Button>
          </div>
        </DialogHeader>

        {mode === "host" ? (
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {/* Host Banner & Code */}
            <div className="p-5 rounded-3xl border bg-muted/40 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              {qrDataUrl && (
                <div className="bg-white p-2 rounded-2xl shadow-sm border shrink-0">
                  <img src={qrDataUrl} alt="Broadcast QR" className="w-28 h-28" />
                </div>
              )}

              <div className="space-y-2 flex-1 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Room Broadcast 6-Digit Code
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono text-3xl font-black tracking-widest text-foreground bg-card px-4 py-1.5 rounded-2xl border shadow-sm">
                    {broadcastCode.slice(0, 3)} - {broadcastCode.slice(3)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="h-10 px-3 rounded-xl gap-1 text-xs"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Teachers in other rooms enter this code on their smart board to mirror your live lesson.
                </p>
              </div>
            </div>

            {/* Connected Classrooms List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Receiving Classrooms ({connectedRooms.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {connectedRooms.map((room) => (
                  <div
                    key={room}
                    className="p-3 rounded-2xl border bg-card/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-foreground">{room}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Connected</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start/Stop Broadcast Toggle */}
            <Button
              onClick={handleToggleBroadcast}
              className={`w-full h-12 rounded-2xl font-bold text-sm gap-2 transition-all active:scale-98 shadow-lg ${
                isBroadcasting
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
              }`}
            >
              {isBroadcasting ? (
                <>
                  <StopCircle className="h-5 w-5" />
                  Stop Live Room Broadcast
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Start Live Room Broadcast
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Mode === "join" */
          <div className="flex-1 overflow-y-auto py-6 space-y-4 max-w-sm mx-auto text-center">
            <Tv className="h-12 w-12 mx-auto text-indigo-500/80" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Join Another Room's Broadcast</h3>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code shown on the host board to mirror the lecture in real-time.
              </p>
            </div>

            <Input
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="e.g. 849201"
              maxLength={6}
              className="h-12 text-center text-xl font-mono tracking-widest rounded-2xl border-2"
            />

            <Button
              onClick={handleJoinBroadcast}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30"
            >
              Connect to Live Room Broadcast
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

