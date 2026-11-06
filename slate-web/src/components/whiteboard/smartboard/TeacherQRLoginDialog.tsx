import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, ShieldAlert, LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth/AuthDialog";

interface TeacherQRLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherQRLoginDialog({ open, onOpenChange }: TeacherQRLoginDialogProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const handleOpenDirectAuth = () => {
    onOpenChange(false);
    setAuthDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border text-center">
          <DialogHeader>
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-1">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Teacher Direct Sign-In
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Account Security Notice</p>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4 text-left">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-600 dark:text-amber-400 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <Lock className="h-4 w-4 shrink-0" />
                <span>QR Token Transfer Deactivated</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To prevent session hijacking and token exposure on public classroom displays, fast
                QR token exchange over public channels has been disabled.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Please sign in directly using your email and password or Google account. Your session
              remains strictly private and encrypted on this device.
            </p>

            <Button
              onClick={handleOpenDirectAuth}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Open Direct Sign-In</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
