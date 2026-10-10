import { describe, it, expect } from "vitest";
import { recognizeShape } from "./shapeRecognition";

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
});

