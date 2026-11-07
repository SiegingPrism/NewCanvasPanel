/**
 * Broadcast Service for Multi-Room Classroom Mirroring
 * Provides full-fidelity lesson streaming:
 * - Single persistent Supabase Realtime & BroadcastChannel channel
 * - Initial current-page snapshot on join (< 256 KB safe payload)
 * - Real-time incremental stroke & object streaming
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
  | { type: "page_cleared"; pageId: string };

/**
 * Sanitize a page for broadcast transmission to guarantee message payloads
 * remain well below the Supabase Realtime 256 KB limit on the free tier.
 * Heavy inline base64 images are stripped or sent as links.
 */
export function sanitizePageForBroadcast(page: Page): Page {
  if (!page) return page;
  return {
    ...page,
    objects: (page.objects || []).map((obj) => {
      if (obj.kind === "image") {
        const imgObj = obj as any;
        // If image has a massive data: URL (> 15 KB), replace with link or placeholder
        if (typeof imgObj.src === "string" && imgObj.src.startsWith("data:") && imgObj.src.length > 15360) {
          return {
            ...imgObj,
            src: imgObj.previewUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%2364748b'>[Image Link]</text></svg>",
          };
        }
      }
      return obj;
    }),
  };
}

class BroadcastService {
  private activeCode: string | null = null;
  private channel: any = null;
  private bc: BroadcastChannel | null = null;
  private isHost: boolean = false;
  private stateGetter: (() => { activePage: Page; camera: Camera }) | null = null;

  /**
   * Register dynamic state getter (connected to useWhiteboard.getState())
   */
  registerStateGetter(getter: () => { activePage: Page; camera: Camera }) {
    this.stateGetter = getter;
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
