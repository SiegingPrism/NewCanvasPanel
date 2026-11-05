import { getSupabase } from "./client";
import type { BoardMeta } from "../whiteboard/store";
import type { Page } from "../whiteboard/types";
import type { Note } from "../notesStore";

export interface CloudBoardRecord {
  id: string;
  user_id?: string;
  title: string;
  thumbnail?: string;
  folder_id?: string | null;
  is_starred: boolean;
  is_public?: boolean;
  background?: string;
  pages: Page[];
  created_at?: string;
  updated_at?: string;
}

export interface CloudNoteRecord {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  summary: string;
  blocks: any[];
  created_at?: string;
  updated_at?: string;
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// BOARDS CRUD
// ---------------------------------------------------------------------------

export async function syncBoardToSupabase(
  meta: BoardMeta,
  pages: Page[] = [],
  thumbnail?: string,
  isPublicShare = false
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  // Cloud sync and sharing strictly require sign-in to protect user data from being unowned or public
  const userId = await getAuthUserId();
  if (!userId) {
    return false;
  }

  try {
    const payload: any = {
      id: meta.id,
      user_id: userId,
      title: meta.title || "Untitled Board",
      folder_id: meta.folderId,
      is_starred: Boolean(meta.favorite),
      thumbnail: thumbnail || null,
      background: pages[0]?.background || "white",
      pages: pages,
      updated_at: new Date().toISOString(),
    };

    if (isPublicShare) {
      payload.is_public = true;
    }

    // Conflict detection: If the board already exists in cloud and was updated by another device
    if (meta.updatedAt) {
      const { data: existing } = await supabase
        .from("boards")
        .select("id, title, updated_at")
        .eq("id", meta.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing?.updated_at) {
        const remoteTime = new Date(existing.updated_at).getTime();
        // If remote has newer edits than when this local session started/saved (with 3s clock margin)
        if (remoteTime > meta.updatedAt + 3000) {
          // Conflict detected! Preserve both versions by creating a "(copy)"
          const copyId = `${meta.id}-copy-${Date.now().toString(36)}`;
          const copyTitle = `${meta.title || "Untitled Board"} (copy)`;
          payload.id = copyId;
          payload.title = copyTitle;
          console.warn(`[Sync] Conflict detected for board "${meta.title}". Saving as copy: "${copyTitle}"`);
        }
      }
    }

    const { error } = await supabase.from("boards").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase sync board warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase syncBoard failed:", err);
    return false;
  }
}

export async function fetchBoardsFromSupabase(): Promise<CloudBoardRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Without sign-in, do not pull other users' data
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetchBoards warning:", error.message);
      return [];
    }
    return (data as CloudBoardRecord[]) || [];
  } catch (err) {
    console.warn("Supabase fetchBoards failed:", err);
    return [];
  }
}

export async function fetchBoardById(boardId: string): Promise<CloudBoardRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .maybeSingle();
    if (error || !data) return null;
    return data as CloudBoardRecord;
  } catch {
    return null;
  }
}

export async function deleteBoardFromSupabase(boardId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from("boards")
      .delete()
      .eq("id", boardId)
      .eq("user_id", userId);
    if (error) {
      console.warn("Supabase deleteBoard warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase deleteBoard failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// NOTES CRUD
// ---------------------------------------------------------------------------

export async function syncNoteToSupabase(note: Note): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const textContent = note.blocks
      ?.map((b) => b.content || "")
      .join("\n")
      .trim();

    const payload: any = {
      id: note.id,
      user_id: userId,
      title: note.title || "Untitled Note",
      content: textContent || "",
      blocks: note.blocks || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("notes").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase sync note warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase syncNote failed:", err);
    return false;
  }
}

export async function fetchNotesFromSupabase(): Promise<CloudNoteRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetchNotes warning:", error.message);
      return [];
    }
    return (data as CloudNoteRecord[]) || [];
  } catch (err) {
    console.warn("Supabase fetchNotes failed:", err);
    return [];
  }
}

export async function fetchNoteById(noteId: string): Promise<CloudNoteRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .maybeSingle();
    if (error || !data) return null;
    return data as CloudNoteRecord;
  } catch {
    return null;
  }
}

export async function deleteNoteFromSupabase(noteId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);
    if (error) {
      console.warn("Supabase deleteNote warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase deleteNote failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// STUDY DECKS & QUIZZES
// ---------------------------------------------------------------------------

export async function syncStudyDeckToSupabase(
  deckId: string,
  title: string,
  cards: any[] = [],
  quizzes: any[] = []
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const payload = {
      id: deckId,
      user_id: userId,
      title: title || "Study Deck",
      cards,
      quizzes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("study_decks").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase sync study deck warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase syncStudyDeck failed:", err);
    return false;
  }
}

export async function fetchStudyDecksFromSupabase(): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("study_decks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetchStudyDecks warning:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Supabase fetchStudyDecks failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// ACCOUNT & DATA DELETION (Google Play compliance)
// ---------------------------------------------------------------------------

export async function deleteAccountAndAllData(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Database not configured" };

  try {
    const userId = await getAuthUserId();
    // Try stored procedure first
    const { error: rpcErr } = await supabase.rpc("delete_user_account");
    if (rpcErr) {
      console.warn("delete_user_account RPC failed, fallback to client delete:", rpcErr.message);
      if (userId) {
        await supabase.from("boards").delete().eq("user_id", userId);
        await supabase.from("notes").delete().eq("user_id", userId);
        await supabase.from("study_decks").delete().eq("user_id", userId);
      }
    }
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete account" };
  }
}

