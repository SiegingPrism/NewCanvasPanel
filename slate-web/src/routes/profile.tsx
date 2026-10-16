import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, getUserAvatarUrl, getUserDisplayName } from "@/lib/supabase/authStore";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useNotes } from "@/lib/notesStore";
import { useAISettings } from "@/lib/ai/aiSettingsStore";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  ShieldCheck,
  LogOut,
  Trash2,
  Cloud,
  Sparkles,
  LayoutGrid,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Key,
  Database,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Account — Slate" },
      { name: "description", content: "Manage your Slate account, Google profile, and cloud sync settings." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount, signInWithGoogle, loading } = useAuth();
  const { boards, boardOrder, syncWithCloud } = useWhiteboard();
  const { notes } = useNotes();
  const { userApiKey } = useAISettings();

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const avatarUrl = getUserAvatarUrl(user);
  const displayName = getUserDisplayName(user);

  const totalBoards = boardOrder.filter((id) => boards[id] && !boards[id].archived).length;
  const starredBoards = boardOrder.filter((id) => boards[id] && !boards[id].archived && boards[id].favorite).length;
  const totalNotes = Object.keys(notes).length;

  const isGoogle = user?.app_metadata?.provider === "google" ||
    user?.identities?.some((id) => id.provider === "google");

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  async function handleSync() {
    setSyncing(true);
    try {
      await syncWithCloud();
      toast.success("All boards and notes synchronized with cloud");
    } catch {
      toast.error("Cloud sync failed. Check your network connection.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (res?.error) {
        toast.error(res.error.message);
      } else {
        toast.success("Account and cloud data removed");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-background pb-[max(6rem,calc(var(--sab,0px)+5.5rem))] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md pt-[max(0.75rem,calc(var(--sat,0px)+0.75rem))]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/" });
                }
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-accent active:scale-95 transition shadow-2xs"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Profile & Account
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !user}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-accent active:scale-95 transition shadow-2xs disabled:opacity-50"
              title="Sync with cloud"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin text-primary")} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6 space-y-5">
        {/* Profile Hero Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm bg-muted flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : user ? (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-black text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
                  <UserIcon className="h-10 w-10 stroke-[1.5]" />
                </div>
              )}
            </div>

            {/* User Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-bold text-foreground tracking-tight truncate">
                  {displayName}
                </h2>
                {user && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {isGoogle ? "Google Account" : "Verified User"}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-col sm:flex-row flex-wrap items-center sm:items-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {user?.email && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {user.email}
                  </span>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    Member since {memberSince}
                  </span>
                )}
              </div>

              {/* Status Info / Action */}
              <div className="mt-3">
                {user ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your whiteboards, drawings, and notes are synced securely with your Google cloud account.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You are using Slate in guest offline mode. Sign in to synchronize your boards across phone, tablet, and web.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => signInWithGoogle()}
                        className="rounded-xl gap-2 font-medium"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        Sign in with Google
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAuthDialogOpen(true)}
                        className="rounded-xl"
                      >
                        Email Sign In
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Quick Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-2xs">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary mb-1.5">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-foreground tabular-nums">{totalBoards}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Boards</span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-2xs">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-foreground tabular-nums">{starredBoards}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Favorites</span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-2xs">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-1.5">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-foreground tabular-nums">{totalNotes}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Notes</span>
          </div>
        </div>

        {/* Settings & Configuration Section */}
        <div className="space-y-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settings & Integrations
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            {/* AI Settings */}
            <button
              type="button"
              onClick={() => setAiSettingsOpen(true)}
              className="flex w-full items-center justify-between p-3.5 hover:bg-accent/60 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Slate AI Settings</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {userApiKey ? "Personal Gemini API Key Configured" : "Default Built-in Gemini Engine"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
            </button>

            {/* Cloud Sync */}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !user}
              className="flex w-full items-center justify-between p-3.5 hover:bg-accent/60 transition cursor-pointer text-left group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Cloud Sync & Storage</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {user ? "Automatic synchronization active" : "Sign in to enable cross-device cloud sync"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
            </button>

            {/* App About / Version */}
            <div className="flex items-center justify-between p-3.5 text-left">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Slate by SNANS TECH</h4>
                  <p className="text-[11px] text-muted-foreground">Version 1.0.0 (Android Native & Web)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Management & Sign Out */}
        {user && (
          <div className="space-y-2 pt-2">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account Security
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full justify-center gap-2 rounded-xl text-xs font-semibold border-border/80 hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign Out of Account"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full justify-center gap-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account & Cloud Data
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete your account and remove all synced whiteboards and notes from the cloud. Local copies on this device will be detached. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {deleting ? "Deleting…" : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation Bar */}
      <BottomNavBar activeTab="settings" />
    </div>
  );
}
