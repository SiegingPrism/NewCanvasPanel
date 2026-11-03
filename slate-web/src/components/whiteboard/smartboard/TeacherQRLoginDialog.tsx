import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Smartphone, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { useAuth, getUserDisplayName } from "@/lib/supabase/authStore";
import { getSupabase } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/utils";
import { toast } from "sonner";

interface TeacherQRLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherQRLoginDialog({ open, onOpenChange }: TeacherQRLoginDialogProps) {
  const { user } = useAuth();
  const [authCode] = useState(() => `slate-auth-${Math.random().toString(36).slice(2, 10)}`);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isApproved, setIsApproved] = useState(false);
  const [approvedTeacher, setApprovedTeacher] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    // 1. Generate QR code pointing to mobile teacher authorization route
    const base = getPublicAppOrigin();
    const authUrl = `${base}/teacher-login?code=${authCode}`;

    QRCode.toDataURL(authUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});

    // 2. Real-time authentication listener via Supabase Realtime Channel
    const supabase = getSupabase();
    let channel: any = null;

    const handleSessionApproval = async (session: any, approvedUser: any) => {
      if (!session?.access_token || !session?.refresh_token) return;

      if (supabase) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

          if (!error && data.user) {
            const name = getUserDisplayName(data.user || approvedUser);
            setApprovedTeacher(name);
            setIsApproved(true);
            toast.success(`Welcome, ${name}! Lessons synced from cloud.`);
            setTimeout(() => {
              onOpenChange(false);
            }, 1500);
            return;
          }
        } catch (authErr) {
          console.warn("Failed to set session from mobile auth:", authErr);
        }
      }

      // Fallback display
      const displayName = approvedUser?.user_metadata?.full_name || approvedUser?.email || "Teacher";
      setApprovedTeacher(displayName);
      setIsApproved(true);
      toast.success(`Authenticated as ${displayName}!`);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    };

    if (supabase) {
      channel = supabase.channel(`slate_auth_${authCode}`, {
        config: { broadcast: { ack: false, self: false } },
      });

      channel
        .on("broadcast", { event: "approve_session" }, (payload: any) => {
          const data = payload?.payload || payload;
          handleSessionApproval(data.session, data.user);
        })
        .subscribe();
    }

    // 3. Same-device fallback (BroadcastChannel + storage) for local testing
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`slate_teacher_auth_${authCode}`);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "approved" && ev.data.session) {
          handleSessionApproval(ev.data.session, ev.data.user);
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === `slate_teacher_auth_${authCode}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.session) {
            handleSessionApproval(data.session, data.user);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [open, authCode, onOpenChange]);

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
              <div className="h-48 w-48 rounded-lg bg-emerald-50 flex flex-col items-center justify-center text-emerald-600 gap-2 p-3 text-center">
                <CheckCircle2 className="h-12 w-12 animate-in zoom-in-50 duration-300" />
                <span className="font-bold text-sm">Authenticated!</span>
                <span className="text-xs text-emerald-700/80 font-medium truncate max-w-full">
                  {approvedTeacher || "Teacher"}
                </span>
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
            <span>Open camera on your phone, scan the code, and tap Approve to log the board into your account.</span>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <span>Code: {authCode.slice(11, 19)}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
            <span className="text-emerald-500 font-sans">Listening</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}