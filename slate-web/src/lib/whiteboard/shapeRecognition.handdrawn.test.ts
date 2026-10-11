/**
 * Regression tests on realistic hand-drawn strokes: wobbly, overshooting or not quite closed,
 * random start point, uneven speed, rounded corners, and a flick at the end of some strokes.
 * Generated from fixed seeds, so results are deterministic.
 */
import { describe, it, expect } from "vitest";
import { recognizeShape } from "./shapeRecognition";

// Realistic hand-drawn stroke generator (seeded) for shape-recognition tests.
type P = { x: number; y: number; p: number };
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const U = (r: () => number, a: number, b: number) => a + (b - a) * r();

/** Walk a closed polyline path given as a function t∈[0,1) -> point, like a hand would. */
function handWalk(
  r: () => number,
  at: (t: number) => { x: number; y: number },
  opts: { overshoot: number; n: number; jitter: number; hook: boolean },
) {
  const pts: P[] = [];
  const start = r();
  const total = 1 + opts.overshoot; // >1 overshoots past start, <1 leaves a gap
  // non-uniform speed: slow at start/end, fast mid-stroke
  for (let i = 0; i <= opts.n; i++) {
    const u = i / opts.n;
    const eased = u + 0.06 * Math.sin(2 * Math.PI * u) * (r() * 0.5 + 0.5);
    const t = (start + eased * total) % 1;
    const q = at((t + 1) % 1);
    pts.push({
      x: q.x + U(r, -opts.jitter, opts.jitter),
      y: q.y + U(r, -opts.jitter, opts.jitter),
      p: 0.5,
    });
  }
  if (opts.hook) {
    const a = pts[pts.length - 1],
      b = pts[pts.length - 4];
    const dx = a.x - b.x,
      dy = a.y - b.y,
      L = Math.hypot(dx, dy) || 1;
    for (let k = 1; k <= 4; k++)
      pts.push({
        x: a.x + (dx / L) * k * 3 + (-dy / L) * k * 2.5,
        y: a.y + (dy / L) * k * 3 + (dx / L) * k * 2.5,
        p: 0.5,
      });
  }
  return pts;
}

function handCircle(seed: number, aspect = 1) {
  const r = rng(seed);
  const R = U(r, 60, 160),
    ar = aspect * U(r, 0.88, 1.12),
    rot = U(r, 0, Math.PI);
  const ph1 = U(r, 0, 6),
    ph2 = U(r, 0, 6),
    w1 = U(r, 0.02, 0.07),
    w2 = U(r, 0.01, 0.04);
  const dir = r() < 0.5 ? 1 : -1;
  const at = (t: number) => {
    const th = dir * t * 2 * Math.PI;
    const rr = R * (1 + w1 * Math.sin(2 * th + ph1) + w2 * Math.sin(3 * th + ph2));
    const x = rr * Math.cos(th) * ar,
      y = rr * Math.sin(th);
    return {
      x: 300 + x * Math.cos(rot) - y * Math.sin(rot),
      y: 300 + x * Math.sin(rot) + y * Math.cos(rot),
    };
  };
  return handWalk(r, at, {
    overshoot: U(r, -0.06, 0.12),
    n: Math.round(U(r, 40, 120)),
    jitter: U(r, 0.5, 2.5),
    hook: r() < 0.3,
  });
}

/** Closed polygon with slightly rounded corners and wobbly edges. */
function handPolygon(seed: number, verts: { x: number; y: number }[], tiltDeg = 0) {
  const r = rng(seed);
  const rot = ((U(r, -4, 4) + tiltDeg) * Math.PI) / 180;
  const sc = U(r, 0.7, 1.5);
  const V = verts.map((v) => ({ x: v.x * sc, y: v.y * sc }));
  const segL = V.map((v, i) =>
    Math.hypot(V[(i + 1) % V.length].x - v.x, V[(i + 1) % V.length].y - v.y),
  );
  const per = segL.reduce((a, b) => a + b, 0);
  const round = U(r, 0, 0.08) * Math.min(...segL);
  const bow = segL.map(() => U(r, -0.025, 0.025));
  const at = (t: number) => {
    let d = t * per,
      i = 0;
    while (d > segL[i] && i < V.length - 1) {
      d -= segL[i];
      i++;
    }
    const a = V[i],
      b = V[(i + 1) % V.length],
      f = d / segL[i];
    let x = a.x + (b.x - a.x) * f,
      y = a.y + (b.y - a.y) * f;
    // bow edge outward/inward
    const nx = -(b.y - a.y) / segL[i],
      ny = (b.x - a.x) / segL[i];
    const bulge = Math.sin(Math.PI * f) * bow[i] * segL[i];
    x += nx * bulge;
    y += ny * bulge;
    // round the corner near the end of the edge
    const distEnd = (1 - f) * segL[i];
    if (distEnd < round) {
      const c = V[(i + 2) % V.length],
        k = (round - distEnd) / round;
      const L2 = Math.hypot(c.x - b.x, c.y - b.y);
      x += ((c.x - b.x) / L2) * k * k * round * 0.5;
      y += ((c.y - b.y) / L2) * k * k * round * 0.5;
    }
    return {
      x: 300 + x * Math.cos(rot) - y * Math.sin(rot),
      y: 300 + x * Math.sin(rot) + y * Math.cos(rot),
    };
  };
  return handWalk(r, at, {
    overshoot: U(r, -0.04, 0.06),
    n: Math.round(U(r, 50, 140)),
    jitter: U(r, 0.5, 2),
    hook: r() < 0.2,
  });
}

