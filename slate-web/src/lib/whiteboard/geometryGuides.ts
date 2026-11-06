import type { Point } from "./types";

export interface GuideSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GuideCircle {
  id: string;
  cx: number;
  cy: number;
  radius: number;
}

const activeSegments: Map<string, GuideSegment> = new Map();
const activeCircles: Map<string, GuideCircle> = new Map();

export function registerGuideSegment(id: string, x1: number, y1: number, x2: number, y2: number) {
  activeSegments.set(id, { id, x1, y1, x2, y2 });
}

export function unregisterGuideSegment(id: string) {
  activeSegments.delete(id);
}

export function registerGuideCircle(id: string, cx: number, cy: number, radius: number) {
  activeCircles.set(id, { id, cx, cy, radius });
}

export function unregisterGuideCircle(id: string) {
  activeCircles.delete(id);
}

export function clearAllGuides() {
  activeSegments.clear();
  activeCircles.clear();
}

/**
 * Projects a point onto the nearest active straight-line guide or compass circle
 * if within snapDistance (default 26px in world coordinates).
 */
export function snapPointToActiveGuides(pt: Point, snapDistance = 26): Point {
  let closestPt: Point = pt;
  let minDistance = snapDistance;

  // 1. Check straight line segments (Ruler and Set-Square edges)
  for (const seg of activeSegments.values()) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    // t is the projection factor clamped to [0, 1]
    const t = Math.max(0, Math.min(1, ((pt.x - seg.x1) * dx + (pt.y - seg.y1) * dy) / lenSq));
    const projX = seg.x1 + t * dx;
    const projY = seg.y1 + t * dy;
    const dist = Math.hypot(pt.x - projX, pt.y - projY);

    if (dist < minDistance) {
      minDistance = dist;
      closestPt = { ...pt, x: Math.round(projX * 10) / 10, y: Math.round(projY * 10) / 10 };
    }
  }

  // 2. Check circle guides (Compass)
  for (const circle of activeCircles.values()) {
    const distFromCenter = Math.hypot(pt.x - circle.cx, pt.y - circle.cy);
    const diffFromRadius = Math.abs(distFromCenter - circle.radius);
    if (diffFromRadius < minDistance && distFromCenter > 0) {
      minDistance = diffFromRadius;
      const angle = Math.atan2(pt.y - circle.cy, pt.x - circle.cx);
      const projX = circle.cx + Math.cos(angle) * circle.radius;
      const projY = circle.cy + Math.sin(angle) * circle.radius;
      closestPt = { ...pt, x: Math.round(projX * 10) / 10, y: Math.round(projY * 10) / 10 };
    }
  }

  return closestPt;
}
