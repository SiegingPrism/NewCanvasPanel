import { describe, it, expect } from "vitest";
import { recognizeShape, recognizeMultiStrokeArrow } from "./shapeRecognition";

function interpolate(p1: { x: number; y: number }, p2: { x: number; y: number }, steps = 15) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
  }
  return pts;
}

function polyline(corners: { x: number; y: number }[]) {
  const pts = [];
  for (let i = 0; i < corners.length; i++) {
    const next = corners[(i + 1) % corners.length];
    pts.push(...interpolate(corners[i], next));
  }
  return pts;
}

describe("shapeRecognition", () => {
  it("recognizes a rectangle correctly and does not confuse it for a pentagon", () => {
    // 160 x 80 rectangle with slightly overlapping start/end
    const corners = [
      { x: 10, y: 10 },
      { x: 170, y: 10 },
      { x: 170, y: 90 },
      { x: 10, y: 90 },
    ];
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("rect");
    }
  });

  it("recognizes a square correctly as rect", () => {
    const corners = [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 120, y: 120 },
      { x: 20, y: 120 },
    ];
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("rect");
    }
  });

  it("recognizes a pentagon", () => {
    // 5 vertices around a circle of radius 60
    const corners = [];
    const r = 60;
    const cx = 100;
    const cy = 100;
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      corners.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("pentagon");
    }
  });

  it("recognizes a symmetrical / equilateral triangle as 'triangle' and NOT 'right-triangle'", () => {
    // Upright equilateral triangle: apex at (100, 20), base from (30, 140) to (170, 140)
    const corners = [
      { x: 100, y: 20 },
      { x: 170, y: 140 },
      { x: 30, y: 140 },
    ];
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("triangle");
    }
  });

  it("recognizes a right-angled triangle as 'right-triangle'", () => {
    // Right triangle with right angle at (20, 120): (20, 20) -> (20, 120) -> (140, 120)
    const corners = [
      { x: 20, y: 20 },
      { x: 20, y: 120 },
      { x: 140, y: 120 },
    ];
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("right-triangle");
    }
  });

  it("recognizes a straight line as 'line' and NOT 'arrow' or 'double-arrow'", () => {
    // 20 points in a straight line from (10, 10) to (180, 10)
    const pts = interpolate({ x: 10, y: 10 }, { x: 180, y: 10 }, 25);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("line");
    }
  });

  it("recognizes an arrow with an angled barb as 'arrow'", () => {
    // Shaft from (10, 50) to (180, 50), then barb angled at ~30° from (180, 50) to (150, 70)
    const shaft = interpolate({ x: 10, y: 50 }, { x: 180, y: 50 }, 25);
    const barb = interpolate({ x: 180, y: 50 }, { x: 150, y: 70 }, 10);
    const pts = [...shaft, ...barb.slice(1)];
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("arrow");
    }
  });

  it("recognizes a tilted rectangle as 'rect' with rotation and NOT as a triangle", () => {
    // 140 x 70 rectangle rotated by 30°
    const angle = (30 * Math.PI) / 180;
    const hw = 70;
    const hh = 35;
    const cx = 150;
    const cy = 150;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const unrotated = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    const corners = unrotated.map((p) => ({
      x: cx + p.x * cos - p.y * sin,
      y: cy + p.x * sin + p.y * cos,
    }));
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("rect");
      expect(result.rotation).toBeDefined();
      expect(Math.abs(result.rotation!)).toBeGreaterThan(0.2); // ~30° (0.52 rad)
    }
  });

  it("snaps a slightly tilted rectangle (< 8°) to 0° rotation", () => {
    // 140 x 70 rectangle rotated by 5° (less than 8° threshold)
    const angle = (5 * Math.PI) / 180;
    const hw = 70;
    const hh = 35;
    const cx = 150;
    const cy = 150;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const unrotated = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    const corners = unrotated.map((p) => ({
      x: cx + p.x * cos - p.y * sin,
      y: cy + p.x * sin + p.y * cos,
    }));
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("rect");
      // Snapped to 0° -> rotation is undefined
      expect(result.rotation).toBeUndefined();
    }
  });

  it("recognizes a diamond (rhombus) as 'diamond' and NOT as a rotated rect", () => {
    // Upright diamond: top (100, 20), right (180, 100), bottom (100, 180), left (20, 100)
    const corners = [
      { x: 100, y: 20 },
      { x: 180, y: 100 },
      { x: 100, y: 180 },
      { x: 20, y: 100 },
    ];
    const pts = polyline(corners);
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("diamond");
    }
  });

  it("recognizes a single-stroke arrow drawn continuously (shaft + return barb) without lifting pen", () => {
    // Shaft from (20, 60) to (200, 60), then single return barb to (160, 80)
    const shaft = interpolate({ x: 20, y: 60 }, { x: 200, y: 60 }, 30);
    const barb = interpolate({ x: 200, y: 60 }, { x: 160, y: 80 }, 12);
    const pts = [...shaft, ...barb.slice(1)];
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("arrow");
      expect(result.x).toBe(20);
      expect(result.y).toBe(60);
      expect(result.w).toBe(180);
      expect(result.h).toBe(0);
    }
  });

  it("recognizes a multi-stroke arrow (separate shaft stroke + V-shaped arrowhead stroke)", () => {
    // Stroke 1: shaft line from (50, 100) to (250, 100)
    const shaft = interpolate({ x: 50, y: 100 }, { x: 250, y: 100 }, 30);
    // Stroke 2: chevron arrowhead > at (250, 100): wing1 (220, 80) -> apex (250, 100) -> wing2 (220, 120)
    const chevronWing1 = interpolate({ x: 220, y: 80 }, { x: 250, y: 100 }, 10);
    const chevronWing2 = interpolate({ x: 250, y: 100 }, { x: 220, y: 120 }, 10);
    const chevron = [...chevronWing1, ...chevronWing2.slice(1)];

    const result = recognizeMultiStrokeArrow([shaft, chevron], "#1e293b", 3);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("shape");
    if (result && result.kind === "shape") {
      expect(result.shape).toBe("arrow");
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
      expect(result.w).toBe(200);
      expect(result.h).toBe(0);
    }

    // Also works when chevron is drawn before shaft (reversed order of strokes)
    const reverseOrderResult = recognizeMultiStrokeArrow([chevron, shaft], "#1e293b", 3);
    expect(reverseOrderResult).not.toBeNull();
    expect(reverseOrderResult?.shape).toBe("arrow");
  });

  it("recognizes a multi-stroke arrow with 3 strokes (shaft + 2 separate barb lines)", () => {
    const shaft = interpolate({ x: 0, y: 0 }, { x: 100, y: 100 }, 25);
    const barb1 = interpolate({ x: 100, y: 100 }, { x: 70, y: 95 }, 8);
    const barb2 = interpolate({ x: 100, y: 100 }, { x: 95, y: 70 }, 8);

    const result = recognizeMultiStrokeArrow([shaft, barb1, barb2], "#ef4444", 2);
    expect(result).not.toBeNull();
    expect(result?.shape).toBe("arrow");
    if (result && result.kind === "shape") {
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.w).toBe(100);
      expect(result.h).toBe(100);
    }
  });

  it("does NOT turn cursive 'mmm' handwriting into a line", () => {
    // Cursive "mmm" oscillating up and down across y=50 from x=10 to x=100
    const pts = [];
    for (let x = 10; x <= 100; x += 2) {
      const y = 50 + 6 * Math.sin(((x - 10) / 15) * Math.PI * 2);
      pts.push({ x, y });
    }
    const result = recognizeShape(pts, "#000000", 2);
    // Should be rejected (not recognized as a straight line)
    expect(result).toBeNull();
  });

  it("does NOT turn a zigzag or wave into a straight line", () => {
    // Sharp zigzag oscillating between y=40 and y=60
    const corners = [
      { x: 10, y: 50 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
      { x: 70, y: 40 },
      { x: 90, y: 60 },
      { x: 110, y: 50 },
    ];
    const pts = [];
    for (let i = 0; i < corners.length - 1; i++) {
      pts.push(...interpolate(corners[i], corners[i + 1], 8));
    }
    const result = recognizeShape(pts, "#000000", 2);
    expect(result).toBeNull();
  });

  it("does NOT turn a check mark into an arrow", () => {
    // Check mark: downstroke from (20, 30) to (40, 60), then upstroke to (80, 10)
    // The angle between stroke segments is ~70°-80°, which should NOT trigger an arrow barb
    const downstroke = interpolate({ x: 20, y: 30 }, { x: 40, y: 60 }, 12);
    const upstroke = interpolate({ x: 40, y: 60 }, { x: 80, y: 10 }, 15);
    const pts = [...downstroke, ...upstroke.slice(1)];
    const result = recognizeShape(pts, "#000000", 2);
    // Should NOT be recognized as arrow
    expect(result?.shape).not.toBe("arrow");
  });
});

