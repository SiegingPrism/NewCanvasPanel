import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, QrCode, Plus, Check, Trash2, Maximize2, UploadCloud, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import { getPublicAppOrigin } from "@/lib/utils";
import type { ImageObject } from "@/lib/whiteboard/types";

interface StudentWorkWallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StudentSubmission = {
  id: string;
  studentName: string;
  imageUrl: string;
  timestamp: string;
};

export function StudentWorkWallDialog({ open, onOpenChange }: StudentWorkWallDialogProps) {
  const { pages, activePageId, setPages } = useWhiteboard();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  const [submissions, setSubmissions] = useState<StudentSubmission[]>([
    {
      id: "sub-1",
      studentName: "Aarav Sharma (Roll 12)",
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23fef3c7'/><text x='30' y='50' font-size='20' font-family='sans-serif' fill='%2392400e'>Geometry Solution - Theorem 6.1</text><line x1='50' y1='220' x2='350' y2='220' stroke='%23d97706' stroke-width='3'/><polygon points='100,220 200,80 300,220' fill='none' stroke='%23b45309' stroke-width='3'/><line x1='150' y1='150' x2='250' y2='150' stroke='%23ef4444' stroke-width='2' stroke-dasharray='4'/><text x='40' y='270' font-size='16' fill='%2378350f'>DE || BC => AD/DB = AE/EC (Proved)</text></svg>",
      timestamp: "Just now",
    },
    {
      id: "sub-2",
      studentName: "Ananya Patel (Roll 07)",
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23e0f2fe'/><text x='30' y='50' font-size='20' font-family='sans-serif' fill='%230369a1'>Quadratic Equation - Factorization</text><text x='50' y='110' font-size='18' fill='%230f172a'>2x² + 7x + 3 = 0</text><text x='50' y='160' font-size='18' fill='%230f172a'>2x² + 6x + x + 3 = 0</text><text x='50' y='210' font-size='18' fill='%230f172a'>2x(x + 3) + 1(x + 3) = 0</text><text x='50' y='260' font-size='18' fill='%2315803d'>Ans: x = -1/2 or x = -3 ✓</text></svg>",
      timestamp: "2 mins ago",
    },
  ]);

  useEffect(() => {
    if (!open) return;
    const base = getPublicAppOrigin();
    const uploadUrl = `${base}/work-wall?board=${encodeURIComponent(activePageId || "board")}`;
    QRCode.toDataURL(uploadUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrCodeUrl)
      .catch(console.error);
  }, [open, activePageId]);

  const handleAddSubmissionToCanvas = (sub: StudentSubmission) => {
    const newImageObj: ImageObject = {
      id: `img-${Math.random().toString(36).slice(2, 9)}`,
      kind: "image",
      x: 180,
      y: 140,
      w: 480,
      h: 360,
      src: sub.imageUrl,
    };

    setPages(
      pages.map((p) =>
        p.id === activePageId
          ? { ...p, objects: [...p.objects, newImageObj] }
          : p,
      ),
    );
    toast.success(`Added ${sub.studentName}'s work to the board!`);
    onOpenChange(false);
  };

  const handleSimulateStudentUpload = () => {
    const studentNames = ["Rohan Verma", "Sneha Kulkarni", "Pooja Gupta", "Aditya Joshi"];
    const chosenName = studentNames[Math.floor(Math.random() * studentNames.length)] + " (Roll " + Math.floor(Math.random() * 40 + 1) + ")";
    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      studentName: chosenName,
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><text x='30' y='50' font-size='20' font-family='sans-serif' fill='%23334155'>Physics: Ohm's Law Verification</text><text x='50' y='110' font-size='16' fill='%23475569'>V = I × R</text><text x='50' y='160' font-size='16' fill='%23475569'>Voltage V = 12V, Resistance R = 4Ω</text><text x='50' y='210' font-size='18' fill='%232563eb'>I = 12 / 4 = 3 Amperes</text><text x='50' y='260' font-size='16' fill='%2316a34a'>Verified by Experiment ✓</text></svg>",
      timestamp: "Just now",
    };
    setSubmissions((prev) => [newSub, ...prev]);
    toast.success(`New student submission received from ${chosenName}!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl p-6 bg-card border shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-foreground">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Camera className="h-6 w-6" />
              </span>
              <span>Student Work Wall</span>
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSimulateStudentUpload}
              className="gap-1.5 text-xs font-semibold"
            >
              <UploadCloud className="h-3.5 w-3.5" /> Simulate Student Photo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Students scan the QR code to photograph their notebook work and beam it directly to the board.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2 flex-1 min-h-0">
          {/* QR Code Panel */}
          <div className="p-4 rounded-2xl border bg-muted/30 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-2.5 bg-white rounded-xl shadow border">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Upload QR" className="h-36 w-36" />
              ) : (
                <div className="h-36 w-36 bg-muted animate-pulse rounded" />
              )}
            </div>
            <div className="text-xs font-bold text-foreground mt-1">Scan to Send Work</div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Open camera on any smartphone or tablet to submit notebook solutions.
            </p>
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
              {submissions.length} Submissions Active
            </div>
          </div>

          {/* Submissions Gallery */}
          <div className="md:col-span-2 flex flex-col min-h-0">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Live Class Submissions</span>
            </h4>

            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border bg-card p-3 shadow-xs hover:border-primary/50 transition flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate max-w-[160px]">
                      {sub.studentName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{sub.timestamp}</span>
                  </div>

                  <div className="rounded-xl overflow-hidden border bg-muted/40 aspect-video flex items-center justify-center">
                    <img
                      src={sub.imageUrl}
                      alt={sub.studentName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleAddSubmissionToCanvas(sub)}
                      className="flex-1 gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                      <Plus className="h-3.5 w-3.5" /> Put on Board
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-2.5 rounded-xl text-xs"
                      title="Preview Fullscreen"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fullscreen Preview Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card rounded-3xl p-4 max-w-2xl w-full border shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">{selectedSubmission.studentName}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Close
                </Button>
              </div>
              <div className="rounded-2xl overflow-hidden border">
                <img
                  src={selectedSubmission.imageUrl}
                  alt={selectedSubmission.studentName}
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    handleAddSubmissionToCanvas(selectedSubmission);
                    setSelectedSubmission(null);
                  }}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <Plus className="h-4 w-4" /> Add to Board & Annotate
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

