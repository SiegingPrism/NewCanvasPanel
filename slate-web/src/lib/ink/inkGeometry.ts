/**
 * Pure geometry for handwriting features: grouping strokes into a word/line,
 * finding what a scratch-out covers, and sizing the typed text that replaces ink.
 * No React, no canvas — unit-tested in inkGeometry.test.ts.
 */
import { isScribble } from "@/lib/whiteboard/shapeRecognition";

export type InkPoint = { x: number; y: number; t?: number };
export type InkStroke = { id: string; points: InkPoint[] };
export type Rect = { x: number; y: number; w: number; h: number };

/** Pen kinds that count as writing (highlighters, neon, rainbow … are decoration). */
export const WRITING_KINDS = new Set(["pen", "fountain", "pencil", "marker", "crayon"]);

export function boundsOf(points: InkPoint[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function strokesBounds(strokes: InkStroke[]): Rect {
  return boundsOf(strokes.flatMap((s) => s.points));
}

function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * Does `stroke` continue the word/line in `group`? True when it sits on the same
 * line (vertical overlap, or a dot/accent just above) and is not too far to the
 * left or right. `lineHeight` is the group's typical letter height.
 */
export function continuesGroup(group: Rect, stroke: Rect, lineHeight: number): boolean {
  const lh = Math.max(16, lineHeight);
  const vOverlap = overlap1d(group.y, group.y + group.h, stroke.y, stroke.y + stroke.h);
  const sameLine =
    vOverlap >= Math.min(group.h, stroke.h) * 0.3 ||
    // i-dots, t-crosses, accents: small marks just above or inside the line
    (stroke.y + stroke.h >= group.y - lh * 0.8 && stroke.y <= group.y + group.h);
  if (!sameLine) return false;
  // Horizontal gap to the group (0 when overlapping)
  const gap =
    stroke.x > group.x + group.w
      ? stroke.x - (group.x + group.w)
      : group.x > stroke.x + stroke.w
        ? group.x - (stroke.x + stroke.w)
        : 0;
  return gap <= Math.max(60, lh * 1.6);
}

/**
 * Does `stroke` continue the current line of writing/sentence? True when it sits on the
 * same horizontal line with normal word spacing (gap up to 3.2x letter height).
 */
export function continuesLine(group: Rect, stroke: Rect, lineHeight: number): boolean {
  const lh = Math.max(16, lineHeight);
  const vOverlap = overlap1d(group.y, group.y + group.h, stroke.y, stroke.y + stroke.h);
  const sameLine =
    vOverlap >= Math.min(group.h, stroke.h) * 0.25 ||
    (stroke.y + stroke.h >= group.y - lh * 1.0 && stroke.y <= group.y + group.h + lh * 0.4);
  if (!sameLine) return false;
  const gap =
    stroke.x > group.x + group.w
      ? stroke.x - (group.x + group.w)
      : group.x > stroke.x + stroke.w
        ? group.x - (stroke.x + stroke.w)
        : 0;
  return gap <= Math.max(140, lh * 3.2);
}

/** Typical letter height of a set of strokes (median stroke height, ignoring dots). */
export function typicalLetterHeight(strokes: InkStroke[]): number {
  const hs = strokes
    .map((s) => boundsOf(s.points).h)
    .filter((h) => h > 6)
    .sort((a, b) => a - b);
  if (!hs.length) return 24;
  return hs[Math.floor(hs.length / 2)];
}

/**
 * A scratch-out gesture: a scribble (see isScribble) drawn over existing ink.
 * Returns the ids of strokes it erases — a stroke is erased when at least 45% of
 * its bounding box lies under the scribble's bounding box. Empty = not a scratch-out.
 */
export function scratchOutTargets(scribble: InkPoint[], candidates: InkStroke[]): string[] {
  if (!isScribble(scribble)) return [];
  const sb = boundsOf(scribble);
  // Pad a little: people rarely scribble exactly over the whole word
  const pad = Math.max(4, Math.min(sb.w, sb.h) * 0.15);
  const area = { x: sb.x - pad, y: sb.y - pad, w: sb.w + pad * 2, h: sb.h + pad * 2 };
  const hits: string[] = [];
  for (const s of candidates) {
    const b = boundsOf(s.points);
    const bw = Math.max(1, b.w);
    const bh = Math.max(1, b.h);
    const ox = overlap1d(area.x, area.x + area.w, b.x, b.x + bw);
    const oy = overlap1d(area.y, area.y + area.h, b.y, b.y + bh);
    if ((ox * oy) / (bw * bh) >= 0.45) hits.push(s.id);
  }
  return hits;
}

/**
 * Split strokes into lines of writing (for indexing old ink): strokes are sorted
 * left-to-right and joined into a cluster while they continue its line.
 */
export function clusterIntoLines(strokes: InkStroke[]): InkStroke[][] {
  const sorted = strokes
    .map((s) => ({ s, b: boundsOf(s.points) }))
    .filter((x) => x.b.w + x.b.h > 2)
    .sort((a, b) => a.b.x - b.b.x);
  const clusters: { strokes: InkStroke[]; rect: Rect }[] = [];
  for (const { s, b } of sorted) {
    let placed = false;
    for (const c of clusters) {
      const lh = typicalLetterHeight(c.strokes);
      if (continuesLine(c.rect, b, lh) || continuesGroup(c.rect, b, lh)) {
        c.strokes.push(s);
        c.rect = unionRect(c.rect, b);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ strokes: [s], rect: b });
  }
  // Sort clusters top-to-bottom so lines appear in natural reading order
  clusters.sort((a, b) => a.rect.y - b.rect.y);
  return clusters.map((c) => c.strokes);
}

/** Where and how big the typed text should be so it sits where the ink was. */
export function textBoxForInk(ink: Rect, text: string, letterHeight: number): Rect & { fontSize: number } {
  const fontSize = Math.round(Math.min(120, Math.max(14, letterHeight * 1.05)));
  const lines = text.split("\n");
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const w = Math.max(ink.w, longest * fontSize * 0.56) + 8;
  const h = Math.max(fontSize * 1.35 * lines.length, 24);
  // Vertically centre the text on the ink
  const y = ink.y + ink.h / 2 - h / 2;
  return { x: ink.x, y, w, h, fontSize };
}
