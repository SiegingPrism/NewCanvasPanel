import { describe, it, expect } from "vitest";
import { recognizeShape } from "./shapeRecognition";
import type { Point } from "./types";

// ---- Synthetic Hand-Drawn Stroke Generators ----

// Add pseudo-random wobble/jitter simulating hand tremors
function addWobble(pts: Point[], amp = 2.5): Point[] {
  return pts.map((p, i) => {
    // Low frequency organic wave + high frequency tremor
    const organic = Math.sin(i * 0.4) * amp;
    const tremor = Math.cos(i * 1.3) * (amp * 0.4);
    return {
      x: p.x + organic + tremor,
      y: p.y + organic * 0.8 - tremor,
      p: 0.5,
    };
  });
}

function rotatePoints(pts: Point[], angleRad: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return pts.map((p) => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
    p: p.p,
  }));
}

// Generate hand-drawn line
function generateLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps = 30,
  wobble = 2,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return addWobble(pts, wobble);
}

// Generate hand-drawn circle/ellipse with closing gap or overshoot
function generateEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation = 0,
  closureDelta = 0.05,
  wobble = 2,
): Point[] {
  const pts: Point[] = [];
  const totalTurns = 1 + closureDelta; // slightly under/over closed
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2 * totalTurns;
    pts.push({
      x: cx + rx * Math.cos(theta),
      y: cy + ry * Math.sin(theta),
    });
  }
  const wobbly = addWobble(pts, wobble);
  return rotation !== 0 ? rotatePoints(wobbly, rotation, cx, cy) : wobbly;
}

// Generate hand-drawn rectangle/square
function generateRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rotation = 0,
  cornerRoundness = 0.05,
  wobble = 2,
): Point[] {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  const pts: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    for (let s = 0; s < 15; s++) {
      const t = s / 15;
      pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
    }
  }
  // close back to start
  pts.push({ x, y });
  const wobbly = addWobble(pts, wobble);
  return rotation !== 0 ? rotatePoints(wobbly, rotation, x + w / 2, y + h / 2) : wobbly;
}

// Generate hand-drawn triangle
function generateTriangle(
  cx: number,
  cy: number,
  r: number,
  type: "equilateral" | "right" | "isosceles" = "equilateral",
  rotation = 0,
  wobble = 2,
): Point[] {
  let vertices: { x: number; y: number }[] = [];
  if (type === "equilateral") {
    vertices = [
      { x: cx, y: cy - r },
      { x: cx + r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) },
      { x: cx - r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) },
    ];
  } else if (type === "right") {
    vertices = [
      { x: cx - r, y: cy - r },
      { x: cx - r, y: cy + r },
      { x: cx + r, y: cy + r },
    ];
  } else {
    vertices = [
      { x: cx, y: cy - r * 1.3 },
      { x: cx + r * 0.7, y: cy + r * 0.8 },
      { x: cx - r * 0.7, y: cy + r * 0.8 },
    ];
  }

  const pts: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const c1 = vertices[i];
    const c2 = vertices[(i + 1) % 3];
    for (let s = 0; s < 18; s++) {
      const t = s / 18;
      pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
    }
  }
  pts.push({ ...vertices[0] });
  const wobbly = addWobble(pts, wobble);
  return rotation !== 0 ? rotatePoints(wobbly, rotation, cx, cy) : wobbly;
}

// Generate single-stroke arrow: shaft -> tip -> barb1 back -> tip -> barb2
function generateArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  barbLen = 25,
  barbAngle = 0.5,
  wobble = 1.5,
): Point[] {
  const pts: Point[] = [];
  // 1. Shaft
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }

  const angle = Math.atan2(y2 - y1, x2 - x1);
  // Barb 1 back
  const b1x = x2 - barbLen * Math.cos(angle - barbAngle);
  const b1y = y2 - barbLen * Math.sin(angle - barbAngle);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    pts.push({ x: x2 + (b1x - x2) * t, y: y2 + (b1y - y2) * t });
  }

  // Return to tip
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    pts.push({ x: b1x + (x2 - b1x) * t, y: b1y + (y2 - b1y) * t });
  }

  // Barb 2 back
  const b2x = x2 - barbLen * Math.cos(angle + barbAngle);
  const b2y = y2 - barbLen * Math.sin(angle + barbAngle);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    pts.push({ x: x2 + (b2x - x2) * t, y: y2 + (b2y - y2) * t });
  }

  return addWobble(pts, wobble);
}

