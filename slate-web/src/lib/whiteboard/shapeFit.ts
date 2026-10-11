/**
 * Model-fitting recogniser for closed hand-drawn strokes.
 *
 * Instead of bounding-box thresholds, the stroke is cleaned into a single closed loop and
 * compared against candidate models (triangle, 4-gon, pentagon, hexagon, ellipse). The simplest
 * polygon that traces the stroke closely *and* has genuine corners wins; otherwise an ellipse is
 * used if it fits. Anything else returns null so the caller can try its special-shape detectors
 * (heart, star, cloud, cross, …).
 */
import type { Point, ShapeStroke } from "./types";

type Pt = { x: number; y: number };
type ShapeResult = Omit<ShapeStroke, "id">;

const DEG = 180 / Math.PI;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function resample(points: Pt[], n: number): Pt[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const d: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    d.push(d[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const L = d[d.length - 1];
  if (L === 0) return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = (L * i) / (n - 1);
    while (j < d.length - 2 && d[j + 1] < t) j++;
    const seg = d[j + 1] - d[j] || 1;
    const f = (t - d[j]) / seg;
    out.push({
      x: points[j].x + (points[j + 1].x - points[j].x) * f,
      y: points[j].y + (points[j + 1].y - points[j].y) * f,
    });
  }
  return out;
}

function area(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

function hull(pts: Pt[]): Pt[] {
  const s = pts.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function turning(c: Pt[], i: number, w: number): number {
  const n = c.length;
  const a = c[(i - w + n * 4) % n];
  const b = c[i];
  const d = c[(i + w) % n];
  let t = Math.atan2(d.y - b.y, d.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
  while (t > Math.PI) t -= 2 * Math.PI;
  while (t < -Math.PI) t += 2 * Math.PI;
  return t;
}

/** Interior angle at b (degrees) for the polygon corner a-b-c. */
function interiorAngle(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / m))) * DEG;
}

/** Line direction in degrees, folded into [0, 180). */
function lineAngle(a: Pt, b: Pt): number {
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * DEG;
  return ((ang % 180) + 180) % 180;
}

function angleDiff180(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
}

function bbox(pts: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------------------
// Loop analysis
// ---------------------------------------------------------------------------

/**
 * Cuts off overshoot past the starting point (and any end flick after it) so the stroke is a
 * single trace around the shape.
 */
function closeLoop(pts: Pt[]): Pt[] {
  const n = pts.length;
  const b = bbox(pts);
  const span = Math.max(b.w, b.h) || 1;
  let bestJ = n - 1;
  let bestD = Infinity;
  for (let j = Math.floor(n * 0.6); j < n; j++) {
    const dd = Math.hypot(pts[j].x - pts[0].x, pts[j].y - pts[0].y);
    if (dd < bestD) {
      bestD = dd;
      bestJ = j;
    }
  }
  return bestJ < n - 1 && bestD < 0.18 * span ? pts.slice(0, bestJ + 1) : pts;
}

interface PolyFit {
  err: number;
  minTurnDeg: number;
  verts: Pt[];
}

export interface LoopAnalysis {
  loop: Pt[];
  centroid: Pt;
  meanR: number;
  solidity: number;
  ellipseErr: number;
  /** minor / major axis (1 = perfectly round) */
  axisRatio: number;
  /** major axis direction, radians */
  axisAngle: number;
  semiMajor: number;
  semiMinor: number;
  polys: Record<3 | 4 | 5 | 6, PolyFit>;
  /** Share of the outline that is (nearly) straight. Circles ≈ 0, rectangles ≈ 0.5+. */
  flatFraction: number;
  /** Dominant straight-edge direction folded into [-45°, 45°), radians. */
  edgeAngle: number;
}

export function analyzeLoop(raw: Pt[], N = 96): LoopAnalysis {
  const trimmed = closeLoop(resample(raw, 160));
  const loop = resample([...trimmed, trimmed[0]], N + 1).slice(0, N);

  const cx = loop.reduce((a, p) => a + p.x, 0) / N;
  const cy = loop.reduce((a, p) => a + p.y, 0) / N;
  const meanR = loop.reduce((a, p) => a + Math.hypot(p.x - cx, p.y - cy), 0) / N || 1;
  const hullA = area(hull(loop));
  const solidity = hullA > 0 ? area(loop) / hullA : 1;

  // Ellipse via principal axes: normalise both axes, then measure how round the result is.
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of loop) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= N;
  syy /= N;
  sxy /= N;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = Math.max(1e-9, tr / 2 - disc);
  const axisAngle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ca = Math.cos(axisAngle);
  const sa = Math.sin(axisAngle);
  const s1 = Math.sqrt(l1);
  const s2 = Math.sqrt(l2);
  const rho = loop.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return Math.hypot((dx * ca + dy * sa) / s1, (-dx * sa + dy * ca) / s2);
  });
  const rhoMean = rho.reduce((a, r) => a + r, 0) / N || 1;
  const ellipseErr = rho.reduce((a, r) => a + Math.abs(r / rhoMean - 1), 0) / N;
  // Semi-axes: rhoMean is the normalised radius, so scale each std-dev by it.
  const semiMajor = s1 * rhoMean;
  const semiMinor = s2 * rhoMean;

  // Corner candidates: strongest cyclic turning peaks, kept apart from each other.
  const w = Math.max(2, Math.round(N / 32));
  const absT = loop.map((_, i) => Math.abs(turning(loop, i, w)));
  const order = absT.map((t, i) => [t, i] as const).sort((a, b) => b[0] - a[0]);
  const sep = Math.max(3, Math.round(N / 14));
  const cand: number[] = [];
  for (const [, i] of order) {
    if (cand.every((j) => Math.min(Math.abs(i - j), N - Math.abs(i - j)) >= sep)) cand.push(i);
    if (cand.length >= 6) break;
  }

  const polys = {} as LoopAnalysis["polys"];
  for (const k of [3, 4, 5, 6] as const) {
    if (cand.length < k) {
      polys[k] = { err: Infinity, minTurnDeg: 0, verts: [] };
      continue;
    }
    const idx = cand.slice(0, k).sort((a, b) => a - b);
    // Measured over a wider window so slightly rounded corners still count as corners.
    const minTurnDeg = Math.min(...idx.map((i) => Math.abs(turning(loop, i, w * 2)))) * DEG;
    const verts = idx.map((i) => loop[i]);
    let err = 0;
    for (let v = 0; v < k; v++) {
      const A = verts[v];
      const B = verts[(v + 1) % k];
      for (let i = idx[v]; i !== idx[(v + 1) % k]; i = (i + 1) % N) err += distToSeg(loop[i], A, B);
    }
    polys[k] = { err: err / N / meanR, minTurnDeg, verts };
  }

  // Straightness: a circle bends a little everywhere; a rectangle is flat along its sides.
  const wf = w * 2;
  const circleTurn = (2 * Math.PI * wf) / N;
  let flat = 0;
  const hist = new Array(30).fill(0); // 3° bins over a 90° period
  for (let i = 0; i < N; i++) {
    if (Math.abs(turning(loop, i, wf)) < circleTurn * 0.3) {
      flat++;
      const a = loop[i];
      const b = loop[(i + 1) % N];
      const deg = (((Math.atan2(b.y - a.y, b.x - a.x) * DEG) % 90) + 90) % 90;
      hist[Math.floor(deg / 3) % 30] += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  let bestBin = 0;
  for (let i = 1; i < 30; i++) {
    const sum = (k: number) => hist[(k + 29) % 30] + hist[k] + hist[(k + 1) % 30];
    if (sum(i) > sum(bestBin)) bestBin = i;
  }
  let edgeDeg = bestBin * 3 + 1.5;
  if (edgeDeg >= 45) edgeDeg -= 90;
  const flatFraction = flat / N;

  return {
    flatFraction,
    edgeAngle: edgeDeg / DEG,
    loop,
    centroid: { x: cx, y: cy },
    meanR,
    solidity,
    ellipseErr,
    axisRatio: s2 / s1,
    axisAngle,
    semiMajor,
    semiMinor,
    polys,
  };
}

// ---------------------------------------------------------------------------
// Thresholds (calibrated on realistic simulated hand-drawn strokes)
// ---------------------------------------------------------------------------

/** Max mean distance from stroke to polygon, as a fraction of the shape's mean radius. */
const POLY_MAX_ERR = 0.065;
/** A corner must turn at least this much, or it's just a wobble on a curve. */
const MIN_CORNER_TURN: Record<3 | 4 | 5 | 6, number> = { 3: 40, 4: 45, 5: 38, 6: 32 };
/** Max ellipse fit error for a confident circle / ellipse. */
const ELLIPSE_MAX_ERR = 0.1;
/** Shapes with deep dents (stars, hearts, clouds, crosses) are left to the special detectors. */
const MIN_SOLIDITY = 0.88;
/** A circle/ellipse has no dents at all (a heart's notch drops this to ~0.92). */
const ROUND_MIN_SOLIDITY = 0.95;
/** Round shapes are curved almost everywhere; rectangles are straight along ~40–55% of the outline. */
const ROUND_MAX_FLAT = 0.28;
const ROUNDED_RECT_MIN_FLAT = 0.35;
const ROUNDED_RECT_MAX_ELLIPSE_ERR = 0.14;
const SNAP_ROTATION_DEG = 8;

// ---------------------------------------------------------------------------
// Shape builders
// ---------------------------------------------------------------------------

function fromQuad(verts: Pt[], color: string, size: number): ShapeResult | null {
  const angles = verts.map((v, i) => interiorAngle(verts[(i + 3) % 4], v, verts[(i + 1) % 4]));
  const edgeAng = verts.map((v, i) => lineAngle(v, verts[(i + 1) % 4]));
  const b = bbox(verts);
  const box = { x: b.minX, y: b.minY, w: b.w, h: b.h };

  // Diamond: edges run diagonally (~45°) and the diagonals are roughly upright/level.
  const diagonalEdges = edgeAng.every((a) => angleDiff180(a, 45) < 18 || angleDiff180(a, 135) < 18);
  const diag1 = lineAngle(verts[0], verts[2]);
  const diag2 = lineAngle(verts[1], verts[3]);
  const diagsAxisAligned =
    Math.min(angleDiff180(diag1, 0), angleDiff180(diag1, 90)) < 18 &&
    Math.min(angleDiff180(diag2, 0), angleDiff180(diag2, 90)) < 18;
  if (diagonalEdges && diagsAxisAligned) {
    return { kind: "shape", shape: "diamond", color, size, ...box };
  }

  const rectangular = angles.every((a) => Math.abs(a - 90) < 22);
  if (rectangular) {
    // Orientation from the longest edge, folded into [-45°, 45°).
    let longest = 0;
    let longestLen = -1;
    for (let i = 0; i < 4; i++) {
      const L = Math.hypot(verts[(i + 1) % 4].x - verts[i].x, verts[(i + 1) % 4].y - verts[i].y);
      if (L > longestLen) {
        longestLen = L;
        longest = i;
      }
    }
    const raw = Math.atan2(
      verts[(longest + 1) % 4].y - verts[longest].y,
      verts[(longest + 1) % 4].x - verts[longest].x,
    );
    const quarter = Math.PI / 2;
    let rot = ((((raw + Math.PI / 4) % quarter) + quarter) % quarter) - Math.PI / 4;
    if (Math.abs(rot) * DEG < SNAP_ROTATION_DEG) rot = 0;

    // True side lengths: project the corners onto the rotated axes.
    const cx = verts.reduce((a, p) => a + p.x, 0) / 4;
    const cy = verts.reduce((a, p) => a + p.y, 0) / 4;
    const c = Math.cos(-rot);
    const s = Math.sin(-rot);
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of verts) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const u = dx * c - dy * s;
      const v = dx * s + dy * c;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    let w = Math.max(10, maxU - minU);
    let h = Math.max(10, maxV - minV);
    const ratio = w / h;
    if (ratio > 0.85 && ratio < 1.18) w = h = (w + h) / 2; // snap to a square
    return {
      kind: "shape",
      shape: "rect",
      color,
      size,
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rotation: rot === 0 ? undefined : rot,
    };
  }

  const parallel02 = angleDiff180(edgeAng[0], edgeAng[2]) < 12;
  const parallel13 = angleDiff180(edgeAng[1], edgeAng[3]) < 12;
  if (parallel02 && parallel13)
    return { kind: "shape", shape: "parallelogram", color, size, ...box };
  if (parallel02 || parallel13) return { kind: "shape", shape: "trapezoid", color, size, ...box };
  return null;
}

