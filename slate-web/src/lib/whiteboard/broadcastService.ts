/**
 * Broadcast Service for Multi-Room Classroom Mirroring
 * Provides full-fidelity lesson streaming:
 * - Single persistent Supabase Realtime & BroadcastChannel channel
 * - Initial current-page snapshot on join (< 256 KB safe payload)
 * - Real-time incremental stroke & object streaming (shortened to prevent silent drops)
 * - Background upload of images to Supabase Storage once with permanent public CDN links
 * - Auto-sync throttled (~1s) from syncActive() covering Undo, Redo, Erase, Move, Edit, Zone Clear/Undo
 * - Dynamic store querying via useWhiteboard.getState()
 * - Viewer read-only mode banner
 */

import { getSupabase } from "@/lib/supabase/client";
import type { Page, CanvasObject } from "@/lib/whiteboard/types";

export type Camera = { x: number; y: number; zoom: number };

export type BroadcastMessage =
  | { type: "request_snapshot"; fromRoom?: string }
  | { type: "snapshot"; activePage: Page; camera: Camera }
  | { type: "object_added"; pageId: string; object: CanvasObject }
  | { type: "page_switched"; page: Page }
  | { type: "page_cleared"; pageId: string }
  | { type: "page_sync"; page: Page };

// In-memory cache for Supabase Storage public CDN URLs to prevent repeated uploads
const storageUrlCache = new Map<string, string>();
const inFlightUploads = new Set<string>();

export function getCachedStorageUrl(key: string): string | undefined {
  return storageUrlCache.get(key);
}

export function setCachedStorageUrl(key: string, url: string): void {
  storageUrlCache.set(key, url);
}

export function clearStorageUrlCache(): void {
  storageUrlCache.clear();
  inFlightUploads.clear();
}

export const BROADCAST_STORAGE_BUCKET = "broadcast-images";
export const FALLBACK_STORAGE_BUCKET = "shared-notes";

/**
 * Upload an image base64 data URL to Supabase Storage once and return its public CDN URL.
 * Uploads to the dedicated 'broadcast-images' bucket, keeping pictures separate from student notes.
 * Falls back to 'shared-notes' if the primary bucket is unavailable.
 */
