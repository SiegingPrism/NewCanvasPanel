import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";

// Daily in-memory quota tracking per user (resets daily)
const DAILY_REQUEST_LIMIT = 50;
const userUsageMap = new Map<string, { count: number; date: string }>();

function checkUserQuota(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const userRecord = userUsageMap.get(userId);

  if (!userRecord || userRecord.date !== today) {
    userUsageMap.set(userId, { count: 1, date: today });
    return { allowed: true, remaining: DAILY_REQUEST_LIMIT - 1 };
  }

  if (userRecord.count >= DAILY_REQUEST_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  userRecord.count++;
  return { allowed: true, remaining: DAILY_REQUEST_LIMIT - userRecord.count };
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate user via Supabase Bearer token
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();

          if (!token) {
            return new Response(
              JSON.stringify({
                error: "Authentication required. Please sign in to Slate to use cloud AI.",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const sbUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
          const sbAnon = (process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
          const supabase = createClient(sbUrl, sbAnon, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data, error: userError } = await supabase.auth.getUser(token);
          if (userError || !data?.user) {
            return new Response(
              JSON.stringify({
                error: "Invalid or expired sign-in session. Please sign in again.",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const userId = data.user.id;

          // 2. Check daily quota per user
          const { allowed, remaining } = checkUserQuota(userId);
          if (!allowed) {
            return new Response(
              JSON.stringify({
                error: `Daily AI usage limit reached (${DAILY_REQUEST_LIMIT} requests/day). Quota resets tomorrow.`,
              }),
              { status: 429, headers: { "Content-Type": "application/json" } }
            );
          }

          // 3. Obtain server-side secret Gemini API key
          const serverKey =
            process.env.GEMINI_API_KEY?.trim() ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

          if (!serverKey) {
            return new Response(
              JSON.stringify({
                error:
                  "Server AI key is not configured. Please add GEMINI_API_KEY to server secrets, or supply a personal key in AI Settings.",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          }

          // 4. Parse request payload
          const body = (await request.json()) as {
            contents: any[];
            generationConfig?: any;
            systemInstruction?: any;
            model?: string;
            stream?: boolean;
          };

          if (!body?.contents || !Array.isArray(body.contents)) {
            return new Response(
              JSON.stringify({ error: "Invalid payload: contents array required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const model = body.model || "gemini-3.5-flash";
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const payload = {
            contents: body.contents,
            generationConfig: body.generationConfig,
            systemInstruction: body.systemInstruction,
          };

          // 5. Forward request to Gemini API
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": serverKey,
            },
            body: JSON.stringify(payload),
          });

          const geminiData = await geminiRes.json();

          if (!geminiRes.ok) {
            const errorMsg = geminiData?.error?.message || `Gemini error ${geminiRes.status}`;
            return new Response(
              JSON.stringify({ error: errorMsg }),
              { status: geminiRes.status, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(JSON.stringify(geminiData), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Daily-Remaining": String(remaining),
            },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Internal server error in AI proxy" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
