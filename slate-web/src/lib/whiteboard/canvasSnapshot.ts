/**
 * Shared, type-safe canvas snapshot registry.
 * Decouples offscreen canvas rendering in Canvas.tsx from consumer components like AISheet.tsx.
 */

type SnapshotCaptureFn = (selectionOnly?: boolean) => string | null;

let currentCaptureFn: SnapshotCaptureFn | null = null;

export function registerCanvasSnapshotCapture(fn: SnapshotCaptureFn): () => void {
  currentCaptureFn = fn;
  return () => {
    if (currentCaptureFn === fn) {
      currentCaptureFn = null;
    }
  };
}

export function captureCanvasSnapshot(selectionOnly?: boolean): string | null {
  if (typeof currentCaptureFn === "function") {
    try {
      return currentCaptureFn(selectionOnly);
    } catch (err) {
      console.warn("[CanvasSnapshot] Failed to capture canvas image:", err);
    }
  }
  return null;
}