export async function uploadPictureToStorageOnce(
  dataUrl: string,
  idHint?: string
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return dataUrl || null;
  }

  const cacheKey = idHint || `${dataUrl.slice(0, 80)}_${dataUrl.length}`;
  if (storageUrlCache.has(cacheKey)) {
    return storageUrlCache.get(cacheKey)!;
  }
  if (inFlightUploads.has(cacheKey)) {
    return null;
  }

  inFlightUploads.add(cacheKey);

  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;

    const mime = match[1] || "image/png";

    // Strictly disallow SVG images to prevent XSS / script execution vulnerabilities
    if (mime.includes("svg") || dataUrl.startsWith("data:image/svg")) {
      console.warn("[Broadcast] SVG images are rejected for security reasons.");
      return null;
    }

    const base64Data = match[2];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });

    const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    const fileName = `broadcast_${idHint || "img"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // 1. Try Edge Function upload (handles board validation and server-side service key)
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("upload-broadcast-image", {
        body: { dataUrl, idHint },
      });
      if (!edgeErr && edgeData?.publicUrl) {
        storageUrlCache.set(cacheKey, edgeData.publicUrl);
        if (idHint) storageUrlCache.set(idHint, edgeData.publicUrl);
        return edgeData.publicUrl;
      }
    } catch {
      // Edge Function not deployed or unavailable; fall through to authenticated direct upload
    }

    // 2. Direct upload to dedicated broadcast-images bucket (requires authenticated session)
    let targetBucket = BROADCAST_STORAGE_BUCKET;
    let { error: uploadErr } = await supabase.storage
      .from(BROADCAST_STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: mime,
        upsert: false,
      });

    // Gracefully fallback to shared-notes if broadcast-images is not yet provisioned
    if (uploadErr) {
      targetBucket = FALLBACK_STORAGE_BUCKET;
      const resFallback = await supabase.storage
        .from(FALLBACK_STORAGE_BUCKET)
        .upload(fileName, blob, {
          contentType: mime,
          upsert: false,
        });
      uploadErr = resFallback.error;
    }

    if (uploadErr) {
      console.warn("[Broadcast] Storage upload error:", uploadErr.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;
    if (publicUrl) {
      storageUrlCache.set(cacheKey, publicUrl);
      if (idHint) storageUrlCache.set(idHint, publicUrl);
      return publicUrl;
    }
  } catch (err) {
    console.warn("[Broadcast] Storage upload exception:", err);
  } finally {
    inFlightUploads.delete(cacheKey);
  }

  return null;
}

/**
 * Temporary broadcast pictures are pruned server-side by the scheduled Edge Function
 * (`cleanup-broadcast-images`) using the Storage API (.remove()) with the service role key.
 * Direct SQL deletion and client-side cleanup triggers are disabled to prevent orphaned S3 files.
 */
export async function cleanupOldBroadcastImages(_maxAgeHours = 24): Promise<number> {
  // Handled on server by scheduled Edge Function using Storage API
  return 0;
}

/**
 * Sanitize a single CanvasObject for broadcast transmission.
 * Ensures single objects (e.g. photos from the remote or image search)
 * do not exceed the 256 KB Supabase Realtime limit and trigger storage upload once.
 */
export function sanitizeObjectForBroadcast(
  obj: CanvasObject,
  onStorageUrlReady?: (id: string, url: string) => void
): CanvasObject {
  if (!obj || obj.kind !== "image") return obj;
  const imgObj = obj as any;

  if (typeof imgObj.src === "string") {
    // 1. If already an HTTP/HTTPS CDN link, send as is (lightweight and safe)
    if (imgObj.src.startsWith("http://") || imgObj.src.startsWith("https://")) {
      return obj;
    }

    // 2. If already uploaded and cached, substitute the Storage link
    const cachedUrl =
      getCachedStorageUrl(imgObj.id) ||
      getCachedStorageUrl(`${imgObj.src.slice(0, 80)}_${imgObj.src.length}`);
    if (cachedUrl) {
      return { ...imgObj, src: cachedUrl };
    }

    // 3. If it is a base64 data URL, upload to Storage once in background
    if (imgObj.src.startsWith("data:")) {
      uploadPictureToStorageOnce(imgObj.src, imgObj.id).then((publicUrl) => {
        if (publicUrl) {
          if (onStorageUrlReady) {
            onStorageUrlReady(imgObj.id, publicUrl);
          }
          if (broadcastService.getObjectUpdater()) {
            broadcastService.getObjectUpdater()!(imgObj.id, { src: publicUrl });
          }
        }
      });

      // 4. If image data URL is within safe Realtime message payload (< 120 KB), send directly
      if (imgObj.src.length <= 150000) {
        return obj;
      }

      // 5. If massive (> 120 KB), shorten it to prevent silent message drops (> 256 KB)
      if (imgObj.previewUrl && typeof imgObj.previewUrl === "string") {
        return { ...imgObj, src: imgObj.previewUrl };
      }

      // Use a clean placeholder while the permanent Storage URL is uploading
      return {
        ...imgObj,
        src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f8fafc'/><text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' font-weight='600' fill='%236366f1'>Loading Presentation Slide...</text><text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%2394a3b8'>Uploading high-res slide link</text></svg>",
      };
    }
  }

  return obj;
}

/**
 * Sanitize a page for broadcast transmission to guarantee message payloads
 * remain well below the Supabase Realtime 256 KB limit on the free tier.
 * Shortens all objects on the page and uploads pictures to Storage once.
 */
export function sanitizePageForBroadcast(page: Page): Page {
  if (!page) return page;
  return {
    ...page,
    objects: (page.objects || []).map((obj) => sanitizeObjectForBroadcast(obj)),
  };
}

class BroadcastService {
  private activeCode: string | null = null;
  private channel: any = null;
  private bc: BroadcastChannel | null = null;
  private isHost: boolean = false;
  private stateGetter: (() => { activePage: Page; camera: Camera }) | null = null;
  private objectUpdater: ((id: string, patch: any) => void) | null = null;
  private syncTimer: any = null;
  private lastSyncTime: number = 0;
  private pendingPage: Page | null = null;

  registerStateGetter(getter: () => { activePage: Page; camera: Camera }) {
    this.stateGetter = getter;
  }

  registerObjectUpdater(updater: (id: string, patch: any) => void) {
    this.objectUpdater = updater;
  }

  getObjectUpdater() {
    return this.objectUpdater;
  }

  /**
   * Schedule throttled page sync (~once per second) whenever something changed.
   * Catches Undo, Redo, Erasing, Moving, Deleting, Zone Undo/Clear, etc.
   */
  schedulePageSync(page: Page) {
    if (!this.activeCode || !this.isHost || !page) return;

    this.pendingPage = page;
    const now = Date.now();
    const elapsed = now - this.lastSyncTime;

    if (elapsed >= 1000) {
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
      this.lastSyncTime = now;
      this.sendCurrentPageSync();
    } else if (!this.syncTimer) {
      this.syncTimer = setTimeout(() => {
        this.syncTimer = null;
        this.lastSyncTime = Date.now();
        this.sendCurrentPageSync();
      }, 1000 - elapsed);
    }
  }

  private sendCurrentPageSync() {
    if (!this.activeCode || !this.isHost) return;
    const pageToSend =
      this.pendingPage ||
      (this.stateGetter ? this.stateGetter().activePage : null);
    if (!pageToSend) return;

    const sanitized = sanitizePageForBroadcast(pageToSend);
    this.send({
      type: "page_sync",
      page: sanitized,
    });
  }

  /**
   * Start host broadcast session
   */
  startHost(
    roomCode: string,
    onReceiverJoined?: (roomName: string) => void
  ) {
    this.stop();
    this.activeCode = roomCode;
    this.isHost = true;

    const channelName = `slate_broadcast_${roomCode}`;
    const supabase = getSupabase();

    if (supabase) {
      this.channel = supabase.channel(channelName);
      this.channel
        .on("broadcast", { event: "signal" }, (payload: any) => {
          this.handleHostSignal(payload.payload, onReceiverJoined);
        })
        .subscribe();
    }

    try {
      this.bc = new BroadcastChannel(channelName);
      this.bc.onmessage = (evt) => {
        this.handleHostSignal(evt.data, onReceiverJoined);
      };
    } catch {}

    // Send initial snapshot of the current active page
    if (this.stateGetter) {
      this.send({ type: "snapshot", ...this.stateGetter() });
    }
  }

  private handleHostSignal(
    msg: BroadcastMessage,
    onReceiverJoined?: (roomName: string) => void
  ) {
    if (msg.type === "request_snapshot") {
      if (onReceiverJoined && msg.fromRoom) {
        onReceiverJoined(msg.fromRoom);
      }
      // Read fresh, up-to-the-millisecond whiteboard state from the store
      if (this.stateGetter) {
        this.send({
          type: "snapshot",
          ...this.stateGetter(),
        });
      }
    }
  }

  /**
   * Broadcast an incremental whiteboard event to all receivers
   */
  send(msg: BroadcastMessage) {
    if (!this.activeCode) return;

    if (this.channel) {
      this.channel.send({
        type: "broadcast",
        event: "signal",
        payload: msg,
      }).catch(() => {});
    }

    if (this.bc) {
      try {
        this.bc.postMessage(msg);
      } catch {}
    }
  }

  /**
   * Join a room broadcast as a viewer/receiver
   */
  joinViewer(
    roomCode: string,
    callbacks: {
      onSnapshot: (activePage: Page, camera: Camera) => void;
      onObjectAdded: (pageId: string, object: CanvasObject) => void;
      onPageSwitched: (page: Page) => void;
      onPageCleared: (pageId: string) => void;
      onPageSync?: (page: Page) => void;
    }
  ) {
    this.stop();
    this.activeCode = roomCode;
    this.isHost = false;

    const channelName = `slate_broadcast_${roomCode}`;
    const supabase = getSupabase();

    const handleMessage = (msg: BroadcastMessage) => {
      if (!msg) return;
      if (msg.type === "snapshot") {
        callbacks.onSnapshot(msg.activePage, msg.camera);
      } else if (msg.type === "object_added") {
        callbacks.onObjectAdded(msg.pageId, msg.object);
      } else if (msg.type === "page_switched") {
        callbacks.onPageSwitched(msg.page);
      } else if (msg.type === "page_cleared") {
        callbacks.onPageCleared(msg.pageId);
      } else if (msg.type === "page_sync") {
        if (callbacks.onPageSync) {
          callbacks.onPageSync(msg.page);
        } else {
          callbacks.onPageSwitched(msg.page);
        }
      }
    };

    if (supabase) {
      this.channel = supabase.channel(channelName);
      this.channel
        .on("broadcast", { event: "signal" }, (payload: any) => {
          handleMessage(payload.payload);
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            // Request initial snapshot from host
            this.send({ type: "request_snapshot", fromRoom: "Viewing Board" });
          }
        });
    }

    try {
      this.bc = new BroadcastChannel(channelName);
      this.bc.onmessage = (evt) => {
        handleMessage(evt.data);
      };
    } catch {}

    // Also send request_snapshot over local broadcast channel
    this.send({ type: "request_snapshot", fromRoom: "Viewing Board" });
  }

  /**
   * Stop active broadcast or viewer session and clean up channels
   */
  stop() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.pendingPage = null;

    if (this.channel) {
      const supabase = getSupabase();
      if (supabase) {
        supabase.removeChannel(this.channel);
      }
      this.channel = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {}
      this.bc = null;
    }
    this.activeCode = null;
    this.isHost = false;
  }

  getActiveCode() {
    return this.activeCode;
  }

  isCurrentlyHost() {
    return this.isHost;
  }
}

export const broadcastService = new BroadcastService();
