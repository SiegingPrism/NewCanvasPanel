import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAISettings } from "@/lib/ai/aiSettingsStore";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useInk, findLanguage } from "@/lib/ink/recognizer";
import { HandwritingLanguageDialog } from "@/components/whiteboard/HandwritingLanguageDialog";
import { GEMINI_MODEL, testGeminiConnection, type ConnectionTestResult } from "@/lib/ai/aiEngine";
import {
  Settings,
  ZoomIn,
  Shapes,
  Key,
  Sparkles,
  CheckCircle2,
  Wifi,
  Activity,
  Loader2,
  XCircle,
  Sliders,
  Languages,
  PenLine,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export function AISettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const geminiKey = useAISettings((s) => s.geminiKey);
  const setGeminiKey = useAISettings((s) => s.setGeminiKey);
  const hasBuiltInKey = useAISettings((s) => s.hasBuiltInKey());

  const {
    showZoomDock,
    setShowZoomDock,
    autoSnapEnabled,
    setAutoSnapEnabled,
  } = useWhiteboard();

  const { livePreview, autoType, scratchOut, language, set: setInk } = useInk();
  const [langDialogOpen, setLangDialogOpen] = useState(false);
  const currentLang = findLanguage(language);

  const [tempKey, setTempKey] = useState(geminiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (open) {
      setTempKey(geminiKey);
      setTestResult(null);
    }
  }, [open, geminiKey]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    // Test the key in the box, or the built-in key when the box is empty.
    const result = await testGeminiConnection(tempKey.trim() || undefined);
    setTestResult(result);
    setTesting(false);
  }

  function handleSave() {
    setGeminiKey(tempKey);
    toast.success("Settings saved");
    onOpenChange(false);
  }

  const usingBuiltIn = !tempKey.trim() && hasBuiltInKey;
  const notConfigured = !tempKey.trim() && !hasBuiltInKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage canvas tools, display preferences, and AI features.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="canvas" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Canvas & View
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              AI & Gemini
            </TabsTrigger>
          </TabsList>

          {/* Canvas & View Settings */}
          <TabsContent value="canvas" className="space-y-3 pt-2">
            <div className="rounded-xl border bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Zoom & Canvas Controls Dock</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Show the floating [- 100% + | ⤢ 🧭 📺] zoom, fit, and presentation dock on the screen.
                  </div>
                </div>
                <Switch
                  checked={showZoomDock}
                  onCheckedChange={(checked) => {
                    setShowZoomDock(checked);
                    toast.success(
                      checked
                        ? "Zoom dock enabled on canvas"
                        : "Zoom dock hidden from canvas"
                    );
                  }}
                  aria-label="Toggle Zoom Dock"
                />
              </div>
            </div>

            <div className="rounded-xl border bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shapes className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Smart Shape Auto-Snap</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Automatically convert hand-drawn rough strokes into clean circles, rectangles, and lines.
                  </div>
                </div>
                <Switch
                  checked={autoSnapEnabled}
                  onCheckedChange={(checked) => {
                    setAutoSnapEnabled(checked);
                    toast.success(
                      checked
                        ? "Auto-snap enabled"
                        : "Auto-snap turned off"
                    );
                  }}
                  aria-label="Toggle Auto-Snap"
                />
              </div>
            </div>

            {/* Handwriting Recognition & Language */}
            <div className="rounded-xl border bg-card/60 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span>Handwriting Language</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    All 22 Indian languages supported
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLangDialogOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-foreground hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors border border-border shadow-xs"
                >
                  <Languages className="h-3.5 w-3.5 text-orange-500" />
                  <span className="max-w-[130px] truncate">{currentLang.nativeName} ({currentLang.name})</span>
                  <ChevronRight className="h-3 w-3 opacity-50" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">Live Text Preview</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Floating recognized text chip — tap to convert into typed text.
                  </div>
                </div>
                <Switch
                  checked={livePreview}
                  onCheckedChange={(v) => {
                    setInk({ livePreview: v });
                    toast.success(v ? "Live text preview enabled" : "Live text preview disabled");
                  }}
                  aria-label="Toggle Live Text Preview"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">Write to Type</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Turns handwriting into typed text automatically when you pause.
                  </div>
                </div>
                <Switch
                  checked={autoType}
                  onCheckedChange={(v) => {
                    setInk({ autoType: v });
                    toast.success(v ? "Write to type enabled" : "Write to type disabled");
                  }}
                  aria-label="Toggle Write to Type"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">Scratch Out to Erase</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Scribble rapidly over strokes to erase them.
                  </div>
                </div>
                <Switch
                  checked={scratchOut}
                  onCheckedChange={(v) => {
                    setInk({ scratchOut: v });
                    toast.success(v ? "Scratch-out enabled" : "Scratch-out disabled");
                  }}
                  aria-label="Toggle Scratch Out"
                />
              </div>
            </div>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Personal Gemini API key (optional)</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline"
                >
                  Get a free key
                </a>
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder={
                    hasBuiltInKey
                      ? "Leave blank to use Slate's built-in AI"
                      : "Paste your Gemini API key"
                  }
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="pr-8 text-xs font-mono"
                  autoComplete="off"
                />
                <Key className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your key is stored only on this device and used for chat, handwriting, math, quizzes
                and flashcards. Runs with Google Gemini ({GEMINI_MODEL}).
              </p>
            </div>

            <div
              className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${
                notConfigured
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-primary/20 bg-primary/5 text-muted-foreground"
              }`}
            >
              <Wifi className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {notConfigured
                  ? "No API key is configured yet, so AI features are turned off. Add a key above."
                  : usingBuiltIn
                    ? "Using Slate's built-in AI. AI features need an internet connection."
                    : "Using your personal key. AI features need an internet connection."}
              </span>
            </div>

            {testResult && (
              <div
                className={`rounded-xl border p-3 text-xs space-y-1 ${
                  testResult.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                }`}
              >
                <div className="flex items-start gap-2 font-medium">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                <div className="pl-6 font-mono text-[10.5px] opacity-80 break-words">
                  {testResult.model} · HTTP {testResult.status || "—"} · {testResult.ms} ms
                  {testResult.detail ? ` · ${testResult.detail}` : ""}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing}
            className="mr-auto gap-1.5 text-xs"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            Test connection
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
        <HandwritingLanguageDialog open={langDialogOpen} onOpenChange={setLangDialogOpen} />
      </DialogContent>
    </Dialog>
  );
}

export const SettingsDialog = AISettingsDialog;