function fromTriangle(verts: Pt[], color: string, size: number): ShapeResult {
  const b = bbox(verts);
  const box = { x: b.minX, y: b.minY, w: Math.max(1, b.w), h: Math.max(1, b.h) };
  const angles = verts.map((v, i) => interiorAngle(verts[(i + 2) % 3], v, verts[(i + 1) % 3]));
  const rightIdx = angles.findIndex((a) => Math.abs(a - 90) < 12);

  // The renderer draws "right-triangle" with the right angle at the bottom-left and level/upright legs.
  if (rightIdx !== -1) {
    const r = verts[rightIdx];
    const legs = [verts[(rightIdx + 1) % 3], verts[(rightIdx + 2) % 3]].map((p) => lineAngle(r, p));
    const legsAxisAligned = legs.every(
      (a) => Math.min(angleDiff180(a, 0), angleDiff180(a, 90)) < 12,
    );
    const tol = 0.2 * Math.max(b.w, b.h);
    const atBottomLeft = Math.abs(r.x - b.minX) < tol && Math.abs(r.y - b.maxY) < tol;
    if (legsAxisAligned && atBottomLeft) {
      return { kind: "shape", shape: "right-triangle", color, size, ...box };
    }
  }

  // Any other triangle keeps its exact corners (stored relative to its box so it moves/resizes).
  return {
    kind: "shape",
    shape: "triangle",
    color,
    size,
    ...box,
    vertices: verts.map((p) => ({ x: (p.x - box.x) / box.w, y: (p.y - box.y) / box.h })) as Point[],
  };
}

