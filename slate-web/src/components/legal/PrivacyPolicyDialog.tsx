import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, CheckCircle2, Lock, EyeOff, Mic, Camera, FileText } from "lucide-react";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyDialog({ open, onOpenChange }: PrivacyPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 rounded-2xl overflow-hidden bg-card text-card-foreground">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Privacy Policy & Student Data Protection
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                India DPDP Act 2023 & Google Play Families Compliant
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-5 pr-4 text-xs leading-relaxed space-y-4">
          <div className="space-y-4 pr-2">
            {/* Highlights Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Our Classroom Privacy Commitments</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                <li><strong className="text-foreground">Zero Ads & Zero Tracking:</strong> Slate contains no advertising SDKs, no behavioral tracking, and no data profiling.</li>
                <li><strong className="text-foreground">Local First:</strong> Drawings, notes, and lessons stay stored on this device. Cloud sync is strictly optional for registered teachers.</li>
                <li><strong className="text-foreground">Safe for Children:</strong> Strict adherence to Section 9 of India's Digital Personal Data Protection Act, 2023.</li>
              </ul>
            </div>

            {/* DPDP Section */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1.5">
                <Lock className="h-4 w-4 text-primary" />
                1. India DPDP Act 2023 Compliance
              </h3>
              <p className="text-muted-foreground">
                Under Section 9 of the DPDP Act 2023 (Processing of personal data of children), Slate does not engage in any processing likely to cause detrimental effects on children, does not track or profile students, and never targets advertisements to children. Student interactive participation in quizzes and polls is mediated by educational institutions acting with lawful authority.
              </p>
            </div>

            {/* Hardware Permissions */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1.5">
                <Camera className="h-4 w-4 text-primary" />
                2. Camera & Microphone Safeguards
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <div className="p-2.5 rounded-lg border border-border bg-muted/40">
                  <strong className="text-foreground flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-blue-500" /> Camera Permission:
                  </strong>
                  Used solely when the educator initiates document scanning, formula OCR, or QR code pairing. No continuous background capture, no facial recognition, and no biometric analysis.
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/40">
                  <strong className="text-foreground flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-emerald-500" /> Microphone Permission:
                  </strong>
                  Used exclusively for real-time live speech captions or voice commands. Audio is converted to text instantly and discarded. Raw audio is never recorded, saved to disk, or stored on servers.
                </div>
              </div>
            </div>

            {/* Student Participation */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1.5">
                <EyeOff className="h-4 w-4 text-primary" />
                3. Student Work Wall & Live Phone Answers
              </h3>
              <p className="text-muted-foreground">
                Students join live quizzes, polls, and blackboard showcases anonymously using temporary 4-character room codes. No student accounts, email addresses, phone numbers, or passwords are collected. Nicknames and student work photos are temporary and purged at the end of class or during daily End-of-Day cleanup.
              </p>
            </div>

            {/* AI Security */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1.5">
                <FileText className="h-4 w-4 text-primary" />
                4. AI Lesson & Math Assistance
              </h3>
              <p className="text-muted-foreground">
                AI requests are routed via encrypted HTTPS through company-managed server endpoints without bundling API keys into the client APK. Prompts are used solely to produce pedagogical explanations and are never used to train foundation models.
              </p>
            </div>

            {/* Grievance Redressal */}
            <div className="p-3 rounded-xl border border-border bg-muted/20">
              <h4 className="font-semibold text-foreground mb-1">Grievance Redressal Officer</h4>
              <p className="text-muted-foreground">
                SNANS TECH — Educational Software Division<br />
                Email: <span className="text-primary font-medium">privacy@snanstech.com</span><br />
                Inquiries and data rights requests are resolved within 30 days.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open("/privacy.html", "_blank")}
            className="text-xs text-primary"
          >
            Open Full Policy Page
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="px-5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
