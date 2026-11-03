import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Download, FileText, CheckCircle2, Share2, Sparkles, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { renderPageSnapshot, captureCanvasSnapshot } from "@/lib/whiteboard/canvasSnapshot";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/utils";

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
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"uploading" | "ready" | "local">("uploading");

  useEffect(() => {
    if (open) {
      generatePdfAndQR();
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [open]);

  const generatePdfAndQR = async () => {
    setIsGenerating(true);
    setUploadStatus("uploading");
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
          // Fallback background and text
          doc.setFillColor(
            p.background === "blackboard" ? 27 : 255,
            p.background === "blackboard" ? 56 : 255,
            p.background === "blackboard" ? 43 : 255
          );
          doc.rect(0, 0, 1920, 1080, "F");

          doc.setFontSize(28);
          doc.setTextColor(15, 23, 42);
          doc.text(`${boardTitle} — Page ${idx + 1}`, 60, 60);

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
      const localUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(localUrl);

      // Save base64 for same-device fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          try {
            localStorage.setItem("slate_shared_notes_pdf", reader.result);
            localStorage.setItem(`slate_shared_notes_${shareId}`, reader.result);
          } catch {}
        }
      };
      reader.readAsDataURL(blob);

      // Upload to Supabase Storage for true cloud public access from student phones
      const supabase = getSupabase();
      let publicFileUrl = "";

      if (supabase) {
        try {
          const fileName = `notes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("shared-notes")
            .upload(fileName, blob, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("shared-notes")
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              publicFileUrl = publicUrlData.publicUrl;
              setPublicUrl(publicFileUrl);
              setUploadStatus("ready");
            }
          } else {
            console.warn("Supabase storage upload note:", uploadError.message);
            setUploadStatus("local");
          }
        } catch (storageErr) {
          console.warn("Storage upload error:", storageErr);
          setUploadStatus("local");
        }
      } else {
        setUploadStatus("local");
      }

      // Point QR code to student mobile download page with public URL or share ID
      const base = getPublicAppOrigin();
      const shareUrl = publicFileUrl
        ? `${base}/share?url=${encodeURIComponent(publicFileUrl)}&title=${encodeURIComponent(boardTitle)}`
        : `${base}/share?id=${shareId}&title=${encodeURIComponent(boardTitle)}`;

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
            {isGenerating ? (
              <div className="h-48 w-48 rounded-lg bg-muted animate-pulse flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">Rendering Pages...</span>
              </div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Lesson Notes QR Code" className="h-48 w-48 rounded-lg" />
            ) : (
              <div className="h-48 w-48 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                <QrCode className="h-10 w-10 text-muted-foreground animate-bounce" />
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
            {uploadStatus === "ready" ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cloud Link Active — Ready for Student Phones
              </span>
            ) : isGenerating ? (
              <span>Preparing high-resolution PDF...</span>
            ) : (
              <span className="text-slate-400">Classroom Direct QR Code Generated</span>
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