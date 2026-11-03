import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, KeyRound, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/teacher-login")({
  component: TeacherLoginApprovalPage,
});

function TeacherLoginApprovalPage() {
  const [token, setToken] = useState<string>("");
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const tok = url.searchParams.get("token") || url.searchParams.get("auth_token") || "";
    setToken(tok);
  }, []);

  const handleApprove = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await fetch("/api/teacher-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          token,
          teacherName: "Teacher",
        }),
      });

      // Broadcast fallback for local tabs
      try {
        const bc = new BroadcastChannel(`slate_teacher_auth_${token}`);
        bc.postMessage({ type: "approved" });
        bc.close();
      } catch {}
      try {
        localStorage.setItem(`slate_teacher_auth_${token}`, "approved");
      } catch {}

      setApproved(true);
    } catch (err) {
      console.error("Failed to approve login:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
          <KeyRound className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Board Fast Login</h2>
          <p className="text-slate-400 text-sm">Sign in securely from your personal device</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-300 space-y-3 text-left">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Monitor className="h-4 w-4 text-indigo-400" />
            <span>Classroom Interactive Display</span>
          </div>
          <p className="text-slate-400">
            Authorizing this session will log your teacher account into the classroom smart board and load your saved lessons.
          </p>
          <div className="text-[11px] font-mono text-indigo-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            Session: {token ? token.slice(0, 16) : "Ready"}
          </div>
        </div>

        {approved ? (
          <div className="space-y-3 py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Board Authorized!</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              You are now signed into the Smart Board. You can close this window.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleApprove}
            disabled={loading || !token}
            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            <span>Approve Login on Smart Board</span>
          </Button>
        )}
      </div>
    </div>
  );
}

