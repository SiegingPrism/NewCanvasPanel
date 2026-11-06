import { describe, it, expect } from "vitest";

describe("Lesson Replay Timeline Logic", () => {
  it("calculates total points across strokes correctly", () => {
    const mockStrokes = [
      { id: "s1", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }] },
      { id: "s2", points: [{ x: 30, y: 30 }, { x: 40, y: 40 }] },
      { id: "s3", points: [{ x: 50, y: 50 }, { x: 60, y: 60 }, { x: 70, y: 70 }, { x: 80, y: 80 }] },
    ];

    const totalPoints = mockStrokes.reduce((acc, s) => acc + s.points.length, 0);
    expect(totalPoints).toBe(9);

    // At 50% progress, we should draw floor(0.5 * 9) = 4 or 5 points
    const targetPoints = Math.round((50 / 100) * totalPoints);
    expect(targetPoints).toBe(5);
  });

  it("calculates progress steps based on playback speed", () => {
    const totalPoints = 100;
    const dt = 1000; // 1 second
    const speed1x = 1;
    const speed2x = 2;

    const pointsPerSec1x = 75 * speed1x;
    const pctStep1x = (pointsPerSec1x / totalPoints) * 100;
    expect(pctStep1x).toBe(75);

    const pointsPerSec2x = 75 * speed2x;
    const pctStep2x = (pointsPerSec2x / totalPoints) * 100;
    expect(pctStep2x).toBe(150);
  });
});
