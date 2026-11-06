import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import { deleteAccountAndAllData } from "./dbService";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; unconfirmed?: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<User | null>;
}

function getAuthRedirectUrl(path = ""): string {
  if (typeof window === "undefined") return "";
  const publicAppOrigin = (import.meta.env?.VITE_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  const isCapacitor =
    window.location.protocol === "capacitor:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const base = isCapacitor && publicAppOrigin ? publicAppOrigin : window.location.origin;
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  signIn: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return { error: new Error("Supabase is not configured") };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error };
      set({ user: data.user, session: data.session, loading: false });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  signUp: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return { error: new Error("Supabase is not configured") };
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo || undefined,
        },
      });
      if (error) return { error };
      const unconfirmed = Boolean(data.user && !data.session);
      set({ user: data.user, session: data.session, loading: false });
      return { error: null, unconfirmed };
    } catch (err: any) {
      return { error: err };
    }
  },

  signInWithGoogle: async () => {
    const supabase = getSupabase();
    if (!supabase) return { error: new Error("Supabase is not configured") };
    try {
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo || undefined,
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  resetPassword: async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: new Error("Supabase is not configured") };
    try {
      const redirectTo = getAuthRedirectUrl("/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectTo || undefined,
      });
      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  deleteAccount: async () => {
    const supabase = getSupabase();
    if (!supabase) return { error: new Error("Supabase is not configured") };
    try {
      const res = await deleteAccountAndAllData();
      if (!res.success) {
        return { error: new Error(res.error || "Failed to delete account") };
      }
      set({ user: null, session: null, loading: false });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    set({ user: null, session: null, loading: false });
  },

  checkSession: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ user: null, session: null, loading: false, initialized: true });
      return null;
    }
    try {
      const { data } = await supabase.auth.getSession();
      set({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
        initialized: true,
      });
      return data.session?.user ?? null;
    } catch {
      set({ user: null, session: null, loading: false, initialized: true });
      return null;
    }
  },
}));

if (typeof window !== "undefined") {
  const supabase = getSupabase();
  if (supabase) {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        useAuth.setState({
          user: data.session?.user ?? null,
          session: data.session,
          loading: false,
          initialized: true,
        });
      })
      .catch(() => {
        useAuth.setState({ user: null, session: null, loading: false, initialized: true });
      });

    supabase.auth.onAuthStateChange(async (event, session) => {
      useAuth.setState({
        user: session?.user ?? null,
        session,
        loading: false,
        initialized: true,
      });

      if (event === "SIGNED_IN" && session?.user) {
        try {
          const { useWhiteboard } = await import("../whiteboard/store");
          useWhiteboard
            .getState()
            .syncWithCloud()
            .catch(() => {});
          const { useNotes } = await import("../notesStore");
          useNotes
            .getState()
            .syncWithCloud()
            .catch(() => {});
        } catch {}
      } else if (event === "SIGNED_OUT") {
        try {
          const { useWhiteboard } = await import("../whiteboard/store");
          useWhiteboard.getState().clearOnSignOut();
          const { useNotes } = await import("../notesStore");
          useNotes.getState().clearOnSignOut();
        } catch {}
      }
    });
  } else {
    useAuth.setState({ user: null, session: null, loading: false, initialized: true });
  }
}

export function getUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null;
  return (
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.identities?.[0]?.identity_data?.avatar_url ||
    user.identities?.[0]?.identity_data?.picture ||
    null
  );
}

export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "Guest User";
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    (user.email ? user.email.split("@")[0] : "User")
  );
}