// Generate spiral (must NOT be recognized as a triangle or polygon)
function generateSpiral(cx: number, cy: number, turns = 2.5): Point[] {
  const pts: Point[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2 * turns;
    const r = 10 + (i / steps) * 80;
    pts.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
  }
  return addWobble(pts, 1.5);
}

// Generate cursive handwriting wave (must NOT snap)
function generateWave(x1: number, y1: number, length = 200, waves = 4): Point[] {
  const pts: Point[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = x1 + (i / steps) * length;
    const y = y1 + Math.sin((i / steps) * Math.PI * 2 * waves) * 18;
    pts.push({ x, y });
  }
  return addWobble(pts, 2);
}

describe("Shape Recognition Benchmark Suite (500+ Hand-Drawn Strokes)", () => {
  it("evaluates accuracy across core shapes, negative controls and speed targets", () => {
    let totalTests = 0;
    let passedTests = 0;

    const stats: Record<string, { total: number; correct: number }> = {
      circle: { total: 0, correct: 0 },
      ellipse: { total: 0, correct: 0 },
      square: { total: 0, correct: 0 },
      rectangle: { total: 0, correct: 0 },
      triangle: { total: 0, correct: 0 },
      rightTriangle: { total: 0, correct: 0 },
      line: { total: 0, correct: 0 },
      arrow: { total: 0, correct: 0 },
      negativeControls: { total: 0, correct: 0 }, // must return null
    };

    const startTime = performance.now();

    // 1. Circles (50 strokes: varying sizes, gaps, and wobbles)
    for (let i = 0; i < 50; i++) {
      const r = 40 + (i % 5) * 20;
      const gap = ((i % 7) - 3) * 0.03;
      const wobble = 1 + (i % 4) * 0.8;
      const pts = generateEllipse(200, 200, r, r * (1 + (i % 3) * 0.05), 0, gap, wobble);
      stats.circle.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "circle") {
        stats.circle.correct++;
        passedTests++;
      }
    }

    // 2. Ellipses (50 strokes: aspect 1.5–2.5, rotated 0°–180°)
    for (let i = 0; i < 50; i++) {
      const rx = 80 + (i % 4) * 15;
      const ry = 40 + (i % 3) * 10;
      const rot = (i * Math.PI) / 10;
      const gap = ((i % 5) - 2) * 0.04;
      const pts = generateEllipse(300, 300, rx, ry, rot, gap, 2);
      stats.ellipse.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      // In current types, circle represents both circles and ellipses (with w!=h or rotation)
      if (res && res.kind === "shape" && (res.shape === "circle" || res.shape === "ellipse")) {
        stats.ellipse.correct++;
        passedTests++;
      }
    }

    // 3. Squares (50 strokes: aspect ~1.0, rotated slightly)
    for (let i = 0; i < 50; i++) {
      const size = 60 + (i % 5) * 15;
      const rot = ((i % 9) - 4) * 0.03;
      const pts = generateRect(150, 150, size, size * (1 + ((i % 3) - 1) * 0.04), rot, 0.05, 2);
      stats.square.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "rect" && Math.abs(res.w - res.h) <= 12) {
        stats.square.correct++;
        passedTests++;
      }
    }

    // 4. Rectangles (50 strokes: wide, tall, rotated)
    for (let i = 0; i < 50; i++) {
      const w = 120 + (i % 4) * 20;
      const h = 60 + (i % 3) * 15;
      const rot = ((i % 7) - 3) * 0.04;
      const pts = generateRect(100, 100, i % 2 === 0 ? w : h, i % 2 === 0 ? h : w, rot, 0.05, 2.5);
      stats.rectangle.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "rect") {
        stats.rectangle.correct++;
        passedTests++;
      }
    }

    // 5. Equilateral / Isosceles Triangles (50 strokes)
    for (let i = 0; i < 50; i++) {
      const r = 60 + (i % 4) * 15;
      const rot = (i * Math.PI) / 8;
      const pts = generateTriangle(
        250,
        250,
        r,
        i % 2 === 0 ? "equilateral" : "isosceles",
        rot,
        2.5,
      );
      stats.triangle.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "triangle") {
        stats.triangle.correct++;
        passedTests++;
      }
    }

    // 6. Right-Angled Triangles (40 strokes)
    for (let i = 0; i < 40; i++) {
      const r = 55 + (i % 4) * 15;
      const pts = generateTriangle(250, 250, r, "right", 0, 2);
      stats.rightTriangle.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (
        res &&
        res.kind === "shape" &&
        (res.shape === "right-triangle" || res.shape === "triangle")
      ) {
        stats.rightTriangle.correct++;
        passedTests++;
      }
    }

    // 7. Lines (60 strokes: horizontal, vertical, diagonal, varying wobble)
    for (let i = 0; i < 60; i++) {
      const len = 100 + (i % 5) * 30;
      const angle = (i * Math.PI) / 6;
      const x2 = 100 + len * Math.cos(angle);
      const y2 = 100 + len * Math.sin(angle);
      const wobble = 1.5 + (i % 4) * 1.0;
      const pts = generateLine(100, 100, x2, y2, 35, wobble);
      stats.line.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "line") {
        stats.line.correct++;
        passedTests++;
      }
    }

    // 8. Arrows (60 strokes in various directions)
    for (let i = 0; i < 60; i++) {
      const len = 120 + (i % 4) * 30;
      const angle = (i * Math.PI) / 4;
      const x2 = 150 + len * Math.cos(angle);
      const y2 = 150 + len * Math.sin(angle);
      const pts = generateArrow(150, 150, x2, y2, 28, 0.5, 1.5);
      stats.arrow.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      if (res && res.kind === "shape" && res.shape === "arrow") {
        stats.arrow.correct++;
        passedTests++;
      }
    }

    // 9. Negative Controls: Spirals, waves, zigzags (70 strokes — MUST NOT SNAP!)
    for (let i = 0; i < 70; i++) {
      let pts: Point[];
      if (i < 30) {
        // Multi-turn spirals
        pts = generateSpiral(200, 200, 2 + (i % 3) * 0.5);
      } else {
        // Sine waves & cursive zigzags
        pts = generateWave(100, 100, 180, 3 + (i % 4));
      }
      stats.negativeControls.total++;
      totalTests++;
      const res = recognizeShape(pts, "#000", 2);
      // Correct behavior: do NOT snap (return null)
      if (res === null) {
        stats.negativeControls.correct++;
        passedTests++;
      }
    }

    const elapsedMs = performance.now() - startTime;
    const avgLatencyMs = elapsedMs / totalTests;
    const overallAccuracy = (passedTests / totalTests) * 100;

    console.log(`\n======================================================`);
    console.log(`   SHAPE RECOGNITION BENCHMARK REPORT (${totalTests} strokes)`);
    console.log(`======================================================`);
    for (const [name, s] of Object.entries(stats)) {
      const pct = ((s.correct / s.total) * 100).toFixed(1);
      console.log(`  ${name.padEnd(18)}: ${s.correct}/${s.total} (${pct}%)`);
    }
    console.log(`------------------------------------------------------`);
    console.log(
      `  Overall Accuracy  : ${overallAccuracy.toFixed(1)}% (${passedTests}/${totalTests})`,
    );
    console.log(`  Average Latency   : ${avgLatencyMs.toFixed(3)} ms / stroke`);
    console.log(`  Total Elapsed     : ${elapsedMs.toFixed(1)} ms`);
    console.log(`======================================================\n`);

    // Speed target: Must execute under 2ms per stroke
    expect(avgLatencyMs).toBeLessThan(2.0);

    // Negative controls: False snaps on writing/waves/spirals must be <= 5% (>= 95% left alone)
    const negativeAccuracy = (stats.negativeControls.correct / stats.negativeControls.total) * 100;
    expect(negativeAccuracy).toBeGreaterThanOrEqual(95);

    // Overall accuracy should be at least 70% with Quick Fixes (up from 58%)
    expect(overallAccuracy).toBeGreaterThanOrEqual(70);
  });
});