function fromRegular(
  shape: "pentagon" | "hexagon",
  verts: Pt[],
  color: string,
  size: number,
): ShapeResult {
  const b = bbox(verts);
  const diam = Math.max(b.w, b.h);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return {
    kind: "shape",
    shape,
    color,
    size,
    x: cx - diam / 2,
    y: cy - diam / 2,
    w: diam,
    h: diam,
  };
}

/** Rectangle with rounded corners (or a fast stroke that cut its corners). */
function fromRoundedRect(a: LoopAnalysis, color: string, size: number): ShapeResult {
  let rot = a.edgeAngle;
  if (Math.abs(rot) * DEG < SNAP_ROTATION_DEG) rot = 0;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of a.loop) {
    const u = p.x * c - p.y * s;
    const v = p.x * s + p.y * c;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  // Centre in rotated space, mapped back to canvas space.
  const mu = (minU + maxU) / 2;
  const mv = (minV + maxV) / 2;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const cx = mu * cr - mv * sr;
  const cy = mu * sr + mv * cr;
  let w = Math.max(10, maxU - minU);
  let h = Math.max(10, maxV - minV);
  const ratio = w / h;
  if (ratio > 0.85 && ratio < 1.18) w = h = (w + h) / 2;
  return {
    kind: "shape",
    shape: "rect",
    color,
    size,
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    rotation: rot === 0 ? undefined : rot,
  };
}

