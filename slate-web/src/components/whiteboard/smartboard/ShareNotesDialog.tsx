import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Download, FileText, CheckCircle2, Share2, Sparkles, Wifi, Edit2 } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { renderPageSnapshot, captureCanvasSnapshot } from "@/lib/whiteboard/canvasSnapshot";
import { toast } from "sonner";

interface ShareNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardTitle?: string;
}

export function ShareNotesDialog({ open, onOpenChange, boardTitle = "Lesson Notes" }: ShareNotesDialogProps) {
  const { pages, activePageId } = useWhiteboard();
  const [shareId] = useState(() => `share-${Math.random().toString(36).slice(2, 9)}`);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [serverHost, setServerHost] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  });
  const [editingHost, setEditingHost] = useState(false);

  useEffect(() => {
    if (open) {
      generatePdfAndQR();
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [open, serverHost]);

  const generatePdfAndQR = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [1920, 1080],
      });

      pages.forEach((p, idx) => {
        if (idx > 0) doc.addPage([1920, 1080], "landscape");

        // High-fidelity image snapshot of full canvas contents (ink, strokes, shapes, images, stickies, etc.)
        const pageImg =
          renderPageSnapshot(p, 1920, 1080) || (p.id === activePageId ? captureCanvasSnapshot() : null);

        if (pageImg) {
          doc.addImage(pageImg, "JPEG", 0, 0, 1920, 1080, undefined, "FAST");
        } else {
          // Fallback: draw background and text
          doc.setFillColor(
            p.background === "blackboard" ? 27 : 255,
            p.background === "blackboard" ? 56 : 255,
            p.background === "blackboard" ? 43 : 255
          );
          doc.rect(0, 0, 1920, 1080, "F");

          // Page Header
          doc.setFontSize(28);
          doc.setTextColor(15, 23, 42);
          doc.text(`${boardTitle} — Page ${idx + 1}`, 60, 60);

          // Render text objects onto PDF
          p.objects.forEach((obj) => {
            if (obj.kind === "text") {
              doc.setFontSize(obj.fontSize * 1.5 || 24);
              doc.text(obj.text, obj.x + 80, obj.y + 120);
            } else if (obj.kind === "sticky") {
              doc.setFillColor(254, 240, 138);
              doc.roundedRect(obj.x + 80, obj.y + 120, obj.w * 1.2, obj.h * 1.2, 10, 10, "F");
              doc.setFontSize(18);
              doc.setTextColor(15, 23, 42);
              doc.text(obj.text, obj.x + 95, obj.y + 155);
            }
          });
        }
      });

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      // Save data URL and upload to server for cross-device mobile download
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          if (typeof reader.result === "string") {
            const base64 = reader.result;
            try {
              localStorage.setItem("slate_shared_notes_pdf", base64);
              localStorage.setItem(`slate_shared_notes_${shareId}`, base64);
            } catch {}

            // Send to server API so student phones across the classroom can download it
            await fetch("/api/notes-share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: shareId,
                title: boardTitle,
                pdfBase64: base64,
              }),
            });
          }
        } catch (err) {
          console.warn("Failed to upload notes PDF to server:", err);
        }
      };
      reader.readAsDataURL(blob);

      // Point QR code to student mobile download route with unique note ID
      const base = serverHost || (typeof window !== "undefined" ? window.location.origin : "");
      const shareUrl = `${base}/share?id=${shareId}&title=${encodeURIComponent(boardTitle)}`;
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrCodeUrl(qr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate notes PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (pdfBlobUrl) {
      const a = document.createElement("a");
      a.href = pdfBlobUrl;
      a.download = `${boardTitle.replace(/\s+/g, "_")}_Notes.pdf`;
      a.click();
      toast.success("Lesson notes downloaded as PDF!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border text-center">
        <DialogHeader>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <Share2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Share Notes via QR Code
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Students point their phone camera to instantly download all {pages.length} pages as a PDF.
            </p>
          </div>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center justify-center">
          <div className="p-3 bg-white rounded-2xl shadow-lg border border-border inline-block">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Lesson Notes QR Code" className="h-48 w-48 rounded-lg" />
            ) : (
              <div className="h-48 w-48 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                <QrCode className="h-10 w-10 text-muted-foreground animate-bounce" />
              </div>
            )}
          </div>

          {/* Wi-Fi Host IP Editor for Local Classroom Networks */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setEditingHost(!editingHost)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium mx-auto"
            >
              <Wifi className="h-3 w-3" />
              <span>Host: {serverHost.replace(/^https?:\/\//, "")}</span>
              <Edit2 className="h-2.5 w-2.5 opacity-60" />
            </button>
            {editingHost && (
              <div className="mt-1.5 flex gap-1 justify-center">
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="http://192.168.1.5:5173"
                  className="text-[11px] bg-background border rounded px-2 py-1 font-mono w-48"
                />
                <button
                  onClick={() => setEditingHost(false)}
                  className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-bold"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleDownloadPdf}
            disabled={!pdfBlobUrl || isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF to Board ({pages.length} Pages)</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
