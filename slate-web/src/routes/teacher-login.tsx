import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, KeyRound, Monitor, Loader2, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, getUserDisplayName, getUserAvatarUrl } from "@/lib/supabase/authStore";
import { getSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/teacher-login")({
  component: TeacherLoginApprovalPage,
});

function TeacherLoginApprovalPage() {
  const { user, session, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const [code, setCode] = useState<string>("");
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);

  // Sign-in form state if user not yet logged in on phone
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const c = url.searchParams.get("code") || url.searchParams.get("token") || "";
    setCode(c);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSigningIn(true);
    setAuthError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error.message || "Failed to sign in. Please check your credentials.");
    }
    setSigningIn(false);
  };

  const handleApprove = async () => {
    if (!code || !session?.access_token) return;
    setApproving(true);

    const authPayload = {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
      user: {
        id: user?.id,
        email: user?.email,
        user_metadata: user?.user_metadata,
      },
    };

    // 1. Transmit session tokens across internet via Supabase Realtime broadcast
    const supabase = getSupabase();
    if (supabase) {
      try {
        const channel = supabase.channel(`slate_auth_${code}`, {
          config: { broadcast: { ack: false, self: false } },
        });

        await new Promise<void>((resolve) => {
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              channel
                .send({
                  type: "broadcast",
                  event: "approve_session",
                  payload: authPayload,
                })
                .finally(() => {
                  resolve();
                });
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              resolve();
            }
          });
          setTimeout(resolve, 3000);
        });
      } catch (err) {
        console.warn("Supabase Realtime approval error:", err);
      }
    }

    // 2. BroadcastChannel for local device tabs
    try {
      const bc = new BroadcastChannel(`slate_teacher_auth_${code}`);
      bc.postMessage({ type: "approved", ...authPayload });
      bc.close();
    } catch {}

    // 3. LocalStorage for local device reactivity
    try {
      localStorage.setItem(`slate_teacher_auth_${code}`, JSON.stringify(authPayload));
    } catch {}

    setApproving(false);
    setApproved(true);
  };

  const avatar = getUserAvatarUrl(user);
  const displayName = getUserDisplayName(user);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
          <KeyRound className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Board Teacher Login</h2>
          <p className="text-slate-400 text-sm">Fast, secure authorization from your personal device</p>
        </div>

        {authLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-xs text-slate-400">Verifying teacher session...</span>
          </div>
        ) : !user ? (
          /* Phone is not yet signed in to Supabase */
          <div className="space-y-4 text-left">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-300">
              Please sign into your teacher account on this device first. Once signed in, you can instantly authorize the Smart Board.
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                {authError}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-slate-800 rounded-xl text-white"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={signingIn}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md"
              >
                {signingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                Sign In & Authorize
              </Button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="w-full h-11 rounded-xl border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold text-sm"
            >
              Sign in with Google
            </Button>
          </div>
        ) : approved ? (
          /* Successfully authorized */
          <div className="space-y-3 py-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Smart Board Authorized!</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              You are now signed into the Smart Board display. Your lessons and files are currently loading on the screen.
            </p>
          </div>
        ) : (
          /* Phone is signed in: show teacher card and approve button */
          <div className="space-y-5">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-12 w-12 rounded-xl object-cover border border-indigo-500/40" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate text-base">{displayName}</div>
                  <div className="text-xs text-slate-400 truncate">{user.email}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5 text-indigo-400" />
                  Target: Smart Board Display
                </span>
                <span className="font-mono text-indigo-300">
                  {code ? code.slice(11, 19) : "Ready"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleApprove}
              disabled={approving || !code}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              <span>Approve & Sign In Smart Board</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}