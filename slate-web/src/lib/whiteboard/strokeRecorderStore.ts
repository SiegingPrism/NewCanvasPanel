import { create } from "zustand";
import type { Point } from "./types";
import { recognizeShape } from "./shapeRecognition";

export type RecordedStroke = {
  id: string;
  expectedShape: string;
  recognizedShape: string | null;
  match: boolean;
  points: Point[];
  timestamp: number;
};

export const RECORDABLE_SHAPES = [
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "square", label: "Square" },
  { id: "rect", label: "Rectangle" },
  { id: "triangle", label: "Triangle" },
  { id: "right-triangle", label: "Right Triangle" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "double-arrow", label: "Double Arrow" },
  { id: "wave", label: "Wave / Negative" },
] as const;

interface StrokeRecorderState {
  isOpen: boolean;
  isRecording: boolean;
  selectedShape: string;
  recordedStrokes: RecordedStroke[];
  openRecorder: () => void;
  closeRecorder: () => void;
  setIsOpen: (open: boolean) => void;
  toggleRecording: () => void;
  setIsRecording: (recording: boolean) => void;
  setSelectedShape: (shape: string) => void;
  recordStroke: (points: Point[]) => RecordedStroke | null;
  clearStrokes: () => void;
  deleteStroke: (id: string) => void;
  exportJSON: () => string;
}

export const useStrokeRecorderStore = create<StrokeRecorderState>((set, get) => ({
  isOpen: false,
  isRecording: false,
  selectedShape: "arrow",
  recordedStrokes: [],

  openRecorder: () => set({ isOpen: true }),
  closeRecorder: () => set({ isOpen: false }),
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  setIsRecording: (isRecording) => set({ isRecording }),
  setSelectedShape: (selectedShape) => set({ selectedShape }),

  recordStroke: (points: Point[]) => {
    const { isRecording, selectedShape } = get();
    if (!isRecording || points.length < 3) return null;

    const res = recognizeShape(points, "#000", 2);
    let recognizedShape: string | null = null;
    if (res && res.kind === "shape") {
      recognizedShape = res.shape;
    }

    let match = false;
    if (selectedShape === "wave") {
      // Negative control: matching means recognizedShape is null (left alone)
      match = recognizedShape === null;
    } else if (selectedShape === "square") {
      match =
        recognizedShape === "rect" &&
        Boolean(res && res.kind === "shape" && Math.abs(res.w - res.h) <= 12);
    } else {
      match = recognizedShape === selectedShape;
    }

    const newRecord: RecordedStroke = {
      id: Math.random().toString(36).slice(2, 10),
      expectedShape: selectedShape,
      recognizedShape,
      match,
      points: points.map((p) => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        p: p.p,
      })),
      timestamp: Date.now(),
    };

    set((s) => ({ recordedStrokes: [newRecord, ...s.recordedStrokes] }));
    return newRecord;
  },

  clearStrokes: () => set({ recordedStrokes: [] }),

  deleteStroke: (id) =>
    set((s) => ({
      recordedStrokes: s.recordedStrokes.filter((st) => st.id !== id),
    })),

  exportJSON: () => {
    const { recordedStrokes } = get();
    return JSON.stringify(
      recordedStrokes.map((s) => ({
        expected: s.expectedShape,
        recognized: s.recognizedShape,
        match: s.match,
        pointsCount: s.points.length,
        points: s.points,
      })),
      null,
      2,
    );
  },
}));