function isRound(a: LoopAnalysis, maxErr: number): boolean {
  return (
    a.ellipseErr <= maxErr && a.flatFraction < ROUND_MAX_FLAT && a.solidity >= ROUND_MIN_SOLIDITY
  );
}

function fromEllipse(a: LoopAnalysis, color: string, size: number): ShapeResult {
  const { centroid: c } = a;
  if (a.axisRatio > 0.82) {
    const d = 2 * a.meanR;
    return {
      kind: "shape",
      shape: "circle",
      color,
      size,
      x: c.x - d / 2,
      y: c.y - d / 2,
      w: d,
      h: d,
    };
  }
  // Ellipse: keep the drawn tilt unless it's nearly level or upright.
  const deg = (((a.axisAngle * DEG) % 180) + 180) % 180; // 0..180
  let w = 2 * a.semiMajor;
  let h = 2 * a.semiMinor;
  let rotation: number | undefined;
  if (deg < 10 || deg > 170) {
    rotation = undefined;
  } else if (Math.abs(deg - 90) < 10) {
    [w, h] = [h, w];
    rotation = undefined;
  } else {
    rotation = deg > 90 ? (deg - 180) / DEG : deg / DEG;
  }
  return {
    kind: "shape",
    shape: "circle",
    color,
    size,
    x: c.x - w / 2,
    y: c.y - h / 2,
    w,
    h,
    rotation,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Classifies a closed stroke. Returns null when no simple model fits confidently, so the caller
 * can fall back to special-shape detectors.
 */
export function fitClosedShape(rawPoints: Pt[], color: string, size: number): ShapeResult | null {
  if (rawPoints.length < 8) return null;
  const a = analyzeLoop(rawPoints);
  if (a.solidity < MIN_SOLIDITY) return null;

  for (const k of [3, 4, 5, 6] as const) {
    const p = a.polys[k];
    if (p.err > POLY_MAX_ERR || p.minTurnDeg < MIN_CORNER_TURN[k]) continue;
    if (k === 3) return fromTriangle(p.verts, color, size);
    if (k === 4) return fromQuad(p.verts, color, size);
    return fromRegular(k === 5 ? "pentagon" : "hexagon", p.verts, color, size);
  }

  if (a.flatFraction >= ROUNDED_RECT_MIN_FLAT && a.ellipseErr < ROUNDED_RECT_MAX_ELLIPSE_ERR) {
    return fromRoundedRect(a, color, size);
  }
  if (isRound(a, ELLIPSE_MAX_ERR)) return fromEllipse(a, color, size);
  return null;
}

/**
 * True when a closed stroke is clearly round (no real corners). Used to stop the older
 * bounding-box rules from turning a sloppy circle into a rectangle.
 */
export function looksRound(rawPoints: Pt[]): boolean {
  if (rawPoints.length < 8) return false;
  const a = analyzeLoop(rawPoints);
  const best = Math.min(
    ...([3, 4, 5, 6] as const).map((k) =>
      a.polys[k].minTurnDeg >= MIN_CORNER_TURN[k] ? a.polys[k].err : Infinity,
    ),
  );
  return isRound(a, 0.13) && best > POLY_MAX_ERR;
}

export function fitRoundShape(rawPoints: Pt[], color: string, size: number): ShapeResult {
  return fromEllipse(analyzeLoop(rawPoints), color, size);
}
