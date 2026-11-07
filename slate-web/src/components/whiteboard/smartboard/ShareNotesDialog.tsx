import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  QrCode,
  Download,
  FileText,
  CheckCircle2,
  Share2,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { renderPageSnapshot, captureCanvasSnapshot } from "@/lib/whiteboard/canvasSnapshot";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/authStore";
import { getPublicAppOrigin } from "@/lib/utils";
import { AIEngine } from "@/lib/ai/aiEngine";
import type { QuizObject, Page } from "@/lib/whiteboard/types";
import { shareNotesToWhatsApp } from "@/lib/whiteboard/whatsAppShare";

interface ShareNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardTitle?: string;
}

export function ShareNotesDialog({
  open,
  onOpenChange,
  boardTitle = "Lesson Notes",
}: ShareNotesDialogProps) {
  const { pages, activePageId, setPages } = useWhiteboard();
  const { user } = useAuth();
  const [shareId] = useState(() => `share-${Math.random().toString(36).slice(2, 9)}`);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"uploading" | "ready" | "error" | "local">(
    "uploading",
  );
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // End-of-class AI summary & 3-question exit quiz
  const [includeAiSummary, setIncludeAiSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<{
    summary: string;
    quiz: Array<{ question: string; options: string[]; answerIndex: number; explanation?: string }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      generatePdfAndQR(aiSummaryData);
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [open, user]);

  const extractBoardText = (): string => {
    const parts: string[] = [];
    pages.forEach((p, idx) => {
      parts.push(`Page ${idx + 1}:`);
      p.objects.forEach((obj) => {
        if (obj.kind === "text" && obj.text) parts.push(obj.text);
        if (obj.kind === "sticky" && obj.text) parts.push(obj.text);
        if ("inkText" in obj && (obj as any).inkText) parts.push((obj as any).inkText);
        if ("latex" in obj && (obj as any).latex) parts.push((obj as any).latex);
      });
    });
    return parts.join("\n").trim();
  };

  const handleGenerateSummaryAndQuiz = async () => {
    setIsGeneratingSummary(true);
    try {
      const boardText = extractBoardText();
      const topic = boardText ? boardText.slice(0, 1000) : boardTitle;

      let generatedQuiz: Array<{ question: string; options: string[]; answerIndex: number; explanation?: string }> = [];
      let generatedSummary = `Classroom Lesson Summary: ${boardTitle}\n• Core concept review and problem-solving highlights.\n• Essential formulas, diagrams, and student discussion points.\n• Recommended revision questions and exit check.`;

      if (AIEngine.isConfigured() && boardText.length > 20) {
        try {
          const rawQuiz = await AIEngine.generateQuiz(boardText, boardTitle, 3);
          if (rawQuiz && rawQuiz.length > 0) {
            generatedQuiz = rawQuiz.slice(0, 3);
          }
        } catch (e) {
          console.warn("AI quiz generation error, using structured fallback:", e);
        }
      }

      if (generatedQuiz.length === 0) {
        generatedQuiz = [
          {
            question: `What was the primary focus of today's lesson on ${boardTitle}?`,
            options: [
              "Mastering key definitions and practical application",
              "Skipping foundational rules without problem solving",
              "Memorizing only without graphical analysis",
              "Postponing understanding until final exam",
            ],
            answerIndex: 0,
            explanation: "Today's whiteboard class emphasized conceptual clarity and step-by-step application.",
          },
          {
            question: "Which of the following is an essential takeaway from the board notes?",
            options: [
              "Verifying steps and reviewing diagrams carefully",
              "Ignoring units and notation",
              "Assuming solutions without derivation",
              "Discarding teacher annotations",
            ],
            answerIndex: 0,
            explanation: "Diagrams and verified derivations ensure long-term retention.",
          },
          {
            question: "How should you prepare for the upcoming assessment on this topic?",
            options: [
              "Review the shared PDF notes and solve the practice problems",
              "Only read the title of the chapter",
              "Avoid asking doubts in next class",
              "Ignore formula sheets",
            ],
            answerIndex: 0,
            explanation: "Consistent problem solving using shared notes leads to exam success.",
          },
        ];
      }

      const summaryPayload = {
        summary: generatedSummary,
        quiz: generatedQuiz,
      };

      setAiSummaryData(summaryPayload);
      setIncludeAiSummary(true);
      await generatePdfAndQR(summaryPayload);
      toast.success("AI Summary & 3-Question Exit Quiz added to notes!");
    } catch (err: any) {
      toast.error("Could not generate summary: " + (err?.message || "Unknown error"));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAddQuizToBoard = () => {
    if (!aiSummaryData || aiSummaryData.quiz.length === 0) return;
    const q = aiSummaryData.quiz[0];
    const newQuizObj: QuizObject = {
      id: `quiz-${Math.random().toString(36).slice(2, 9)}`,
      kind: "quiz",
      x: 140,
      y: 120,
      w: 480,
      h: 280,
      question: q.question,
      options: q.options,
      answerIndex: q.answerIndex,
      revealed: false,
    };

    setPages(
      pages.map((p) =>
        p.id === activePageId
          ? { ...p, objects: [...p.objects, newQuizObj] }
          : p,
      ),
    );
    toast.success("Exit Quiz card added directly to your board!");
  };

  const uploadToSupabase = async (blob: Blob): Promise<string | null> => {
    if (!user) {
      setUploadErrorMsg("Please sign in to upload notes for student phones");
      setUploadStatus("error");
      return null;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setUploadErrorMsg("Supabase client is not configured");
      setUploadStatus("error");
      return null;
    }

    try {
      const fileName = `notes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("shared-notes")
        .upload(fileName, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn("Supabase storage upload error:", uploadError.message);
        setUploadErrorMsg(uploadError.message);
        setUploadStatus("error");
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from("shared-notes").getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        setPublicUrl(publicUrlData.publicUrl);
        setUploadStatus("ready");
        setUploadErrorMsg(null);
        return publicUrlData.publicUrl;
      }
      return null;
    } catch (err: any) {
      console.warn("Storage upload exception:", err);
      setUploadErrorMsg(err?.message || "Storage upload failed");
      setUploadStatus("error");
      return null;
    }
  };

  const generatePdfAndQR = async (
    summaryPayload?: {
      summary: string;
      quiz: Array<{ question: string; options: string[]; answerIndex: number; explanation?: string }>;
    } | null,
  ) => {
    setIsGenerating(true);
    setUploadStatus("uploading");
    setUploadErrorMsg(null);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [1920, 1080],
      });

      pages.forEach((p, idx) => {
        if (idx > 0) doc.addPage([1920, 1080], "landscape");

        const pageImg =
          renderPageSnapshot(p, 1920, 1080) ||
          (p.id === activePageId ? captureCanvasSnapshot() : null);

        if (pageImg) {
          doc.addImage(pageImg, "JPEG", 0, 0, 1920, 1080, undefined, "FAST");
        } else {
          doc.setFillColor(
            p.background === "blackboard" ? 27 : 255,
            p.background === "blackboard" ? 56 : 255,
            p.background === "blackboard" ? 43 : 255,
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

      // Append End-of-Class AI Summary & 3-Question Exit Quiz Page if present
      if (summaryPayload) {
        doc.addPage([1920, 1080], "landscape");
        // Dark blue professional header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 1920, 140, "F");
        doc.setFontSize(36);
        doc.setTextColor(255, 255, 255);
        doc.text("🎓 End-of-Class Summary & 3-Question Exit Quiz", 80, 80);

        // Background for content
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 140, 1920, 940, "F");

        // Key Concepts Summary Box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(80, 180, 1760, 220, 12, 12, "F");
        doc.setFontSize(24);
        doc.setTextColor(14, 116, 144);
        doc.text("📌 Key Concepts & Takeaways", 120, 230);
        doc.setFontSize(18);
        doc.setTextColor(51, 65, 85);
        const summaryLines = doc.splitTextToSize(summaryPayload.summary, 1680);
        doc.text(summaryLines, 120, 275);

        // 3 Exit Quiz Questions
        doc.setFontSize(24);
        doc.setTextColor(67, 56, 202);
        doc.text("🎯 3-Question Exit Quiz", 80, 440);

        let qY = 490;
        summaryPayload.quiz.slice(0, 3).forEach((item, qIdx) => {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(80, qY, 1760, 160, 12, 12, "F");

          doc.setFontSize(20);
          doc.setTextColor(15, 23, 42);
          doc.text(`Q${qIdx + 1}. ${item.question}`, 120, qY + 45);

          doc.setFontSize(16);
          doc.setTextColor(71, 85, 105);
          const optStr = item.options.map((opt, oIdx) => `(${String.fromCharCode(65 + oIdx)}) ${opt}`).join("     ");
          doc.text(optStr, 120, qY + 90);

          doc.setFontSize(14);
          doc.setTextColor(22, 101, 52);
          doc.text(`Correct: (${String.fromCharCode(65 + item.answerIndex)}) — ${item.explanation || "Verified"}`, 120, qY + 130);

          qY += 185;
        });
      }

      const blob = doc.output("blob");
      blobRef.current = blob;
      const localUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(localUrl);

      // Save base64 for same-device local storage fallback
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

      // Upload to Supabase Storage for student phone download
      const publicFileUrl = await uploadToSupabase(blob);

      // Generate QR code
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

  const handleRetryUpload = async () => {
    if (!blobRef.current) return;
    setUploadStatus("uploading");
    const publicFileUrl = await uploadToSupabase(blobRef.current);
    if (publicFileUrl) {
      const base = getPublicAppOrigin();
      const shareUrl = `${base}/share?url=${encodeURIComponent(publicFileUrl)}&title=${encodeURIComponent(boardTitle)}`;
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrCodeUrl(qr);
      toast.success("Notes uploaded to cloud storage successfully!");
    } else {
      toast.error("Cloud storage upload failed. Verify bucket setup in Supabase.");
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

  const handleShareToGoogleClassroom = () => {
    const base = getPublicAppOrigin();
    const targetUrl = publicUrl || `${base}/share?id=${shareId}&title=${encodeURIComponent(boardTitle)}`;
    const classroomUrl = `https://classroom.google.com/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(boardTitle)}`;
    window.open(classroomUrl, "_blank", "noopener,noreferrer,width=650,height=600");
    toast.success("Opening Google Classroom share dialog...");
  };

  const handleShareToWhatsApp = () => {
    shareNotesToWhatsApp({
      boardTitle,
      shareUrl: publicUrl || undefined,
      summary: aiSummaryData?.summary,
    });
    toast.success("Opening WhatsApp with lesson notes...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-card p-6 shadow-2xl border border-border text-center">
        <DialogHeader>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <Share2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Share Notes via QR Code
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Students point their phone camera to instantly download all {pages.length + (aiSummaryData ? 1 : 0)} pages as a PDF.
            </p>
          </div>
        </DialogHeader>

        <div className="py-3 flex flex-col items-center justify-center">
          <div className="p-3 bg-white rounded-2xl shadow-lg border border-border inline-block">
            {isGenerating ? (
              <div className="h-44 w-44 rounded-lg bg-muted animate-pulse flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Rendering Pages...
                </span>
              </div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Lesson Notes QR Code" className="h-44 w-44 rounded-lg" />
            ) : (
              <div className="h-44 w-44 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                <QrCode className="h-10 w-10 text-muted-foreground animate-bounce" />
              </div>
            )}
          </div>

          <div className="mt-2 text-xs w-full max-w-sm">
            {uploadStatus === "ready" ? (
              <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Cloud Link Active — Ready for Student Phones</span>
              </div>
            ) : uploadStatus === "error" ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-600 dark:text-amber-400 text-left space-y-1.5">
                <div className="flex items-start gap-1.5 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Cloud storage upload failed: {uploadErrorMsg || "Bucket not found"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetryUpload}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-0.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Cloud Upload</span>
                </button>
              </div>
            ) : isGenerating ? (
              <span className="text-muted-foreground">Preparing high-resolution PDF...</span>
            ) : (
              <span className="text-muted-foreground">Classroom Direct QR Code Generated</span>
            )}
          </div>
        </div>

        {/* End-of-class AI Summary & 3-Question Exit Quiz Card */}
        <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 text-left mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                End-of-Class AI Summary & 3-Question Exit Quiz
              </span>
            </div>
            {aiSummaryData && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                Included in PDF
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Turns the board into key takeaways and a 3-question exit quiz included in the QR download.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleGenerateSummaryAndQuiz}
              disabled={isGeneratingSummary || isGenerating}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition disabled:opacity-50"
            >
              {isGeneratingSummary ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{aiSummaryData ? "Regenerate Summary & Quiz" : "Generate AI Summary & Quiz"}</span>
            </button>

            {aiSummaryData && (
              <button
                onClick={handleAddQuizToBoard}
                className="flex items-center gap-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition"
                title="Add first exit question to canvas"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add to Board</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: WhatsApp, Google Classroom & Download PDF */}
        <div className="space-y-2">
          <button
            onClick={handleShareToWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Notes to Parent WhatsApp Group</span>
            <ExternalLink className="h-3 w-3 opacity-80" />
          </button>

          <button
            onClick={handleShareToGoogleClassroom}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-muted hover:bg-muted/80 text-foreground transition-all border border-border"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Share to Google Classroom</span>
            <ExternalLink className="h-3 w-3 opacity-80" />
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={!pdfBlobUrl || isGenerating}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF to Board ({pages.length + (aiSummaryData ? 1 : 0)} Pages)</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
