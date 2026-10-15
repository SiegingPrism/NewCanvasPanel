/**
 * Handwriting features on the whiteboard:
 *  - live preview: the recognised text floats above the word you are writing; tap it to convert
 *  - auto write-to-type: writing turns into typed text when you pause
 *  - scratch-out: scribble over ink (or typed text) to erase it
 *  - search: recognised text is stored on the strokes (inkText) so Find/AI can search it
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Languages, Loader2, RotateCw, Type, X } from "lucide-react";
import type { CanvasObject, Point } from "@/lib/whiteboard/types";
import {
  WRITING_KINDS,
  boundsOf,
  continuesGroup,
  scratchOutTargets,
  strokesBounds,
  textBoxForInk,
  typicalLetterHeight,
  unionRect,
  type InkStroke,
  type Rect,
} from "@/lib/ink/inkGeometry";
import { findLanguage, recognizeInk, useInk } from "@/lib/ink/recognizer";
import { ensureHandwritingFont, fontStack, handwritingScale, scriptFor } from "@/lib/ink/handwritingFonts";

const GROUP_WINDOW_MS = 2500;
const AUTO_CONVERT_IDLE_MS = 1500;

type Group = { id: string; ids: string[]; rect: Rect; lastAt: number; color: string };
export type InkChipState = {
  rect: Rect;
  text: string | null;
  alternatives?: string[];
  busy: boolean;
  busyText?: string;
  /** Why recognition failed (shown in the pill with a Retry button). */
  error?: string;
  /** Translate mode: what was written, and the target language code. */
  original?: string;
  translatedTo?: string;
  groupId: string;
} | null;

type StrokeLike = Extract<CanvasObject, { points: Point[] }>;

