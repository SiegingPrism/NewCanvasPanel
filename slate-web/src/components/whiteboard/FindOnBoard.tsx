/**
 * "Find on board": searches typed text, notes, cards and recognised handwriting
 * on the current page, and jumps to each match.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, PenLine, Search, Type, X } from "lucide-react";
import type { CanvasObject, Point } from "@/lib/whiteboard/types";
import { WRITING_KINDS, clusterIntoLines, strokesBounds, type InkStroke, type Rect } from "@/lib/ink/inkGeometry";
import { recognizeInk, recognitionAvailable } from "@/lib/ink/recognizer";
import { cn } from "@/lib/utils";

export type FindHit = { key: string; text: string; rect: Rect; handwriting: boolean };

type StrokeLike = Extract<CanvasObject, { points: Point[] }>;
const isStroke = (o: CanvasObject): o is StrokeLike =>
  Array.isArray((o as { points?: unknown }).points) && o.kind !== "shape";

const TEXT_FIELDS = ["text", "translatedFrom", "label", "title", "front", "back", "question", "topic", "latex", "solution"] as const;

/** Every searchable piece of text on a page, with where it is. */
export function searchableItems(objects: CanvasObject[], boundsOf: (o: CanvasObject) => Rect): FindHit[] {
  const items: FindHit[] = [];
  const groups = new Map<string, StrokeLike[]>();
  for (const o of objects) {
    if (isStroke(o)) {
      if (o.inkGroup) groups.set(o.inkGroup, [...(groups.get(o.inkGroup) || []), o]);
      continue;
    }
    const rec = o as unknown as Record<string, unknown>;
    const parts = TEXT_FIELDS.map((f) => rec[f]).filter((v): v is string => typeof v === "string" && !!v.trim());
    if (parts.length) items.push({ key: o.id, text: parts.join(" · "), rect: boundsOf(o), handwriting: false });
  }
  for (const [gid, strokes] of groups) {
    const text = strokes.find((s) => s.inkText)?.inkText;
    if (text) items.push({ key: gid, text, rect: strokesBounds(strokes), handwriting: true });
  }
  return items;
}

export function matchItems(items: FindHit[], query: string): FindHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return items
    .filter((it) => {
      const t = it.text.toLowerCase();
      return words.every((w) => t.includes(w));
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function FindOnBoard({
  open,
  onClose,
  getObjects,
  setObjects,
  boundsOf,
  onFocus,
}: {
  open: boolean;
  onClose: () => void;
  getObjects: () => CanvasObject[];
  setObjects: (o: CanvasObject[]) => void;
  boundsOf: (o: CanvasObject) => Rect;
  onFocus: (rect: Rect) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setVersion((v) => v + 1);
    } else {
      cancelRef.current = true;
    }
  }, [open]);

  const unreadLines = useMemo(() => {
    if (!open) return [] as InkStroke[][];
    const ink = getObjects().filter((o): o is StrokeLike => isStroke(o) && WRITING_KINDS.has(o.kind) && !o.inkGroup);
    return clusterIntoLines(ink.map((o) => ({ id: o.id, points: o.points })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, version]);

  /** Recognise handwriting that was written before recognition existed (or offline). */
  const readHandwriting = async (lines: InkStroke[][]) => {
    if (!lines.length || reading) return;
    cancelRef.current = false;
    const batch = lines.slice(0, 15); // each line is one online AI call; cap per tap
    setReading({ done: 0, total: batch.length });
    for (let i = 0; i < batch.length; i++) {
      if (cancelRef.current) break;
      const res = await recognizeInk(batch[i]);
      if (res?.text) {
        const ids = new Set(batch[i].map((s) => s.id));
        const gid = uid();
        const first = batch[i][0].id;
        setObjects(
          getObjects().map((o) =>
            ids.has(o.id) ? ({ ...o, inkGroup: gid, inkText: o.id === first ? res.text : undefined } as CanvasObject) : o,
          ),
        );
      }
      setReading({ done: i + 1, total: batch.length });
    }
    setReading(null);
    setVersion((v) => v + 1);
  };

  const hits = useMemo(
    () => (open ? matchItems(searchableItems(getObjects(), boundsOf), query) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, query, version, reading?.done],
  );

  useEffect(() => {
    setIndex(0);
    if (hits.length) onFocus(hits[0].rect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!open) return null;

  const go = (d: number) => {
    if (!hits.length) return;
    const n = (index + d + hits.length) % hits.length;
    setIndex(n);
    onFocus(hits[n].rect);
  };

  return (
    <div
      data-testid="find-on-board"
      className="pointer-events-auto absolute left-1/2 top-[max(4.25rem,calc(var(--sat,env(safe-area-inset-top,0px))+3.75rem))] z-40 w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl bg-card/95 p-2 shadow-2xl ring-1 ring-border backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2 duration-150"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <Search className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
            if (e.key === "Escape") onClose();
          }}
          placeholder="Find text and handwriting"
          aria-label="Find on board"
          className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground" data-testid="find-count">
            {hits.length ? `${index + 1}/${hits.length}` : "0"}
          </span>
        )}
        <button type="button" aria-label="Previous match" onClick={() => go(-1)} disabled={!hits.length} className="rounded-md p-1 hover:bg-accent disabled:opacity-40">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Next match" onClick={() => go(1)} disabled={!hits.length} className="rounded-md p-1 hover:bg-accent disabled:opacity-40">
          <ChevronDown className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Close find" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      {query && hits.length > 0 && (
        <ul className="mt-1.5 max-h-48 overflow-y-auto border-t border-border pt-1.5">
          {hits.slice(0, 30).map((h, i) => (
            <li key={h.key}>
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  onFocus(h.rect);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent",
                  i === index && "bg-accent",
                )}
              >
                {h.handwriting ? (
                  <PenLine className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-label="Handwriting" />
                ) : (
                  <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{h.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(reading || unreadLines.length > 0) && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-border px-1.5 pt-1.5 text-[11px] text-muted-foreground">
          {reading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                Reading handwriting… {reading.done}/{reading.total}
              </span>
            </>
          ) : recognitionAvailable() ? (
            <>
              <PenLine className="h-3 w-3" />
              <span className="flex-1">
                {unreadLines.length} line{unreadLines.length === 1 ? "" : "s"} of handwriting not searchable yet
              </span>
              <button type="button" onClick={() => readHandwriting(unreadLines)} className="font-medium text-primary hover:underline">
                Read it
              </button>
            </>
          ) : (
            <span>Handwriting search needs AI — sign in or add a Gemini key in Settings.</span>
          )}
        </div>
      )}
    </div>
  );
}
