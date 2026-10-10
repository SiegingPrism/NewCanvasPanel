import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/supabase/authStore";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Cloud,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { user, signIn, signUp, signInWithGoogle, resetPassword, deleteAccount, signOut } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to sign in.");
    } else {
      toast.success("Signed in successfully! Private cloud sync and free AI enabled.");
      onOpenChange(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const res = await signUp(email, password);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to create account.");
    } else if (res.unconfirmed) {
      toast.info("Account created! If email confirmation is enabled in Supabase, please check your inbox.");
      onOpenChange(false);
    } else {
      toast.success("Account created successfully! Welcome to Slate.");
      onOpenChange(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    const res = await signInWithGoogle();
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message || "Google sign-in could not be initiated.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your account email address.");
      return;
    }
    setSubmitting(true);
    const res = await resetPassword(email);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to send password reset email.");
    } else {
      toast.success("Password reset instructions sent! Please check your email.");
      setTab("signin");
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    await signOut();
    setSubmitting(false);
    toast.info("Signed out. Your workspace is operating locally.");
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    setSubmitting(true);
    const res = await deleteAccount();
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to delete account.");
    } else {
      toast.success("Account and cloud data permanently deleted.");
      setConfirmDelete(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {user ? (
              <>
                <UserCheck className="h-5 w-5 text-emerald-500" />
                Account & Cloud Sync
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-primary" />
                Sign in to Slate
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {user
              ? "Your data is securely isolated to your private account."
              : "Sign in to enable private cloud sync and unlimited AI features across all your devices."}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Signed in as:</span>
                <span className="font-mono text-foreground font-semibold truncate max-w-[220px]">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                <Cloud className="h-4 w-4" />
                <span>Private Cloud Sync Active</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Your boards and notes are encrypted and isolated to your user ID. Only you can view or modify your data.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-foreground hover:bg-muted"
                onClick={handleSignOut}
                disabled={submitting}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>

              {confirmDelete ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Permanently delete account and all cloud data?</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This will permanently remove your user profile, cloud boards, notes, and study decks from Slate. This cannot be undone.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleDeleteAccount}
                      disabled={submitting}
                    >
                      {submitting ? "Deleting…" : "Confirm Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setConfirmDelete(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={submitting}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Account & Data (Google Play requirement)
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium text-xs flex items-center justify-center gap-2.5 h-10 border-input hover:bg-muted"
              onClick={handleGoogleSignIn}
              disabled={submitting}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-muted"></div>
              <span className="bg-background px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Or with email
              </span>
            </div>

            {tab === "reset" ? (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-xs">
                    Account Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full text-xs" disabled={submitting}>
                  <Mail className="mr-2 h-4 w-4" />
                  {submitting ? "Sending reset link…" : "Send Password Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setTab("signin")}
                >
                  <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="signin" onClick={() => setTab("signin")}>
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" onClick={() => setTab("signup")}>
                    Create Account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signin-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-xs">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setTab("reset")}
                          className="text-xs font-medium text-primary hover:underline py-1 px-1.5 -mr-1.5 cursor-pointer touch-manipulation"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full text-xs mt-1" disabled={submitting}>
                      <LogIn className="mr-2 h-4 w-4" />
                      {submitting ? "Signing in…" : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-xs">
                        Password (min 6 characters)
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm" className="text-xs">
                        Confirm Password
                      </Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full text-xs mt-1" disabled={submitting}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {submitting ? "Creating account…" : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <span>
                Your data stays local until you sign in. When signed in, private cloud sync and AI assistant features are enabled automatically.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
