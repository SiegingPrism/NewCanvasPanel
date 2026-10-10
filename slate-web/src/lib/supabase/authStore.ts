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
  signUp: (email: string, password: string) => Promise<{ error: Error | null; unconfirmed?: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<User | null>;
}

function isCapacitorPlatform(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "capacitor:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function getAuthRedirectUrl(path = ""): string {
  if (typeof window === "undefined") return "";
  const isCapacitor = isCapacitorPlatform();

  if (isCapacitor) {
    const clean = path.replace(/^\//, "");
    return clean ? `com.slate.whiteboard://${clean}` : "com.slate.whiteboard://auth-callback";
  }

  const publicAppOrigin = (import.meta.env?.VITE_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  const base = publicAppOrigin || window.location.origin;
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
      if (isCapacitorPlatform()) {
        const { Browser } = await import("@capacitor/browser");
        const redirectTo = "com.slate.whiteboard://auth-callback";
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) return { error };
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_system" });
        }
        return { error: null };
      }

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
    supabase.auth.getSession().then(({ data }) => {
      useAuth.setState({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
        initialized: true,
      });
    }).catch(() => {
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
          useWhiteboard.getState().syncWithCloud().catch(() => {});
          const { useNotes } = await import("../notesStore");
          useNotes.getState().syncWithCloud().catch(() => {});
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

  // Handle deep link intents on Android / Capacitor (com.slate.whiteboard:// & slate://)
  if (isCapacitorPlatform()) {
    import("@capacitor/app")
      .then(({ App }) => {
        App.addListener("appUrlOpen", async (event) => {
          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close().catch(() => {});
          } catch {}

          const rawUrl = event.url || "";
          if (rawUrl.includes("com.slate.whiteboard") || rawUrl.includes("slate://")) {
            const normalized = rawUrl
              .replace(/^com\.slate\.whiteboard:\/\//, "https://slate.local/")
              .replace(/^slate:\/\//, "https://slate.local/");

            try {
              const parsed = new URL(normalized);
              const hash = parsed.hash.replace(/^#/, "");
              const searchParams = new URLSearchParams(parsed.search);
              const hashParams = new URLSearchParams(hash);

              const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
              const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");
              const code = searchParams.get("code") || hashParams.get("code");
              const type = hashParams.get("type") || searchParams.get("type");

              if (parsed.pathname.includes("reset-password") || type === "recovery") {
                window.location.href = `/reset-password${parsed.search}${parsed.hash}`;
                return;
              }

              const sb = getSupabase();
              if (sb) {
                if (accessToken && refreshToken) {
                  await sb.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                } else if (code) {
                  await sb.auth.exchangeCodeForSession(code);
                }
              }
            } catch (e) {
              console.warn("Failed to process app deep link URL:", e);
            }
          }
        });
      })
      .catch(() => {});
  }
}
