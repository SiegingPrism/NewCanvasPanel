import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, UserCheck, Delete, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/supabase/authStore";
import { useWhiteboard } from "@/lib/whiteboard/store";

interface TeacherPinSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGISTERED_TEACHERS = [
  { pin: "1234", name: "Sunita Roy", subject: "Class 6A Science" },
  { pin: "2345", name: "Vikram Kulkarni", subject: "Class 8B Mathematics" },
  { pin: "3456", name: "Anil Deshmukh", subject: "Class 10 Physics" },
  { pin: "4567", name: "Pooja Sharma", subject: "Class 9 Hindi & Marathi" },
];

export function TeacherPinSwitchDialog({ open, onOpenChange }: TeacherPinSwitchDialogProps) {
  const [enteredPin, setEnteredPin] = useState("");
  const { clearOnSignOut } = useWhiteboard();

  const handleDigit = (d: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + d;
      setEnteredPin(next);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((p) => p.slice(0, -1));
  };

  const verifyPin = (pin: string) => {
    const found = REGISTERED_TEACHERS.find((t) => t.pin === pin);
    if (found) {
      toast.success(`Welcome, ${found.name}! (${found.subject})`);
      localStorage.setItem("slate_active_teacher_name", found.name);
      localStorage.setItem("slate_active_teacher_subject", found.subject);
      setEnteredPin("");
      onOpenChange(false);
    } else {
      toast.error("Incorrect PIN. Please re-enter or sign in with email.");
      setEnteredPin("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 bg-card border shadow-2xl flex flex-col items-center text-center">
        <DialogHeader>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-1">
              <KeyRound className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Quick Teacher Switching (PIN)
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Enter your 4-digit teacher PIN to switch accounts rapidly between periods.
            </p>
          </div>
        </DialogHeader>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-4 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const hasVal = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  hasVal
                    ? "bg-primary border-primary scale-110 shadow-xs"
                    : "border-muted-foreground/30"
                }`}
              />
            );
          })}
        </div>

        {/* Keypad Grid (Touch-friendly >= 64px targets) */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] my-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl border bg-muted/30 hover:bg-primary/10 hover:border-primary/40 font-bold text-lg text-foreground transition active:scale-95 flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setEnteredPin("")}
            className="h-14 rounded-2xl border bg-muted/20 hover:bg-muted/40 font-semibold text-xs text-muted-foreground transition active:scale-95 flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl border bg-muted/30 hover:bg-primary/10 hover:border-primary/40 font-bold text-lg text-foreground transition active:scale-95 flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl border bg-muted/20 hover:bg-muted/40 text-muted-foreground transition active:scale-95 flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground mt-3">
          Tip: Test PINs: <code className="bg-muted px-1 rounded">1234</code> (Sunita), <code className="bg-muted px-1 rounded">2345</code> (Vikram)
        </div>
      </DialogContent>
    </Dialog>
  );
}

