import { describe, it, expect } from "vitest";

describe("Document Camera Widget logic", () => {
  it("calculates canvas dimensions correctly for 90-degree rotations", () => {
    const rawW = 1920;
    const rawH = 1080;

    function getRotatedDimensions(w: number, h: number, rotation: number) {
      return {
        width: rotation % 180 === 0 ? w : h,
        height: rotation % 180 === 0 ? h : w,
      };
    }

    expect(getRotatedDimensions(rawW, rawH, 0)).toEqual({ width: 1920, height: 1080 });
    expect(getRotatedDimensions(rawW, rawH, 90)).toEqual({ width: 1080, height: 1920 });
    expect(getRotatedDimensions(rawW, rawH, 180)).toEqual({ width: 1920, height: 1080 });
    expect(getRotatedDimensions(rawW, rawH, 270)).toEqual({ width: 1080, height: 1920 });
  });

  it("prefers document camera and visualizer device labels", () => {
    const mockDevices = [
      { deviceId: "cam-1", kind: "videoinput", label: "FaceTime HD Camera" },
      { deviceId: "cam-2", kind: "videoinput", label: "Ipevo USB Document Camera 4K" },
      { deviceId: "cam-3", kind: "videoinput", label: "Rear Camera" },
    ];

    const docCam = mockDevices.find(
      (d) =>
        d.label.toLowerCase().includes("doc") ||
        d.label.toLowerCase().includes("visualizer") ||
        d.label.toLowerCase().includes("back"),
    );

    expect(docCam?.deviceId).toBe("cam-2");
  });
});
