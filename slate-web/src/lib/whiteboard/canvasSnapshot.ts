import type { Page } from "./types";

/**
 * Shared, type-safe canvas snapshot registry.
 * Decouples offscreen canvas rendering in Canvas.tsx from consumer components like AISheet.tsx and ShareNotesDialog.tsx.
 */

type SnapshotCaptureFn = (selectionOnly?: boolean) => string | null;
export type PageRendererFn = (page: Page, width?: number, height?: number) => string | null;

let currentCaptureFn: SnapshotCaptureFn | null = null;
let currentPageRenderer: PageRendererFn | null = null;

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

export function registerPageRenderer(fn: PageRendererFn): () => void {
  currentPageRenderer = fn;
  return () => {
    if (currentPageRenderer === fn) {
      currentPageRenderer = null;
    }
  };
}

export function renderPageSnapshot(page: Page, width = 1920, height = 1080): string | null {
  if (typeof currentPageRenderer === "function") {
    try {
      return currentPageRenderer(page, width, height);
    } catch (err) {
      console.warn("[CanvasSnapshot] Failed to render page snapshot:", err);
    }
  }
  return null;
}
