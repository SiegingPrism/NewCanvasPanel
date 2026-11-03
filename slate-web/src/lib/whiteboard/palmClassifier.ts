import { SmartBoardProfile, getSmartBoardProfile, PanelDiagonal } from "./smartBoardProfiles";

export type ContactClassification = "pen" | "finger" | "palm" | "fist";

export interface ContactMetrics {
  pointerId: number;
  pointerType: string;
  width: number;
  height: number;
  majorAxis: number;
  area: number;
  pressure: number;
  classification: ContactClassification;
  eraserRadiusPx: number;
}

/**
 * Classifies an incoming pointer event based on hardware touch dimensions (width & height).
 * Works on IR touch frames, PCAP panels, and capacitive styluses across 55"-110" panels.
 */
export function classifyPointerContact(
  e: PointerEvent | React.PointerEvent,
  panelDiagonal: PanelDiagonal = "75"
): ContactMetrics {
  const profile = getSmartBoardProfile(panelDiagonal);

  const rawWidth = e.width || 0;
  const rawHeight = e.height || 0;
  const majorAxis = Math.max(rawWidth, rawHeight);
  const area = rawWidth * rawHeight;
  const pressure = e.pressure ?? 0.5;

  let classification: ContactClassification = "finger";

  // Dedicated active pen reported by OS
  if (e.pointerType === "pen") {
    classification = "pen";
  } else if (e.pointerType === "touch" || e.pointerType === "mouse") {
    if (majorAxis > 0 && majorAxis >= profile.contactFistMinPx) {
      // Large contact area = side of hand or clenched fist
      classification = "fist";
    } else if (majorAxis > 0 && majorAxis >= profile.contactPalmMinPx) {
      // Resting palm or wrist during writing
      classification = "palm";
    } else if (majorAxis > 0 && majorAxis <= profile.contactStylusMaxPx) {
      // Fine passive stylus tip (narrow IR beam occlusion)
      classification = "pen";
    } else {
      // Standard finger touch (or default if width/height is 1 or unset by driver)
      classification = "finger";
    }
  }

  const eraserRadiusPx = Math.max(30, majorAxis / 2);

  return {
    pointerId: e.pointerId,
    pointerType: e.pointerType,
    width: rawWidth,
    height: rawHeight,
    majorAxis,
    area,
    pressure,
    classification,
    eraserRadiusPx,
  };
}

