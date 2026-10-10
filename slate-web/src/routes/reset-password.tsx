import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Slate" },
      { name: "description", content: "Set a new password for your Slate account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg("Database service is not configured.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message || "Failed to update password. Your reset link may have expired.");
        toast.error(error.message || "Failed to update password");
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          navigate({ to: "/" });
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reset Password</h1>
            <p className="text-xs text-slate-400">Choose a new password for your Slate account</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-semibold text-white">Password Updated!</h2>
            <p className="text-sm text-slate-400">
              Your password has been changed. Redirecting to your workspace...
            </p>
            <Button
              onClick={() => navigate({ to: "/" })}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-4"
            >
              Go to Workspace
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">New Password</label>
              <div className="relative">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                  className="bg-slate-900/80 border-slate-700 text-white pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
              <div className="relative">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="bg-slate-900/80 border-slate-700 text-white pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 mt-2 shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Save New Password"
              )}
            </Button>

            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/" })}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Canvas
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
