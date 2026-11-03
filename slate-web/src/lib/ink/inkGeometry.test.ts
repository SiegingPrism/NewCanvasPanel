import { describe, it, expect } from "vitest";
import {
  boundsOf,
  continuesGroup,
  scratchOutTargets,
  clusterIntoLines,
  textBoxForInk,
  typicalLetterHeight,
  type InkStroke,
} from "./inkGeometry";

const letter = (id: string, x: number, y: number, w = 14, h = 20): InkStroke => ({
  id,
  points: Array.from({ length: 12 }, (_, i) => ({
    x: x + (w * i) / 11,
    y: y + h / 2 + Math.sin(i) * (h / 2),
  })),
});

describe("continuesGroup", () => {
  const word = boundsOf(letter("a", 100, 100).points.concat(letter("b", 118, 100).points));
  it("joins the next letter on the same line", () => {
    expect(continuesGroup(word, boundsOf(letter("c", 140, 102).points), 20)).toBe(true);
  });
  it("joins the next word after a normal space", () => {
    expect(continuesGroup(word, boundsOf(letter("d", 165, 101).points), 20)).toBe(true);
  });
  it("joins an i-dot just above the line", () => {
    expect(continuesGroup(word, { x: 120, y: 88, w: 3, h: 3 }, 20)).toBe(true);
  });
  it("does not join a stroke on the next line", () => {
    expect(continuesGroup(word, boundsOf(letter("e", 100, 150).points), 20)).toBe(false);
  });
  it("joins a letter written along a slanted trajectory (diagonal handwriting)", () => {
    // word is at x: 100..148, y: 100..120. Next letter 'd' is written slanted downwards at x: 160, y: 128
    expect(continuesGroup(word, { x: 160, y: 128, w: 14, h: 22 }, 20)).toBe(true);
  });
  it("does not join a stroke far to the right", () => {
    expect(continuesGroup(word, boundsOf(letter("f", 400, 100).points), 20)).toBe(false);
  });
});

describe("scratchOutTargets", () => {
  const words: InkStroke[] = [letter("w1", 100, 100), letter("w2", 118, 100), letter("w3", 136, 100), letter("other", 100, 300)];
  const scribble = (x0: number, x1: number, y0: number, y1: number) =>
    Array.from({ length: 9 }, (_, i) => ({ x: i % 2 ? x1 : x0, y: y0 + ((y1 - y0) * i) / 8 })).flatMap((p, i, a) =>
      i ? Array.from({ length: 5 }, (_, k) => ({ x: a[i - 1].x + ((p.x - a[i - 1].x) * (k + 1)) / 5, y: a[i - 1].y + ((p.y - a[i - 1].y) * (k + 1)) / 5 })) : [p],
    );
  it("erases the strokes a scribble covers", () => {
    expect(scratchOutTargets(scribble(96, 156, 100, 120), words).sort()).toEqual(["w1", "w2", "w3"]);
  });
  it("leaves strokes outside the scribble alone", () => {
    expect(scratchOutTargets(scribble(96, 156, 100, 120), words)).not.toContain("other");
  });
  it("is not triggered by a normal stroke", () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: 96 + i * 3, y: 110 }));
    expect(scratchOutTargets(line, words)).toEqual([]);
  });
});

describe("clusterIntoLines", () => {
  it("splits two lines of writing into two clusters", () => {
    const strokes = [letter("a", 100, 100), letter("b", 118, 100), letter("c", 100, 160), letter("d", 118, 160)];
    const lines = clusterIntoLines(strokes).map((c) => c.map((s) => s.id).sort());
    expect(lines).toHaveLength(2);
    expect(lines).toContainEqual(["a", "b"]);
    expect(lines).toContainEqual(["c", "d"]);
  });
  it("keeps separated words on the same line in a single line cluster", () => {
    // "hello" (a at 100, b at 116) ... 60px gap ... "world" (c at 190, d at 206)
    const strokes = [letter("a", 100, 100), letter("b", 116, 100), letter("c", 190, 100), letter("d", 206, 100)];
    const lines = clusterIntoLines(strokes);
    expect(lines).toHaveLength(1);
    expect(lines[0].map((s) => s.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("textBoxForInk", () => {
  it("sizes text to the handwriting and keeps it where the ink was", () => {
    const box = textBoxForInk({ x: 100, y: 100, w: 120, h: 30 }, "hello", 24);
    expect(box.x).toBe(100);
    expect(box.fontSize).toBeGreaterThanOrEqual(20);
    expect(box.fontSize).toBeLessThanOrEqual(30);
    expect(box.y + box.h / 2).toBeCloseTo(115, 0);
  });
  it("uses the median letter height", () => {
    const bar = (id: string, h: number): InkStroke => ({ id, points: [{ x: 0, y: 0 }, { x: 2, y: h / 2 }, { x: 0, y: h }] });
    expect(typicalLetterHeight([bar("a", 20), bar("b", 22), bar("c", 60), bar("dot", 3)])).toBe(22);
  });
});
