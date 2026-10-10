import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";

// CORS headers for Capacitor mobile app (https://localhost) and browser web clients
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Daily-Remaining",
  "Access-Control-Expose-Headers": "X-Daily-Remaining",
  "Access-Control-Max-Age": "86400",
};

// Strict model whitelist and parameter boundaries
const ALLOWED_MODELS = new Set(["gemini-3.5-flash", "gemini-3.5-flash-lite"]);
const MAX_ALLOWED_OUTPUT_TOKENS = 8192; // Raised to 8,192 to prevent reasoning tokens from truncating long quizzes / lesson plans
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB max payload
const DAILY_REQUEST_LIMIT = 50;

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },

      POST: async ({ request }) => {
        try {
          // 0. Payload size check
          const contentLength = request.headers.get("content-length");
          if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
            return new Response(
              JSON.stringify({
                error: "Payload too large. Maximum allowed request size is 5MB.",
              }),
              {
                status: 413,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }

          // 1. Authenticate user via Supabase Bearer token
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();

          if (!token) {
            return new Response(
              JSON.stringify({
                error: "Authentication required. Please sign in to Slate to use cloud AI.",
              }),
              {
                status: 401,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }

          const sbUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
          const sbAnon = (process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
          const supabase = createClient(sbUrl, sbAnon, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: userData, error: userError } = await supabase.auth.getUser(token);
          if (userError || !userData?.user) {
            return new Response(
              JSON.stringify({
                error: "Invalid or expired sign-in session. Please sign in again.",
              }),
              {
                status: 401,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }

          // 2. Atomically increment daily quota in Supabase.
          // In production, we fail closed (return 503) if the database RPC is unavailable.
          let remaining = DAILY_REQUEST_LIMIT;
          try {
            const { data: usageData, error: rpcError } = await supabase.rpc("increment_ai_usage", {
              p_daily_limit: DAILY_REQUEST_LIMIT,
            });

            if (rpcError || !usageData || typeof usageData !== "object") {
              console.error("Supabase increment_ai_usage RPC error:", rpcError);
              return new Response(
                JSON.stringify({
                  error:
                    "AI quota service is temporarily unavailable. Please ensure database migrations have been executed in Supabase.",
                }),
                {
                  status: 503,
                  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
                }
              );
            }

            const usage = usageData as { allowed?: boolean; remaining?: number };
            if (usage.allowed === false) {
              return new Response(
                JSON.stringify({
                  error: `Daily AI usage limit reached (${DAILY_REQUEST_LIMIT} requests/day). Quota resets tomorrow.`,
                }),
                {
                  status: 429,
                  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
                }
              );
            }
            remaining = typeof usage.remaining === "number" ? usage.remaining : 0;
          } catch (err: any) {
            console.error("Quota check failed:", err);
            return new Response(
              JSON.stringify({
                error:
                  "AI quota service is temporarily unavailable. Please ensure database migrations have been executed in Supabase.",
              }),
              {
                status: 503,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
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
              {
                status: 503,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }

          // 4. Parse & validate request payload
          const bodyText = await request.text();
          if (bodyText.length > MAX_PAYLOAD_BYTES) {
            return new Response(
              JSON.stringify({ error: "Payload too large. Maximum allowed request size is 5MB." }),
              { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
          }

          let body: {
            contents?: any[];
            generationConfig?: any;
            systemInstruction?: any;
            model?: string;
            stream?: boolean;
          };

          try {
            body = JSON.parse(bodyText);
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON in request body" }),
              { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
          }

          if (!body?.contents || !Array.isArray(body.contents)) {
            return new Response(
              JSON.stringify({ error: "Invalid payload: contents array required" }),
              { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
          }

          // Enforce model whitelist strictly
          const requestedModel = body.model?.trim() || "gemini-3.5-flash";
          const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "gemini-3.5-flash";

          // Enforce maxOutputTokens cap (<= 8192)
          const requestedTokens =
            typeof body.generationConfig?.maxOutputTokens === "number"
              ? body.generationConfig.maxOutputTokens
              : MAX_ALLOWED_OUTPUT_TOKENS;
          const cappedTokens = Math.min(Math.max(1, requestedTokens), MAX_ALLOWED_OUTPUT_TOKENS);

          const generationConfig = {
            ...body.generationConfig,
            maxOutputTokens: cappedTokens,
          };

          const isStreaming = Boolean(body.stream);
          const geminiUrl = isStreaming
            ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
            : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const payload = {
            contents: body.contents,
            generationConfig,
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

          if (!geminiRes.ok) {
            let errorMsg = `Gemini error ${geminiRes.status}`;
            try {
              const geminiData = await geminiRes.json();
              if (geminiData?.error?.message) {
                errorMsg = geminiData.error.message;
              }
            } catch {}
            return new Response(
              JSON.stringify({ error: errorMsg }),
              {
                status: geminiRes.status,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }

          if (isStreaming) {
            return new Response(geminiRes.body, {
              status: 200,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Daily-Remaining": String(remaining),
              },
            });
          }

          const geminiData = await geminiRes.json();
          return new Response(JSON.stringify(geminiData), {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
              "X-Daily-Remaining": String(remaining),
            },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Internal server error in AI proxy" }),
            {
              status: 500,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
