import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  broadcastService,
  sanitizeObjectForBroadcast,
  sanitizePageForBroadcast,
  uploadPictureToStorageOnce,
  setCachedStorageUrl,
  getCachedStorageUrl,
  clearStorageUrlCache,
} from "./broadcastService";
import type { Page, CanvasObject } from "./types";

describe("Broadcast Service & Storage Optimization", () => {
  beforeEach(() => {
    clearStorageUrlCache();
    broadcastService.stop();
  });

  describe("sanitizeObjectForBroadcast", () => {
    it("returns non-image objects completely unchanged", () => {
      const stroke: CanvasObject = {
        id: "stroke-1",
        kind: "pen",
        points: [{ x: 10, y: 20 }, { x: 15, y: 25 }],
        color: "#ef4444",
        size: 3,
      };

      const sanitized = sanitizeObjectForBroadcast(stroke);
      expect(sanitized).toEqual(stroke);
    });

    it("preserves external HTTP and HTTPS image URLs without shortening", () => {
      const webImage: CanvasObject = {
        id: "img-web",
        kind: "image",
        x: 100,
        y: 100,
        w: 400,
        h: 300,
        src: "https://example.com/slide1.png",
      };

      const sanitized = sanitizeObjectForBroadcast(webImage);
      expect((sanitized as any).src).toBe("https://example.com/slide1.png");
    });

    it("uses cached Supabase Storage link if already uploaded", () => {
      setCachedStorageUrl("img-cached", "https://supabase.co/storage/v1/object/public/shared-notes/slide_1.png");

      const base64Image: CanvasObject = {
        id: "img-cached",
        kind: "image",
        x: 0,
        y: 0,
        w: 500,
        h: 400,
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      };

      const sanitized = sanitizeObjectForBroadcast(base64Image);
      expect((sanitized as any).src).toBe(
        "https://supabase.co/storage/v1/object/public/shared-notes/slide_1.png"
      );
    });

    it("does NOT replace images under 120 KB with grey [Image Link] boxes", () => {
      // Small/medium base64 image (30 KB representation)
      const mediumData = "data:image/png;base64," + "A".repeat(30000);
      const obj: CanvasObject = {
        id: "img-medium",
        kind: "image",
        x: 0,
        y: 0,
        w: 200,
        h: 200,
        src: mediumData,
      };

      const sanitized = sanitizeObjectForBroadcast(obj);
      // Must NOT be the old [Image Link] box
      expect((sanitized as any).src).not.toContain("[Image Link]");
      expect((sanitized as any).src).toBe(mediumData);
    });

    it("shortens massive images (> 150 KB) to prevent dropping messages over 256 KB limit", () => {
      const hugeData = "data:image/png;base64," + "B".repeat(200000);
      const hugeImage: CanvasObject = {
        id: "img-huge",
        kind: "image",
        x: 0,
        y: 0,
        w: 800,
        h: 600,
        src: hugeData,
      };

      const sanitized = sanitizeObjectForBroadcast(hugeImage);
      // The payload must be significantly shortened
      expect((sanitized as any).src.length).toBeLessThan(1000);
      // It must NOT contain the old [Image Link] text
      expect((sanitized as any).src).not.toContain("[Image Link]");
      expect((sanitized as any).src).toContain("Loading Presentation Slide...");
    });
  });

  describe("sanitizePageForBroadcast", () => {
    it("sanitizes all objects on a page including slides and diagrams", () => {
      const page: Page = {
        id: "page-1",
        title: "Slide 1: Overview",
        background: "white",
        objects: [
          {
            id: "text-1",
            kind: "text",
            x: 50,
            y: 50,
            w: 200,
            h: 50,
            text: "Assembly Presentation",
            fontSize: 24,
            color: "#0f172a",
          },
          {
            id: "slide-img-1",
            kind: "image",
            x: 60,
            y: 100,
            w: 800,
            h: 600,
            src: "https://cdn.school.edu/assembly/slide1.png",
          },
          {
            id: "slide-img-2",
            kind: "image",
            x: 60,
            y: 800,
            w: 800,
            h: 600,
            src: "data:image/png;base64," + "X".repeat(200000),
          },
        ],
      };

      const sanitizedPage = sanitizePageForBroadcast(page);
      expect(sanitizedPage.objects).toHaveLength(3);
      expect((sanitizedPage.objects[0] as any).text).toBe("Assembly Presentation");
      expect((sanitizedPage.objects[1] as any).src).toBe("https://cdn.school.edu/assembly/slide1.png");
      expect((sanitizedPage.objects[2] as any).src.length).toBeLessThan(1000);
      expect((sanitizedPage.objects[2] as any).src).not.toContain("[Image Link]");
    });
  });

  describe("Throttled Broadcast Page Sync", () => {
    it("sends page_sync messages when schedulePageSync is called", () => {
      vi.useFakeTimers();

      const sendSpy = vi.spyOn(broadcastService, "send");

      // Start host with dummy room
      broadcastService.startHost("123456");

      const page: Page = {
        id: "p1",
        background: "white",
        objects: [
          { id: "s1", kind: "pen", points: [{ x: 0, y: 0 }], color: "#000", size: 2 },
        ],
      };

      // Call schedulePageSync
      broadcastService.schedulePageSync(page);

      // First call fires immediately if elapsed >= 1000ms
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "page_sync",
          page: expect.objectContaining({ id: "p1" }),
        })
      );

      sendSpy.mockClear();

      // Second change within 300ms (e.g. Undo or Move)
      const pageAfterUndo: Page = {
        id: "p1",
        background: "white",
        objects: [], // Stroke undone
      };
      broadcastService.schedulePageSync(pageAfterUndo);

      // Should not send immediately due to 1s throttle
      expect(sendSpy).not.toHaveBeenCalled();

      // Advance time by 1000ms
      vi.advanceTimersByTime(1000);

      // Trailing sync fires with the updated page (undo reflected)
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "page_sync",
          page: expect.objectContaining({ objects: [] }),
        })
      );

      vi.useRealTimers();
    });
  });
});
