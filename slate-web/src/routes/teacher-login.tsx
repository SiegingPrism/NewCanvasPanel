import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, Monitor, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/teacher-login")({
  component: TeacherLoginNoticePage,
});

function TeacherLoginNoticePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Board Teacher Sign-In</h2>
          <p className="text-slate-400 text-sm">Account Protection Notice</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-300 space-y-3 text-left">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Direct Sign-In Required</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            To prevent credential leakage and ensure full security on shared classroom displays, tokens are not transmitted over public channels.
          </p>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-400 text-[11px]">
            <span className="font-semibold text-slate-300 block">How to sign in on the board:</span>
            <p>1. Tap the menu in the top-right corner of the Smart Board.</p>
            <p>2. Select "Sign In to Slate" or "Account & Cloud Sync".</p>
            <p>3. Enter your teacher email and password or use Google Sign-In.</p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="w-full h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Slate Whiteboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
}