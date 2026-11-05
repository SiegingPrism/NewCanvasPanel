import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  UserCheck,
  LogOut,
  LogIn,
  KeyRound,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/authStore";
import {
  syncBoardToSupabase,
  fetchBoardsFromSupabase,
  type CloudBoardRecord,
} from "@/lib/supabase/dbService";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";

export interface TeacherAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCloudBoard?: (boardId: string) => void;
}

export function TeacherAccountDialog({
  open,
  onOpenChange,
  onOpenCloudBoard,
}: TeacherAccountDialogProps) {
  const { user, signIn, signUp, signOut, checkSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingCurrent, setIsSyncingCurrent] = useState(false);
  const [cloudLessons, setCloudLessons] = useState<CloudBoardRecord[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const activeBoardId = useWhiteboard((s) => s.activeBoardId);
  const boards = useWhiteboard((s) => s.boards);
  const pages = useWhiteboard((s) => s.pages);
  const syncWithCloud = useWhiteboard((s) => s.syncWithCloud);

  useEffect(() => {
    if (open) {
      checkSession();
      if (user) {
        refreshCloudLessons();
      }
    }
  }, [open, user]);

  const refreshCloudLessons = async () => {
    setIsLoadingLessons(true);
    try {
      const records = await fetchBoardsFromSupabase();
      setCloudLessons(records);
      await syncWithCloud();
    } catch {
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter your teacher email and password.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to sign in. Please verify your credentials.");
    } else {
      toast.success("Welcome back! Signed in successfully.");
      refreshCloudLessons();
    }
  };

  const handleDemoSignIn = async () => {
    setEmail("teacher@school.edu");
    setPassword("TeacherPass123!");
    setIsSubmitting(true);
    // Attempt sign in or auto signup demo
    let res = await signIn("teacher@school.edu", "TeacherPass123!");
    if (res.error) {
      await signUp("teacher@school.edu", "TeacherPass123!");
      res = await signIn("teacher@school.edu", "TeacherPass123!");
    }
    setIsSubmitting(false);
    if (!res.error) {
      toast.success("Signed in with Teacher Account!");
      refreshCloudLessons();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCloudLessons([]);
    toast.success("Signed out safely from smart board.");
  };

  const handleSyncCurrentBoard = async () => {
    if (!activeBoardId) {
      toast.error("No active board open to sync.");
      return;
    }
    const meta = boards[activeBoardId];
    if (!meta) {
      toast.error("Could not find board metadata.");
      return;
    }

    setIsSyncingCurrent(true);
    try {
      const ok = await syncBoardToSupabase(meta, pages);
      if (ok) {
        toast.success(`Lesson "${meta.title || "Untitled"}" saved to your cloud account!`);
        refreshCloudLessons();
      } else {
        toast.error("Cloud sync failed. Please check sign-in status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setIsSyncingCurrent(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[94vw] p-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-3xl select-none max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Cloud className="w-4 h-4 text-sky-400" />
            Teacher Cloud Account & School Sync
          </div>
          <DialogTitle className="text-2xl font-black text-white mt-1">
            Access Lessons on Any Smart Board
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Sign in once so your prepared lessons, interactive activities, and notes open on any smart board in the school.
          </p>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {user ? (
            /* ============================================================= */
            /* SIGNED IN STATE */
            /* ============================================================= */
            <div className="space-y-6">
              {/* Teacher Profile Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black text-xl">
                    {user.email ? user.email.charAt(0).toUpperCase() : "T"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{user.email}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        CLOUD ACTIVE
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Smart board ID: {activeBoardId ? activeBoardId.slice(0, 8) : "None"} · School Cloud Connected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3.5 border-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl gap-2 font-semibold"
                    onClick={refreshCloudLessons}
                    disabled={isLoadingLessons}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingLessons ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-3.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl gap-2 font-semibold"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>

              {/* Instant Sync Current Lesson Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-white">Save Current Lesson to Cloud</h4>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    "{activeBoardId && boards[activeBoardId] ? boards[activeBoardId].title : "Untitled Lesson"}" ({pages.length} pages)
                  </p>
                </div>
                <Button
                  disabled={isSyncingCurrent}
                  className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-indigo-500/25"
                  onClick={handleSyncCurrentBoard}
                >
                  {isSyncingCurrent ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Account...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      Save to My Account
                    </>
                  )}
                </Button>
              </div>

              {/* Cloud Lessons List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    My Saved Cloud Lessons ({cloudLessons.length})
                  </h4>
                  <span className="text-xs text-slate-500">Tap to open on this smart board</span>
                </div>

                {isLoadingLessons ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <span>Loading your cloud lessons...</span>
                  </div>
                ) : cloudLessons.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-slate-400">
                    <Cloud className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">No lessons saved yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tap "Save to My Account" above to save your first lesson.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {cloudLessons.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => {
                          if (onOpenCloudBoard) {
                            onOpenCloudBoard(record.id);
                            onOpenChange(false);
                          }
                        }}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-indigo-500/50 hover:bg-slate-950 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-base truncate">
                              {record.title || "Untitled Lesson"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                              {record.pages?.length || 1} pages
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 mt-1 block">
                            Last edited:{" "}
                            {record.updated_at
                              ? new Date(record.updated_at).toLocaleDateString()
                              : "Recently"}
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                          <span>Open on this Board</span>
                          <span>→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* SIGN IN FORM (WHEN NOT SIGNED IN) */
            /* ============================================================= */
            <div className="max-w-md mx-auto space-y-5 py-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                    Teacher Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="teacher@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl gap-2 shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    {isSubmitting ? "Connecting to School Cloud..." : "Sign In & Sync Lessons"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl text-xs font-semibold gap-2"
                    onClick={handleDemoSignIn}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Teacher Demo Sign-in
                  </Button>
                </div>
              </form>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Secure School Sign-In
                </div>
                <p>
                  Lessons saved to your account are private and only accessible with your credentials. You can safely sign out before leaving the classroom.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