function isStroke(o: CanvasObject): o is StrokeLike {
  return Array.isArray((o as { points?: unknown }).points) && o.kind !== "shape";
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useHandwriting(opts: {
  getObjects: () => CanvasObject[];
  setObjects: (objects: CanvasObject[]) => void;
  pushHistory: () => void;
  getZoom: () => number;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const groupRef = useRef<Group | null>(null);
  const genRef = useRef(0);
  const recogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penDownRef = useRef(false);
  /** Latest recognition result (state updates land a render later; timers need it now). */
  const resultRef = useRef<{ groupId: string; text: string; original?: string; translatedTo?: string } | null>(null);
  const lastUpRef = useRef(0);
  const [chip, setChip] = useState<InkChipState>(null);
  const chipRef = useRef<InkChipState>(null);
  chipRef.current = chip;

  const clearTimers = () => {
    if (recogTimer.current) clearTimeout(recogTimer.current);
    if (autoTimer.current) clearTimeout(autoTimer.current);
    recogTimer.current = autoTimer.current = null;
  };

  const groupStrokes = (g: Group): InkStroke[] => {
    const byId = new Map(optsRef.current.getObjects().map((o) => [o.id, o]));
    return g.ids
      .map((id) => byId.get(id))
      .filter((o): o is StrokeLike => !!o && isStroke(o))
      .map((o) => ({ id: o.id, points: o.points }));
  };

  /** Store the recognised text on the strokes so Find and the AI can search handwriting. */
  const tagGroup = (g: Group, text: string) => {
    const { getObjects, setObjects } = optsRef.current;
    const ids = new Set(g.ids);
    let changed = false;
    const next = getObjects().map((o) => {
      if (!ids.has(o.id) || !isStroke(o)) return o;
      const inkText = o.id === g.ids[0] ? text : undefined;
      if (o.inkGroup === g.id && o.inkText === inkText) return o;
      changed = true;
      return { ...o, inkGroup: g.id, inkText } as CanvasObject;
    });
    if (changed) setObjects(next);
  };

  const dismiss = useCallback(() => {
    clearTimers();
    groupRef.current = null;
    genRef.current++;
    setChip(null);
  }, []);

  /** Replace the group's ink with typed text (one undo step). */
  const convert = useCallback((groupId?: string, overrideText?: string) => {
    const g = groupRef.current;
    const result = resultRef.current?.groupId === g?.id ? resultRef.current : null;
    const text = overrideText || result?.text || chipRef.current?.text;
    // Translations are written in a handwriting font for the target script
    const translatedTo = result?.translatedTo;
    const font = translatedTo ? scriptFor(translatedTo).font : undefined;
    if (!g || !text || (groupId && g.id !== groupId)) return false;
    const strokes = groupStrokes(g);
    if (!strokes.length) {
      dismiss();
      return false;
    }
    const ink = strokesBounds(strokes);
    const box = textBoxForInk(ink, text, typicalLetterHeight(strokes) * (font ? handwritingScale(font) : 1));
    const ids = new Set(g.ids);
    const { getObjects, setObjects, pushHistory } = optsRef.current;
    const typed: CanvasObject = {
      id: uid(),
      kind: "text",
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      text,
      color: g.color,
      fontSize: box.fontSize,
      ...(translatedTo ? { fontFamily: font, lang: translatedTo, translatedFrom: result?.original } : {}),
    };
    if (font) void ensureHandwritingFont(font, text.slice(0, 8));
    setObjects([...getObjects().filter((o) => !ids.has(o.id)), typed]);
    pushHistory();
    dismiss();
    return true;
  }, [dismiss]);

  /** Auto write-to-type: convert once the pen has been lifted for a moment (never mid-stroke). */
  const scheduleAutoConvert = (g: Group, gen: number) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (penDownRef.current) return; // penUp re-arms it
    const remainingAfterPenUp = Math.max(0, Math.max(g.lastAt, lastUpRef.current) + AUTO_CONVERT_IDLE_MS - Date.now());
    const wait = Math.max(800, remainingAfterPenUp);
    autoTimer.current = setTimeout(() => {
      if (!penDownRef.current && groupRef.current?.id === g.id && gen === genRef.current) convert(g.id);
    }, wait);
  };

  const langVersion = useInk((s) => s.langVersion);
  const prevLangVersionRef = useRef(langVersion);

  useEffect(() => {
    if (prevLangVersionRef.current !== langVersion) {
      prevLangVersionRef.current = langVersion;
      const g = groupRef.current;
      if (g) {
        scheduleRecognition(g);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langVersion]);

  const scheduleRecognition = (g: Group) => {
    const { livePreview } = useInk.getState();
    // Online only: every word is read by Gemini. Failures are shown in the pill (never silent).
    const gen = ++genRef.current;
    if (recogTimer.current) clearTimeout(recogTimer.current);
    const { translateLive, translateTo } = useInk.getState();
    const busyMsg = translateLive ? `Translating to ${findLanguage(translateTo).name}…` : "Reading…";

    if (livePreview) {
      setChip({
        rect: g.rect,
        text: null,
        alternatives: [],
        busy: true,
        busyText: busyMsg,
        groupId: g.id,
      });
    } else {
      setChip(null);
    }
    // Wait for a short pause so a whole word goes in one request
    const debounceMs = livePreview ? 450 : 600;
    recogTimer.current = setTimeout(async () => {
      try {
        const strokes = groupStrokes(g);
        if (!strokes.length) {
          setChip(null);
          return;
        }
        const res = await recognizeInk(strokes, translateLive ? { translateTo } : {});
        if (gen !== genRef.current || groupRef.current?.id !== g.id) return; // a newer stroke arrived
        if (!res?.text) {
          const error = useInk.getState().lastError;
          if (useInk.getState().livePreview && error) {
            setChip({ rect: strokesBounds(strokes), text: null, busy: false, error, groupId: g.id });
          } else {
            setChip(null);
          }
          return;
        }
        resultRef.current = { groupId: g.id, text: res.text, original: res.original, translatedTo: res.translatedTo };
        // Search finds the ink by what was written (and by its translation)
        tagGroup(g, res.original && res.original !== res.text ? `${res.original} · ${res.text}` : res.text);
        if (res.translatedTo) void ensureHandwritingFont(scriptFor(res.translatedTo).font, res.text.slice(0, 8));
        const s = useInk.getState();
        if (s.livePreview) {
          setChip({
            rect: strokesBounds(strokes),
            text: res.text,
            alternatives: res.alternatives ?? [],
            original: res.original,
            translatedTo: res.translatedTo,
            busy: false,
            groupId: g.id,
          });
        } else {
          setChip(null);
        }
        if (s.autoType) scheduleAutoConvert(g, gen);
      } catch (err) {
        console.warn("Handwriting recognition error:", err);
        if (useInk.getState().livePreview) {
          setChip({ rect: g.rect, text: null, busy: false, error: "Something went wrong reading that.", groupId: g.id });
        } else {
          setChip(null);
        }
      }
    }, debounceMs);
  };

  /**
   * Call before committing a pen stroke. Returns "erased" when the stroke was a
   * scratch-out (nothing should be drawn), "writing" when it continues a word
   * (shape auto-snap should be skipped), or null.
   */
  const beforeCommit = useCallback((kind: string, points: Point[]): "erased" | "writing" | null => {
    if (!WRITING_KINDS.has(kind)) return null;
    const { scratchOut } = useInk.getState();
    if (scratchOut && points.length >= 12) {
      const objects = optsRef.current.getObjects();
      const candidates: InkStroke[] = objects.flatMap((o): InkStroke[] => {
        if (isStroke(o)) return [{ id: o.id, points: o.points }];
        if (o.kind === "text") {
          const t = o as Extract<CanvasObject, { kind: "text" }>;
          return [{ id: t.id, points: [{ x: t.x, y: t.y + t.h * 0.2 }, { x: t.x + Math.min(t.w, t.text.length * t.fontSize * 0.56), y: t.y + t.h * 0.8 }] }];
        }
        return [];
      });
      const hits = scratchOutTargets(points, candidates);
      if (hits.length) {
        const ids = new Set(hits);
        optsRef.current.setObjects(objects.filter((o) => !ids.has(o.id)));
        optsRef.current.pushHistory();
        if (groupRef.current) {
          groupRef.current.ids = groupRef.current.ids.filter((id) => !ids.has(id));
          if (!groupRef.current.ids.length) dismiss();
        }
        toast.success(hits.length === 1 ? "Scratched out" : `Scratched out ${hits.length} strokes`, { duration: 1500 });
        return "erased";
      }
    }
    const b = boundsOf(points);
    const g = groupRef.current;
    if (g && Date.now() - g.lastAt < GROUP_WINDOW_MS && continuesGroup(g.rect, b, typicalLetterHeight(groupStrokes(g)))) {
      return "writing";
    }
    // Small on screen = a letter, not a diagram
    if (Math.max(b.w, b.h) * optsRef.current.getZoom() < 56) return "writing";
    return null;
  }, [dismiss]);

  /** Call after a pen stroke was added to the board. */
  const afterCommit = useCallback((id: string, kind: string, points: Point[], color: string) => {
    if (!WRITING_KINDS.has(kind)) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    const b = boundsOf(points);
    const now = Date.now();
    let g = groupRef.current;
    if (g && now - g.lastAt < GROUP_WINDOW_MS && continuesGroup(g.rect, b, typicalLetterHeight(groupStrokes(g)))) {
      g.ids.push(id);
      g.rect = unionRect(g.rect, b);
      g.lastAt = now;
    } else {
      g = { id: uid(), ids: [id], rect: b, lastAt: now, color };
      groupRef.current = g;
      setChip(null);
    }
    scheduleRecognition(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The pen touched the board: hold off auto-convert while a stroke is being drawn. */
  const penDown = useCallback(() => {
    penDownRef.current = true;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = null;
  }, []);

  /** The pen lifted (stroke committed, erased or discarded). */
  const penUp = useCallback(() => {
    penDownRef.current = false;
    lastUpRef.current = Date.now();
    // Re-arm auto-convert for a recognised group whose stroke was discarded (tap, scratch-out…)
    const g = groupRef.current;
    if (g && useInk.getState().autoType && resultRef.current?.groupId === g.id) {
      scheduleAutoConvert(g, genRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Try reading the current word again (after an error). */
  const retry = useCallback(() => {
    const g = groupRef.current;
    if (g) scheduleRecognition(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimers(), []);

  return { chip, convert, dismiss, retry, beforeCommit, afterCommit, penDown, penUp };
}

/** The floating "recognised text" pill above the word being written. */
export function InkChip({
  chip,
  camera,
  onConvert,
  onDismiss,
  onRetry,
}: {
  chip: InkChipState;
  camera: { x: number; y: number; zoom: number };
  onConvert: (overrideText?: string) => void;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  const autoType = useInk((s) => s.autoType);
  const livePreview = useInk((s) => s.livePreview);
  const writingLang = findLanguage(useInk((s) => s.language));
  const translateLive = useInk((s) => s.translateLive);
  const targetLang = findLanguage(useInk((s) => s.translateTo));
  const openTranslatePicker = useInk((s) => s.openTranslatePicker);
  const openWritingPicker = useInk((s) => s.setLangPickerOpen);
  // In translate mode the language pill shows (and changes) the target language
  const currentLang = translateLive ? targetLang : writingLang;
  const setLangPickerOpen = (open: boolean) => (translateLive ? openTranslatePicker() : openWritingPicker(open));

  // Watchdog timer: If stuck in busy state without text, auto-dismiss
  useEffect(() => {
    if (chip?.busy && !chip?.text) {
      // The recogniser gives up after 20 s and reports an error; this is only a safety net
      const timer = setTimeout(() => {
        onDismiss();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [chip?.busy, chip?.text, onDismiss]);

  if (!livePreview) return null;
  if (!chip) return null;
  const screenX = chip.rect.x * camera.zoom + camera.x;
  const screenY = chip.rect.y * camera.zoom + camera.y;
  const isNearTop = screenY < 90;
  const left = Math.max(8, screenX);
  const top = isNearTop
    ? screenY + chip.rect.h * camera.zoom + 8
    : Math.max(76, screenY - 8);

  if (chip.error) {
    return (
      <div
        data-testid="ink-chip"
        data-state="error"
        role="alert"
        onPointerDown={(e) => e.stopPropagation()}
        className={`pointer-events-auto absolute z-30 flex items-center gap-1.5 rounded-2xl bg-rose-600/95 py-1 pl-2 pr-1 text-white shadow-xl ring-1 ring-white/15 backdrop-blur animate-in fade-in-0 zoom-in-95 duration-150 select-none ${
          isNearTop ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ left, top, maxWidth: `min(360px, calc(100vw - ${left}px - 8px))` }}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px] font-medium leading-snug">{chip.error}</span>
        {/* Quick language switch button on error pill */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setLangPickerOpen(true);
          }}
          className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 hover:bg-white/30 transition-colors cursor-pointer shrink-0"
          title="Switch handwriting language and retry"
        >
          <Languages className="h-2.5 w-2.5" />
          <span className="max-w-[50px] truncate">{currentLang.nativeName || currentLang.name}</span>
          <span className="text-[8px] opacity-70">▼</span>
        </button>
        {onRetry && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/30 active:scale-95 cursor-pointer"
          >
            <RotateCw className="h-3 w-3" />
            Retry
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Keep as handwriting"
          className="shrink-0 rounded-full p-1 opacity-80 hover:opacity-100 hover:bg-white/15 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="ink-chip"
      onPointerDown={(e) => {
        // Stop canvas from drawing or dragging underneath when touching the pill area
        e.stopPropagation();
      }}
      className={`pointer-events-auto absolute z-30 flex items-center gap-1.5 rounded-full bg-slate-900/95 py-1 px-1.5 text-white shadow-xl ring-1 ring-white/15 backdrop-blur animate-in fade-in-0 zoom-in-95 duration-150 dark:bg-slate-100/95 dark:text-slate-900 select-none ${
        isNearTop ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ left, top, maxWidth: `min(440px, calc(100vw - ${left}px - 8px))` }}
    >
      {/* Primary convert button: fires on clean tap (onClick), NOT on palm/touch-down */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (chip.text) onConvert();
        }}
        disabled={!chip.text}
        aria-label={chip.text ? `Convert to text: ${chip.text}` : (chip.busyText ?? "Reading handwriting")}
        className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/15 disabled:opacity-80 active:scale-95 transition-all cursor-pointer"
        title={autoType ? "Auto-converting… Tap to convert now" : "Tap to convert handwriting to text"}
      >
        {chip.busy && !chip.text ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-orange-400" />
        ) : (
          <Type className="h-3.5 w-3.5 shrink-0 text-sky-300 dark:text-sky-600" />
        )}
        {chip.text && chip.translatedTo ? (
          <span className="flex min-w-0 items-baseline gap-1">
            {chip.original && (
              <span className="max-w-[90px] truncate text-[10px] font-medium opacity-70">{chip.original} →</span>
            )}
            <span
              className="max-w-[180px] truncate text-sm"
              style={{ fontFamily: fontStack(scriptFor(chip.translatedTo).font) }}
              dir="auto"
            >
              {chip.text}
            </span>
          </span>
        ) : (
          <span className="truncate max-w-[140px] text-xs font-bold">{chip.text ?? chip.busyText ?? "Reading…"}</span>
        )}
        {chip.text && (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />
        )}
      </button>

      {/* Alternative candidate choices if available */}
      {chip.alternatives && chip.alternatives.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[120px]">
          {chip.alternatives.slice(0, 2).map((alt) => (
            <button
              key={alt}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onConvert(alt);
              }}
              className="rounded-full px-1.5 py-0.5 text-[11px] font-medium bg-white/5 hover:bg-white/15 dark:bg-black/5 dark:hover:bg-black/10 text-slate-300 dark:text-slate-700 active:scale-95 transition-all cursor-pointer truncate max-w-[60px]"
              title={`Convert as: ${alt}`}
            >
              {alt}
            </button>
          ))}
        </div>
      )}

      {/* Current language pill (tap to change handwriting language instantly) */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setLangPickerOpen(true);
        }}
        className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-orange-300 dark:text-orange-700 hover:bg-white/10 dark:hover:bg-black/5 transition-colors cursor-pointer shrink-0"
        title="Tap to switch handwriting language"
      >
        <Languages className="h-2.5 w-2.5" />
        <span className="max-w-[60px] truncate">
          {translateLive ? "→ " : ""}
          {currentLang.nativeName || currentLang.name}
        </span>
        <span className="text-[8px] opacity-70">▼</span>
      </button>

      {/* Dismiss button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Keep as handwriting"
        className="rounded-full p-1 opacity-70 hover:opacity-100 hover:bg-white/10 dark:hover:bg-black/5 active:scale-90 transition-transform cursor-pointer"
        title="Keep as handwriting"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
