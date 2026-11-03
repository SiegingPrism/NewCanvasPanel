import { AlertCircle, ArrowRightLeft, Check, ChevronDown, Eraser, Languages, PenLine, Type, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import { findLanguage, recognitionAvailable, useInk } from "@/lib/ink/recognizer";
import { ensureHandwritingFont, fontStack, TEXT_FONTS } from "@/lib/ink/handwritingFonts";

/** Handwriting toggles shown in the pen menu and settings. */
export function HandwritingSettings({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { livePreview, autoType, scratchOut, translateLive, translateTo, textFont, openTranslatePicker, status, lastError, language, set, setLangPickerOpen } = useInk();
  const targetLang = findLanguage(translateTo);
  // Load the lettering fonts so each choice previews in its own style
  useEffect(() => {
    for (const f of TEXT_FONTS) if (f.font) void ensureHandwritingFont(f.font, f.label);
  }, []);
  const currentLang = findLanguage(language);

  // Online only: recognition is done by Gemini, so the status is about the connection / AI setup
  const kind: "ok" | "offline" | "error" | "setup" = !recognitionAvailable()
    ? "setup"
    : status === "offline"
      ? "offline"
      : status === "error" && lastError
        ? "error"
        : "ok";
  const statusLine =
    kind === "setup"
      ? "Sign in or add a Gemini key in Settings to read handwriting"
      : kind === "offline"
        ? "Offline — handwriting needs internet"
        : kind === "error"
          ? `Last attempt failed: ${lastError}`
          : `${currentLang.name} · read online by AI · needs internet`;

  const Row = ({
    icon,
    title,
    hint,
    checked,
    onChange,
    testId,
  }: {
    icon: React.ReactNode;
    title: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    testId: string;
  }) => (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 py-1.5 cursor-pointer active:opacity-75"
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 text-slate-500 dark:text-slate-400">{icon}</span>
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs font-medium text-foreground">{title}</div>
          {!compact && <div className="text-[10px] leading-snug text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} data-testid={testId} />
      </div>
    </div>
  );

  return (
    <div
      className={`rounded-xl bg-white dark:bg-slate-900 ${className}`}
      data-testid="handwriting-settings"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Handwriting
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLangPickerOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-foreground hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer active:scale-95"
          title="Change handwriting recognition language"
        >
          <Languages className="h-3 w-3 text-orange-500 shrink-0" />
          <span className="max-w-[125px] truncate font-semibold text-foreground">
            {currentLang.nativeName} ({currentLang.name})
          </span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
        </button>
      </div>

      <div className="px-1 space-y-0.5">
        <Row
          icon={<PenLine className="h-3.5 w-3.5" />}
          title="Live text preview"
          hint="Shows what you wrote — tap it to convert"
          checked={livePreview}
          onChange={(v) => set({ livePreview: v })}
          testId="ink-live-toggle"
        />
        {/* Slate Translate Card */}
        <div className="my-1 rounded-xl border border-violet-200/90 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/20 p-2 space-y-1.5 transition-all">
          <div
            onClick={() => {
              const next = !translateLive;
              set({ translateLive: next });
              if (next) {
                toast.success(`Slate Translate ON — Translating into ${targetLang.name} (${targetLang.nativeName}) in handwriting`);
              } else {
                toast.info("Slate Translate OFF — Normal handwriting recognition");
              }
            }}
            className="flex items-center justify-between gap-3 cursor-pointer active:opacity-75"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 text-violet-600 dark:text-violet-400">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>Slate Translate</span>
                  {translateLive && (
                    <span className="rounded-full bg-violet-600 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                      Live
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="text-[10px] leading-snug text-muted-foreground">
                    Write in any language — auto-converts to {targetLang.name} in authentic handwriting
                  </div>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={translateLive}
                onCheckedChange={(v) => {
                  set({ translateLive: v });
                  if (v) {
                    toast.success(`Slate Translate ON — Translating into ${targetLang.name} (${targetLang.nativeName}) in handwriting`);
                  } else {
                    toast.info("Slate Translate OFF — Normal handwriting recognition");
                  }
                }}
                aria-label="Slate Translate"
                data-testid="ink-translate-toggle"
              />
            </div>
          </div>
          {translateLive && (
            <button
              type="button"
              data-testid="ink-translate-target"
              onClick={(e) => {
                e.stopPropagation();
                openTranslatePicker();
              }}
              className="w-full flex items-center justify-between rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs hover:bg-violet-50/80 dark:hover:bg-slate-800 active:scale-[0.98] cursor-pointer transition"
              title="Change target translation language"
            >
              <span className="text-muted-foreground text-[10px]">Translate into:</span>
              <span className="font-semibold text-violet-700 dark:text-violet-300">
                {targetLang.nativeName} ({targetLang.name})
              </span>
              <ChevronDown className="h-3 w-3 opacity-60 text-violet-600 dark:text-violet-400" />
            </button>
          )}
        </div>
        <Row
          icon={<Type className="h-3.5 w-3.5" />}
          title="Write to type"
          hint="Turns handwriting into text when you pause"
          checked={autoType}
          onChange={(v) => set({ autoType: v })}
          testId="ink-auto-toggle"
        />
        <div className="px-1 py-1.5" data-testid="ink-text-font">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Text style</span>
            {!compact && (
              <span className="text-[10px] font-normal text-muted-foreground">· how converted writing looks</span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {TEXT_FONTS.map((f) => {
              const active = (textFont || "plain") === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    set({ textFont: f.id });
                  }}
                  aria-pressed={active}
                  aria-label={`Text style ${f.label}`}
                  title={f.label}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 text-left transition active:scale-95 ${
                    active
                      ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className="block whitespace-nowrap text-[15px] leading-tight"
                    style={{ fontFamily: fontStack(f.font || undefined) }}
                  >
                    {f.id === "plain" ? "Aa Plain" : "Hello"}
                  </span>
                  {f.id !== "plain" && (
                    <span className="block whitespace-nowrap text-[9px] text-muted-foreground">{f.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <Row
          icon={<Eraser className="h-3.5 w-3.5" />}
          title="Scratch out to erase"
          hint="Scribble over words to delete them"
          checked={scratchOut}
          onChange={(v) => set({ scratchOut: v })}
          testId="ink-scratch-toggle"
        />
      </div>

      <div
        className={`flex items-start gap-1.5 px-1 pt-1.5 text-[10px] ${
          kind === "ok" ? "text-muted-foreground" : "text-rose-600 dark:text-rose-400 font-medium"
        }`}
        data-testid="ink-status"
      >
        {kind === "ok" ? (
          <Check className="mt-px h-3 w-3 shrink-0 text-emerald-500" />
        ) : kind === "offline" ? (
          <WifiOff className="mt-px h-3 w-3 shrink-0" />
        ) : (
          <AlertCircle className="mt-px h-3 w-3 shrink-0" />
        )}
        <span className="leading-snug">{statusLine}</span>
      </div>
    </div>
  );
}
