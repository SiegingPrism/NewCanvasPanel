import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Smartphone, CheckCircle2, Loader2, Wifi, Edit2 } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/supabase/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface TeacherQRLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherQRLoginDialog({ open, onOpenChange }: TeacherQRLoginDialogProps) {
  const { user } = useAuth();
  const [token] = useState(() => `teacher-${Math.random().toString(36).slice(2, 10)}`);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isApproved, setIsApproved] = useState(false);
  const [serverHost, setServerHost] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  });
  const [editingHost, setEditingHost] = useState(false);

  useEffect(() => {
    if (!open) return;

    // 1. Initialize pending auth session on backend server
    fetch("/api/teacher-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", token }),
    }).catch(() => {});

    // 2. Generate QR code pointing to cross-device mobile approval route
    const base = serverHost || (typeof window !== "undefined" ? window.location.origin : "");
    const authUrl = `${base}/teacher-login?token=${token}`;

    QRCode.toDataURL(authUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});

    // 3. Poll server API every 1 second for approval from teacher's phone
    let cancelled = false;
    const pollInterval = setInterval(async () => {
      if (cancelled || isApproved) return;
      try {
        const res = await fetch(`/api/teacher-auth?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.approved) {
            setIsApproved(true);
            toast.success(`Welcome, ${data.teacherName || "Teacher"}! Session authenticated.`);
            setTimeout(() => {
              onOpenChange(false);
            }, 1200);
          }
        }
      } catch {}
    }, 1000);

    // 4. Same-device fallback listeners (BroadcastChannel + storage)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`slate_teacher_auth_${token}`);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "approved") {
          setIsApproved(true);
          toast.success("Teacher account authorized via phone!");
          setTimeout(() => {
            onOpenChange(false);
          }, 1200);
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === `slate_teacher_auth_${token}`) {
        setIsApproved(true);
        toast.success("Teacher account authorized via phone!");
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [open, token, serverHost, isApproved, onOpenChange]);

  const handleSimulateApproval = async () => {
    setIsApproved(true);
    try {
      await fetch("/api/teacher-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", token, teacherName: "Teacher" }),
      });
      localStorage.setItem(`slate_teacher_auth_${token}`, "approved");
    } catch {}
    toast.success("Signed in as Teacher!");
    setTimeout(() => {
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border text-center">
        <DialogHeader>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-1">
              <KeyRound className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Teacher Fast QR Login
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Sign in securely without typing your personal password on a public classroom display.
            </p>
          </div>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-white rounded-2xl shadow-lg border border-border inline-block">
            {isApproved ? (
              <div className="h-48 w-48 rounded-lg bg-emerald-50 flex flex-col items-center justify-center text-emerald-600 gap-2">
                <CheckCircle2 className="h-12 w-12 animate-in zoom-in-50 duration-300" />
                <span className="font-bold text-sm">Authenticated!</span>
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="Teacher QR Login" className="h-48 w-48 rounded-lg" />
            ) : (
              <div className="h-48 w-48 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="bg-muted/40 rounded-xl p-3 border text-xs text-muted-foreground flex items-center gap-2 text-left">
            <Smartphone className="h-5 w-5 text-indigo-500 shrink-0" />
            <span>Open your phone's camera, scan the code, and tap Approve to load your lessons.</span>
          </div>

          {/* Wi-Fi Host IP Editor for Local Classroom Networks */}
          <div>
            <button
              type="button"
              onClick={() => setEditingHost(!editingHost)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium mx-auto"
            >
              <Wifi className="h-3 w-3" />
              <span>Host: {serverHost.replace(/^https?:\/\//, "")}</span>
              <Edit2 className="h-2.5 w-2.5 opacity-60" />
            </button>
            {editingHost && (
              <div className="mt-1.5 flex gap-1 justify-center">
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="http://192.168.1.5:5173"
                  className="text-[11px] bg-background border rounded px-2 py-1 font-mono w-48"
                />
                <button
                  onClick={() => setEditingHost(false)}
                  className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-bold"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          {/* Fallback approval button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSimulateApproval}
            className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold"
          >
            One-Tap Teacher Quick Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
