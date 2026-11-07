/**
 * Broadcast Service for Multi-Room Classroom Mirroring
 * Provides full-fidelity lesson streaming:
 * - Single persistent Supabase Realtime & BroadcastChannel channel
 * - Initial full-board snapshot on join
 * - Real-time incremental stroke & object streaming
 * - Viewer read-only mode banner
 */

import { getSupabase } from "@/lib/supabase/client";
import type { Page, CanvasObject } from "@/lib/whiteboard/types";

export type Camera = { x: number; y: number; zoom: number };

export type BroadcastMessage =
  | { type: "request_snapshot"; fromRoom?: string }
  | { type: "snapshot"; pages: Page[]; activePageId: string; camera: Camera }
  | { type: "object_added"; pageId: string; object: CanvasObject }
  | { type: "page_switched"; pageId: string }
  | { type: "page_cleared"; pageId: string };

class BroadcastService {
  private activeCode: string | null = null;
  private channel: any = null;
  private bc: BroadcastChannel | null = null;
  private isHost: boolean = false;

  /**
   * Start host broadcast session
   */
  startHost(
    roomCode: string,
    getSnapshot: () => { pages: Page[]; activePageId: string; camera: Camera },
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
          this.handleHostSignal(payload.payload, getSnapshot, onReceiverJoined);
        })
        .subscribe();
    }

    try {
      this.bc = new BroadcastChannel(channelName);
      this.bc.onmessage = (evt) => {
        this.handleHostSignal(evt.data, getSnapshot, onReceiverJoined);
      };
    } catch {}

    // Announce host availability
    this.send({ type: "snapshot", ...getSnapshot() });
  }

  private handleHostSignal(
    msg: BroadcastMessage,
    getSnapshot: () => { pages: Page[]; activePageId: string; camera: Camera },
    onReceiverJoined?: (roomName: string) => void
  ) {
    if (msg.type === "request_snapshot") {
      if (onReceiverJoined && msg.fromRoom) {
        onReceiverJoined(msg.fromRoom);
      }
      // Send full state immediately to the newly joined receiver
      this.send({
        type: "snapshot",
        ...getSnapshot(),
      });
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
      onSnapshot: (pages: Page[], activePageId: string, camera: Camera) => void;
      onObjectAdded: (pageId: string, object: CanvasObject) => void;
      onPageSwitched: (pageId: string) => void;
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
        callbacks.onSnapshot(msg.pages, msg.activePageId, msg.camera);
      } else if (msg.type === "object_added") {
        callbacks.onObjectAdded(msg.pageId, msg.object);
      } else if (msg.type === "page_switched") {
        callbacks.onPageSwitched(msg.pageId);
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