const SHAPES: Record<string, (seed: number) => P[]> = {
  circle: (s) => handCircle(s, 1),
  "ellipse (wide)": (s) => handCircle(s, 1.9),
  square: (s) =>
    handPolygon(s, [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ]),
  rectangle: (s) =>
    handPolygon(s, [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 140 },
      { x: 0, y: 140 },
    ]),
  "rect tilted 25°": (s) =>
    handPolygon(
      s,
      [
        { x: 0, y: 0 },
        { x: 260, y: 0 },
        { x: 260, y: 140 },
        { x: 0, y: 140 },
      ],
      25,
    ),
  triangle: (s) =>
    handPolygon(s, [
      { x: 100, y: 0 },
      { x: 210, y: 180 },
      { x: -10, y: 180 },
    ]),
  "right triangle": (s) =>
    handPolygon(s, [
      { x: 0, y: 0 },
      { x: 0, y: 180 },
      { x: 220, y: 180 },
    ]),
  diamond: (s) =>
    handPolygon(s, [
      { x: 100, y: 0 },
      { x: 200, y: 110 },
      { x: 100, y: 220 },
      { x: 0, y: 110 },
    ]),
  pentagon: (s) =>
    handPolygon(
      s,
      Array.from({ length: 5 }, (_, i) => ({
        x: 110 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
        y: 110 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
      })),
    ),
  hexagon: (s) =>
    handPolygon(
      s,
      Array.from({ length: 6 }, (_, i) => ({
        x: 110 * Math.cos((i * Math.PI) / 3),
        y: 110 * Math.sin((i * Math.PI) / 3),
      })),
    ),
};

function messyCircle(seed: number): P[] {
  const r = rng(seed);
  const R = U(r, 40, 150);
  const amp = U(r, 0.1, 0.14);
  const ph = U(r, 0, 6);
  const n = Math.round(U(r, 25, 70));
  const over = U(r, -0.15, 0.2);
  const start = r();
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (start + (i / n) * (1 + over)) % 1;
    const th = t * 2 * Math.PI;
    const rr = R * (1 + amp * Math.sin(2 * th + ph) + 0.05 * Math.sin(5 * th));
    pts.push({
      x: 300 + rr * Math.cos(th) + U(r, -3, 3),
      y: 300 + rr * Math.sin(th) + U(r, -3, 3),
      p: 0.5,
    });
  }
  return pts;
}

function tally(gen: (seed: number) => P[], n = 60): Record<string, number> {
  const t: Record<string, number> = {};
  for (let s = 1; s <= n; s++) {
    const res = recognizeShape(gen(s * 7919 + 13), "#000", 2);
    const k = res && res.kind === "shape" ? res.shape : "null";
    t[k] = (t[k] || 0) + 1;
  }
  return t;
}

const share = (t: Record<string, number>, ...keys: string[]) =>
  keys.reduce((a, k) => a + (t[k] || 0), 0) / Object.values(t).reduce((a, b) => a + b, 0);

describe("shape recognition on realistic hand-drawn strokes", () => {
  it("recognizes hand-drawn circles as circles, never as rectangles", () => {
    const t = tally(SHAPES.circle);
    expect(share(t, "circle")).toBeGreaterThanOrEqual(0.95);
    expect(t.rect || 0).toBe(0);
  });

  it("recognizes messy, wobbly circles as circles, never as rectangles", () => {
    const t = tally(messyCircle);
    expect(share(t, "circle")).toBeGreaterThanOrEqual(0.85);
    expect(t.rect || 0).toBe(0);
  });

  it("recognizes wide ellipses as ellipses (circle shape with unequal axes)", () => {
    expect(share(tally(SHAPES["ellipse (wide)"]), "circle")).toBeGreaterThanOrEqual(0.95);
  });

  it("recognizes squares, rectangles and tilted rectangles", () => {
    expect(share(tally(SHAPES.square), "rect")).toBeGreaterThanOrEqual(0.95);
    expect(share(tally(SHAPES.rectangle), "rect")).toBeGreaterThanOrEqual(0.95);
    expect(share(tally(SHAPES["rect tilted 25°"]), "rect")).toBeGreaterThanOrEqual(0.95);
  });

  it("recognizes triangles and right triangles", () => {
    expect(share(tally(SHAPES.triangle), "triangle")).toBeGreaterThanOrEqual(0.95);
    expect(share(tally(SHAPES["right triangle"]), "right-triangle")).toBeGreaterThanOrEqual(0.9);
  });

  it("recognizes diamonds, pentagons and hexagons", () => {
    expect(share(tally(SHAPES.diamond), "diamond")).toBeGreaterThanOrEqual(0.9);
    expect(share(tally(SHAPES.pentagon), "pentagon")).toBeGreaterThanOrEqual(0.9);
    expect(share(tally(SHAPES.hexagon), "hexagon")).toBeGreaterThanOrEqual(0.85);
  });

  it("keeps the drawn tilt of a rotated rectangle", () => {
    const res = recognizeShape(SHAPES["rect tilted 25°"](4242), "#000", 2);
    expect(res && res.kind === "shape" && res.shape).toBe("rect");
    if (res && res.kind === "shape") {
      expect(Math.abs((res.rotation ?? 0) * (180 / Math.PI))).toBeGreaterThan(15);
    }
  });
});
