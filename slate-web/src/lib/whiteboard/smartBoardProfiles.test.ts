import { describe, it, expect } from "vitest";
import {
  SMART_BOARD_PROFILES,
  getSmartBoardProfile,
  detectSmartBoardProfile,
  type PanelDiagonal,
} from "./smartBoardProfiles";
import { classifyPointerContact } from "./palmClassifier";

describe('Smart Board Hardware Profiles (55", 65", 75", 86", 98", 110")', () => {
  const panelSizes: PanelDiagonal[] = ["55", "65", "75", "86", "98", "110"];

  it("defines calibration profiles for all 6 target smart board dimensions", () => {
    panelSizes.forEach((size) => {
      const profile = SMART_BOARD_PROFILES[size];
      expect(profile).toBeDefined();
      expect(profile.diagonalInches).toBe(Number(size));
      expect(profile.widthInches).toBeGreaterThan(0);
      expect(profile.heightInches).toBeGreaterThan(0);
      expect(profile.widthCm).toBeGreaterThan(0);
      expect(profile.heightCm).toBeGreaterThan(0);
      expect(profile.ppi).toBeGreaterThan(0);
      expect(profile.minTouchTargetPx).toBeGreaterThanOrEqual(64);
      expect(profile.contactPalmMinPx).toBeGreaterThan(20);
      expect(profile.contactFistMinPx).toBeGreaterThan(profile.contactPalmMinPx);
    });
  });

  it('calculates reachability offsets proportionally for tall panels (86", 98", 110")', () => {
    expect(SMART_BOARD_PROFILES["55"].recommendedPullDownOffset).toBe(0);
    expect(SMART_BOARD_PROFILES["65"].recommendedPullDownOffset).toBe(0.1);
    expect(SMART_BOARD_PROFILES["75"].recommendedPullDownOffset).toBe(0.18);
    expect(SMART_BOARD_PROFILES["86"].recommendedPullDownOffset).toBe(0.25);
    expect(SMART_BOARD_PROFILES["98"].recommendedPullDownOffset).toBe(0.32);
    expect(SMART_BOARD_PROFILES["110"].recommendedPullDownOffset).toBe(0.38);
  });

  it("retrieves profile by diagonal with fallback", () => {
    const p75 = getSmartBoardProfile("75");
    expect(p75.diagonalInches).toBe(75);
    const pFallback = getSmartBoardProfile(undefined);
    expect(pFallback.diagonalInches).toBe(75);
  });
});

describe("Touch Contact Classifier & Palm Rejection", () => {
  it("classifies stylus input with high precision as pen", () => {
    const penEvent = {
      pointerId: 1,
      pointerType: "pen",
      width: 2,
      height: 2,
      pressure: 0.7,
    } as unknown as React.PointerEvent;

    const result = classifyPointerContact(penEvent, "75");
    expect(result.classification).toBe("pen");
  });

  it("classifies passive fine stylus tip (< 20px) as pen", () => {
    const passiveStylusEvent = {
      pointerId: 2,
      pointerType: "touch",
      width: 12,
      height: 14,
      pressure: 0.5,
    } as unknown as React.PointerEvent;

    const result = classifyPointerContact(passiveStylusEvent, "75");
    expect(result.classification).toBe("pen");
  });

  it("classifies standard finger touches (< 80px) as finger", () => {
    const fingerEvent = {
      pointerId: 3,
      pointerType: "touch",
      width: 35,
      height: 40,
      pressure: 0.5,
    } as unknown as React.PointerEvent;

    const result = classifyPointerContact(fingerEvent, "75");
    expect(result.classification).toBe("finger");
  });

  it("rejects large contact patches as resting palm", () => {
    const palmEvent = {
      pointerId: 4,
      pointerType: "touch",
      width: 105,
      height: 110,
      pressure: 0.4,
    } as unknown as React.PointerEvent;

    const result = classifyPointerContact(palmEvent, "75");
    expect(result.classification).toBe("palm");
  });

  it("classifies wide wipe contact as fist eraser", () => {
    const fistEvent = {
      pointerId: 5,
      pointerType: "touch",
      width: 210,
      height: 220,
      pressure: 0.8,
    } as unknown as React.PointerEvent;

    const result = classifyPointerContact(fistEvent, "86");
    expect(result.classification).toBe("fist");
    expect(result.eraserRadiusPx).toBeGreaterThan(40);
  });
});
