/**
 * Hardware profiles and ergonomics configuration for Smart Board / IFP panels.
 * Covers standard classroom and auditorium interactive panels:
 * 55", 65", 75", 86", 98", and 110" at 4K UHD (3840 x 2160).
 */

export type PanelDiagonal = "55" | "65" | "75" | "86" | "98" | "110";

export interface SmartBoardProfile {
  diagonalInches: number;
  label: string;
  // Dimensions in inches and centimeters (16:9 aspect ratio)
  widthInches: number;
  heightInches: number;
  widthCm: number;
  heightCm: number;
  // Resolution & pixel density (assuming standard 4K 3840x2160 UHD)
  nativeResolution: { width: number; height: number };
  ppi: number;
  pixelPitchMm: number;
  // UX Sizing (in screen pixels at 4K)
  uiScale: number;
  minTouchTargetPx: number; // Meets recommended minimum ~20-30mm physical touch size
  popoverWidthPx: number;
  // Contact Area Thresholds for Touch / IR / PCAP digitizers (in CSS/device pixels)
  // Contact major axis = Math.max(e.width, e.height)
  contactStylusMaxPx: number; // Anything below this is a stylus tip or fine touch
  contactPalmMinPx: number;   // Contacts >= this are ignored as resting palms/wrists
  contactFistMinPx: number;   // Contacts >= this trigger the dynamic Fist Eraser
  // Split board recommendations
  maxSplitZones: 2 | 3 | 4;
  defaultSplitZones: 2 | 3 | 4;
  // Reachability: recommended pull-down offset percentage (0 to 0.4) for shorter teachers/students
  recommendedPullDownOffset: number;
}

export const SMART_BOARD_PROFILES: Record<PanelDiagonal, SmartBoardProfile> = {
  "55": {
    diagonalInches: 55,
    label: "55\" Interactive Display",
    widthInches: 47.94,
    heightInches: 26.96,
    widthCm: 121.76,
    heightCm: 68.49,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 80.11,
    pixelPitchMm: 0.317,
    uiScale: 1.0,
    minTouchTargetPx: 64,
    popoverWidthPx: 480,
    contactStylusMaxPx: 25,
    contactPalmMinPx: 120,
    contactFistMinPx: 220,
    maxSplitZones: 2,
    defaultSplitZones: 2,
    recommendedPullDownOffset: 0,
  },
  "65": {
    diagonalInches: 65,
    label: "65\" Classroom Panel",
    widthInches: 56.65,
    heightInches: 31.87,
    widthCm: 143.90,
    heightCm: 80.94,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 67.78,
    pixelPitchMm: 0.375,
    uiScale: 1.1,
    minTouchTargetPx: 68,
    popoverWidthPx: 500,
    contactStylusMaxPx: 22,
    contactPalmMinPx: 105,
    contactFistMinPx: 190,
    maxSplitZones: 2,
    defaultSplitZones: 2,
    recommendedPullDownOffset: 0.1,
  },
  "75": {
    diagonalInches: 75,
    label: "75\" Classroom Panel",
    widthInches: 65.37,
    heightInches: 36.77,
    widthCm: 166.04,
    heightCm: 93.39,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 58.74,
    pixelPitchMm: 0.432,
    uiScale: 1.2,
    minTouchTargetPx: 76,
    popoverWidthPx: 520,
    contactStylusMaxPx: 20,
    contactPalmMinPx: 95,
    contactFistMinPx: 170,
    maxSplitZones: 3,
    defaultSplitZones: 2,
    recommendedPullDownOffset: 0.18,
  },
  "86": {
    diagonalInches: 86,
    label: "86\" Large Classroom Panel",
    widthInches: 74.96,
    heightInches: 42.16,
    widthCm: 190.39,
    heightCm: 107.09,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 51.23,
    pixelPitchMm: 0.496,
    uiScale: 1.35,
    minTouchTargetPx: 84,
    popoverWidthPx: 560,
    contactStylusMaxPx: 18,
    contactPalmMinPx: 85,
    contactFistMinPx: 150,
    maxSplitZones: 3,
    defaultSplitZones: 3,
    recommendedPullDownOffset: 0.25,
  },
  "98": {
    diagonalInches: 98,
    label: "98\" Auditorium Board",
    widthInches: 85.41,
    heightInches: 48.05,
    widthCm: 216.95,
    heightCm: 122.04,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 44.96,
    pixelPitchMm: 0.565,
    uiScale: 1.5,
    minTouchTargetPx: 96,
    popoverWidthPx: 600,
    contactStylusMaxPx: 16,
    contactPalmMinPx: 75,
    contactFistMinPx: 135,
    maxSplitZones: 4,
    defaultSplitZones: 3,
    recommendedPullDownOffset: 0.32,
  },
  "110": {
    diagonalInches: 110,
    label: "110\" Grand Auditorium Board",
    widthInches: 95.87,
    heightInches: 53.93,
    widthCm: 243.52,
    heightCm: 136.98,
    nativeResolution: { width: 3840, height: 2160 },
    ppi: 40.05,
    pixelPitchMm: 0.634,
    uiScale: 1.65,
    minTouchTargetPx: 104,
    popoverWidthPx: 640,
    contactStylusMaxPx: 14,
    contactPalmMinPx: 65,
    contactFistMinPx: 120,
    maxSplitZones: 4,
    defaultSplitZones: 4,
    recommendedPullDownOffset: 0.38,
  },
};

/**
 * Returns the profile matching the diagonal, defaulting to 75" if unknown.
 */
export function getSmartBoardProfile(diagonal?: PanelDiagonal): SmartBoardProfile {
  if (diagonal && SMART_BOARD_PROFILES[diagonal]) {
    return SMART_BOARD_PROFILES[diagonal];
  }
  return SMART_BOARD_PROFILES["75"];
}

/**
 * Heuristically estimates diagonal from screen dimensions and DPI if available,
 * or returns null to use user preference.
 */
export function detectSmartBoardProfile(): PanelDiagonal | null {
  if (typeof window === "undefined") return null;
  const w = window.screen?.width || window.innerWidth;
  const h = window.screen?.height || window.innerHeight;

  // On 4K IFP panels, resolution is >= 3840x2160 or CSS viewport is large with high touch points
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  if (maxTouchPoints >= 5 && (w >= 3840 || h >= 2160 || (w >= 1920 && maxTouchPoints >= 10))) {
    // Default to 75" as the industry standard classroom size
    return "75";
  }
  return null;
}

