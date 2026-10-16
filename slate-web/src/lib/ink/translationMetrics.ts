/**
 * Lightweight performance metrics for handwriting recognition and translation.
 * Tracks:
 * - pen lifted → request sent → reply → UI rendered
 * - image byte size and dimensions
 * - cumulative request count
 */
import { create } from "zustand";

export type TranslationMetric = {
  id: string;
  penLiftedAt: number;
  requestSentAt: number;
  replyReceivedAt: number;
  uiRenderedAt: number;
  totalLatencyMs: number;
  pauseWaitMs: number;
  networkLatencyMs: number;
  imageBytes: number;
  imageDimensions: { w: number; h: number };
  requestCount: number;
  sourceText?: string;
  translatedText?: string;
  targetLanguage?: string;
  cached?: boolean;
};

type MetricsState = {
  showMetrics: boolean;
  totalRequests: number;
  latest: TranslationMetric | null;
  history: TranslationMetric[];
  toggleMetrics: () => void;
  setShowMetrics: (show: boolean) => void;
  recordMetric: (metric: Omit<TranslationMetric, "requestCount">) => void;
  clearHistory: () => void;
};

export const useTranslationMetrics = create<MetricsState>((set) => ({
  showMetrics: false,
  totalRequests: 0,
  latest: null,
  history: [],
  toggleMetrics: () => set((s) => ({ showMetrics: !s.showMetrics })),
  setShowMetrics: (showMetrics) => set({ showMetrics }),
  recordMetric: (metric) =>
    set((s) => {
      const nextCount = metric.cached ? s.totalRequests : s.totalRequests + 1;
      const full: TranslationMetric = { ...metric, requestCount: nextCount };
      return {
        totalRequests: nextCount,
        latest: full,
        history: [full, ...s.history].slice(0, 50),
      };
    }),
  clearHistory: () => set({ history: [], latest: null, totalRequests: 0 }),
}));
