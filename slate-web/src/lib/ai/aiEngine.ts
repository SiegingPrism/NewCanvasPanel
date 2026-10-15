/**
 * Slate AI Engine — online-only, powered by Google Gemini.
 *
 * Every AI feature in the app goes through this file:
 *  - one request path (`callGemini` / `streamGemini`) used on web and Android alike
 *  - structured JSON for data features (quiz, flashcards, mind map, diagrams, math, …)
 *  - typed `AIError`s with user-friendly messages instead of silent fallbacks
 *
 * There is intentionally NO offline/heuristic fallback: when the AI is unavailable the
 * caller receives an `AIError` and shows its message, and nothing on the board is changed.
 */
import { useAISettings } from "./aiSettingsStore";
import { useAuth } from "@/lib/supabase/authStore";
import { retrieveRAGContext } from "./localRAG";
import { compileMathFunction } from "@/lib/whiteboard/safeMath";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  level: number;
  color: string;
  parentId?: string;
  children?: MindMapNode[];
}

export interface FlowchartNode {
  id: string;
  type: "start" | "process" | "decision" | "end";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  connectedTo?: string[];
}

export interface MathSolveResult {
  latex: string;
  solution: string;
  steps: string[];
  graphableFn?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  title?: string;
}

export interface NoteSummary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  takeaway: string;
}

export interface BoardExplanation {
  summary: string;
  breakdown: string[];
  recommendations: string[];
}

export interface StudyPlan {
  title: string;
  phases: Array<{ title: string; tasks: string[] }>;
  dailyRoutine: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  title: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AIErrorCode =
  | "offline"
  | "no_key"
  | "invalid_key"
  | "quota"
  | "model"
  | "blocked"
  | "timeout"
  | "aborted"
  | "network"
  | "server"
  | "bad_response"
  | "bad_input";

export class AIError extends Error {
  code: AIErrorCode;
  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}

/** User-facing message for any error thrown by an AI call. */
export function aiErrorMessage(
  err: unknown,
  fallback = "AI request failed. Please try again.",
): string {
  if (err instanceof AIError) return err.message;
  if (err instanceof Error && err.name === "AbortError") return "Request cancelled.";
  return fallback;
}

// ---------------------------------------------------------------------------
// Gemini transport
// ---------------------------------------------------------------------------

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Model used for every request. Override with VITE_GEMINI_MODEL in .env if needed. */
export const GEMINI_MODEL: string =
  ((import.meta.env?.VITE_GEMINI_MODEL as string | undefined) || "").trim() || "gemini-3.5-flash-lite";

const FALLBACK_MODELS: string[] = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"];

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
type Content = { role: "user" | "model"; parts: Part[] };

interface CallOptions {
  system?: string;
  /** Ask Gemini for JSON output (optionally constrained by a response schema). */
  json?: boolean;
  schema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function imagePart(dataUrl: string): Part {
  const match = dataUrl.match(/^data:([a-zA-Z0-9+./-]+);base64,(.+)$/);
  if (!match)
    throw new AIError("bad_input", "The selected area could not be captured as an image.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function userContent(text: string, imageDataUrl?: string): Content[] {
  const parts: Part[] = [];
  if (imageDataUrl) parts.push(imagePart(imageDataUrl));
  parts.push({ text });
  return [{ role: "user", parts }];
}

function getServerEndpoint(path: string): string {
  const publicAppOrigin = (import.meta.env?.VITE_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  const isCapacitor =
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  if (isCapacitor && publicAppOrigin) {
    return `${publicAppOrigin}${path}`;
  }
  return path;
}

function getAuthOrKey(): { type: "userKey"; key: string } | { type: "serverProxy"; token: string } {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AIError("offline", "You're offline. Connect to the internet to use AI.");
  }
  const key = useAISettings.getState().getApiKey();
  if (key) {
    return { type: "userKey", key };
  }

  const session = useAuth.getState().session;
  if (session?.access_token) {
    return { type: "serverProxy", token: session.access_token };
  }

  throw new AIError(
    "no_key",
    "Sign in to use AI for free, or add your own Gemini API key in AI Settings.",
  );
}

function computeTimeoutLimit(contents: Content[], opts: CallOptions, defaultShort = 15000): number {
  if (opts.timeoutMs) return opts.timeoutMs;
  const hasImage = contents.some((c) => c.parts.some((p) => "inlineData" in p));
  const totalTextLength = contents.reduce(
    (sum, c) => sum + c.parts.reduce((pSum, p) => pSum + ("text" in p ? p.text.length : 0), 0),
    0,
  );
  // Keep 15s for short requests and use ~60s for image and long-document/quiz requests
  if (hasImage || totalTextLength > 400) {
    return 60000;
  }
  return defaultShort;
}

function ensureReady(): string {
  const auth = getAuthOrKey();
  if (auth.type === "userKey") return auth.key;
  return "proxy";
}


function buildBody(contents: Content[], opts: CallOptions) {
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.4,
  };
  if (opts.maxOutputTokens) generationConfig.maxOutputTokens = opts.maxOutputTokens;
  if (opts.json) {
    generationConfig.responseMimeType = "application/json";
    if (opts.schema) generationConfig.responseSchema = opts.schema;
  }
  const body: Record<string, unknown> = { contents, generationConfig };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  return body;
}

async function toAIError(res: Response): Promise<AIError> {
  let message = "";
  let status = "";
  try {
    const j = await res.json();
    message = j?.error?.message || "";
    status = j?.error?.status || "";
    // Google puts machine-readable reasons (e.g. ACCESS_TOKEN_TYPE_UNSUPPORTED) in details[]
    const reasons = Array.isArray(j?.error?.details)
      ? j.error.details.map((d: { reason?: string }) => d?.reason || "").filter(Boolean)
      : [];
    if (reasons.length) status = `${status} ${reasons.join(" ")}`;
  } catch {
    /* body was not JSON */
  }
  const lower = `${message} ${status}`.toLowerCase();

  if (res.status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return new AIError("quota", "AI usage limit reached. Please wait a minute and try again.");
  }
  if (
    res.status === 401 ||
    lower.includes("api key") ||
    lower.includes("api_key") ||
    lower.includes("access_token_type_unsupported") ||
    lower.includes("leaked") ||
    (res.status === 403 && lower.includes("permission"))
  ) {
    return new AIError(
      "invalid_key",
      "The Gemini API key was rejected (invalid, restricted or disabled). Update it in AI Settings.",
    );
  }
  if (res.status === 404) {
    return new AIError(
      "model",
      `The AI model "${GEMINI_MODEL}" is not available for this API key.`,
    );
  }
  if (res.status >= 500) {
    return new AIError("server", "The AI service is busy right now. Please try again in a moment.");
  }
  console.warn("[AI] Gemini error", res.status, message);
  return new AIError(
    "server",
    message ? `AI error: ${message}` : `AI request failed (HTTP ${res.status}).`,
  );
}

/** Combines the caller's abort signal with a timeout. */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function networkError(err: unknown, didTimeout: boolean): AIError {
  if (err instanceof AIError) return err;
  if (didTimeout)
    return new AIError("timeout", "The AI took too long to respond. Please try again.");
  if (err instanceof Error && err.name === "AbortError")
    return new AIError("aborted", "Request cancelled.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new AIError("offline", "You're offline. Connect to the internet to use AI.");
  }
  return new AIError(
    "network",
    "Couldn't reach the AI service. Check your internet connection and try again.",
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(json: any): string {
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text || "")
        .join("")
    : "";
  if (!text.trim()) {
    const reason = json?.promptFeedback?.blockReason || candidate?.finishReason;
    if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCKLIST") {
      throw new AIError(
        "blocked",
        "The AI couldn't respond to this request because of its safety filters.",
      );
    }
  }
  return text;
}

/** One-shot request with resilient fallback models. */
async function callGemini(contents: Content[], opts: CallOptions = {}): Promise<string> {
  const authConfig = getAuthOrKey();
  const timeoutLimit = computeTimeoutLimit(contents, opts, 15000);

  // If user has no personal key, route request through the server AI proxy
  if (authConfig.type === "serverProxy") {
    const url = getServerEndpoint("/api/ai");
    const t = withTimeout(opts.signal, timeoutLimit);
    try {
      const built = buildBody(contents, opts);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authConfig.token}`,
        },
        body: JSON.stringify({
          contents: built.contents,
          generationConfig: built.generationConfig,
          systemInstruction: built.systemInstruction,
          model: GEMINI_MODEL,
        }),
        signal: t.signal,
      });

      if (!res.ok) {
        let errorMsg = "";
        try {
          const j = await res.json();
          errorMsg = j?.error || "";
        } catch {}
        if (res.status === 429) {
          throw new AIError("quota", errorMsg || "Daily AI usage limit reached. Your limit resets tomorrow.");
        }
        if (res.status === 401) {
          throw new AIError("no_key", errorMsg || "Sign in required to use cloud AI services.");
        }
        if (res.status === 503) {
          throw new AIError("no_key", errorMsg || "Server AI key is not configured. Add a Gemini API key in AI Settings.");
        }
        throw new AIError("server", errorMsg || `AI server error (${res.status}). Please try again.`);
      }

      const data = await res.json();
      const text = extractText(data).trim();
      if (!text) {
        throw new AIError("bad_response", "The AI returned an empty answer. Please try again.");
      }
      return text;
    } catch (err) {
      if (err instanceof AIError) throw err;
      if (err instanceof Error && err.name === "AbortError" && !t.didTimeout()) {
        throw new AIError("aborted", "Request cancelled.");
      }
      throw networkError(err, t.didTimeout());
    } finally {
      t.done();
    }
  }

  // Direct client request when user configured personal key
  const key = authConfig.key;
  const modelsToTry = [GEMINI_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
  const body = JSON.stringify(buildBody(contents, opts));
  let lastErr: unknown;

  for (const model of modelsToTry) {
    const url = `${API_BASE}/models/${model}:generateContent`;
    const t = withTimeout(opts.signal, timeoutLimit);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: t.signal,
      });

      if (!res.ok) {
        const err = await toAIError(res);
        // Quota/rate-limit, invalid key, or client errors must abort immediately without trying other models
        if (err.code === "quota" || err.code === "invalid_key" || res.status === 429) {
          throw err;
        }
        // If server is overloaded (500/503) or model unavailable (404), fall back to next model
        if (res.status >= 500 || res.status === 404) {
          lastErr = err;
          continue;
        }
        throw err;
      }

      const text = extractText(await res.json()).trim();
      if (!text)
        throw new AIError("bad_response", "The AI returned an empty answer. Please try again.");
      return text;
    } catch (err) {
      // Fast abort on non-retryable errors
      if (
        err instanceof AIError &&
        (err.code === "quota" ||
          err.code === "no_key" ||
          err.code === "invalid_key" ||
          err.code === "offline" ||
          err.code === "blocked" ||
          err.code === "bad_input")
      ) {
        throw err;
      }

      // If aborted by user, throw immediately
      if (err instanceof Error && err.name === "AbortError" && !t.didTimeout()) {
        throw new AIError("aborted", "Request cancelled.");
      }

      lastErr = networkError(err, t.didTimeout());
      // If it timed out or stalled, fail fast instead of chaining minutes of retries
      if (t.didTimeout()) {
        break;
      }
    } finally {
      t.done();
    }
  }

  if (lastErr instanceof AIError) throw lastErr;
  throw new AIError("server", "The AI service is busy right now. Please try again in a moment.");
}

export type ConnectionTestResult = {
  ok: boolean;
  /** HTTP status from Google (0 = no response). */
  status: number;
  /** Plain-language verdict for the user. */
  message: string;
  /** Google's own error text, when there was one. */
  detail?: string;
  model: string;
  ms: number;
};

/**
 * Send one tiny request straight to Gemini with `key` (or the configured key) and
 * report exactly what Google answered. Used by the "Test connection" button.
 */
export async function testGeminiConnection(key?: string): Promise<ConnectionTestResult> {
  const apiKey = (key ?? useAISettings.getState().getApiKey()).trim();
  const model = GEMINI_MODEL;
  const t0 = Date.now();
  const done = (r: Omit<ConnectionTestResult, "model" | "ms">): ConnectionTestResult => ({
    ...r,
    model,
    ms: Date.now() - t0,
  });
  if (!apiKey) return done({ ok: false, status: 0, message: "No API key is set." });
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return done({ ok: false, status: 0, message: "This device is offline." });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with exactly one word: connected" }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 },
      }),
      signal: ctrl.signal,
    });
    if (res.ok) {
      const text = extractText(await res.json()).trim();
      return done({
        ok: true,
        status: res.status,
        message: text ? `Connected — Gemini replied "${text.slice(0, 40)}".` : "Connected.",
      });
    }
    let detail = "";
    try {
      const j = await res.clone().json();
      detail = [j?.error?.status, j?.error?.message].filter(Boolean).join(": ");
      const reason = j?.error?.details?.find?.((d: { reason?: string }) => d?.reason)?.reason;
      if (reason) detail += ` (${reason})`;
    } catch {
      /* not JSON */
    }
    const err = await toAIError(res);
    return done({ ok: false, status: res.status, message: err.message, detail: detail || undefined });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return done({
      ok: false,
      status: 0,
      message: aborted
        ? "Google did not answer within 20 seconds."
        : "Could not reach Google (network blocked or no internet).",
      detail: e instanceof Error ? e.message : undefined,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Streaming request (Server-Sent Events) with fallback models. Calls onText with the full text so far. */
async function streamGemini(
  contents: Content[],
  opts: CallOptions & { onText: (fullText: string) => void },
): Promise<string> {
  const authConfig = getAuthOrKey();
  const timeoutLimit = computeTimeoutLimit(contents, opts, 25000);

  if (authConfig.type === "serverProxy") {
    const text = await callGemini(contents, opts);
    opts.onText(text);
    return text;
  }

  const key = authConfig.key;
  const modelsToTry = [GEMINI_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
  let lastErr: unknown;

  for (const model of modelsToTry) {
    const url = `${API_BASE}/models/${model}:streamGenerateContent?alt=sse`;
    const t = withTimeout(opts.signal, timeoutLimit);
    let full = "";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(buildBody(contents, opts)),
        signal: t.signal,
      });
      if (!res.ok) {
        const err = await toAIError(res);
        if (err.code === "quota" || err.code === "invalid_key" || res.status === 429) {
          throw err;
        }
        if (res.status >= 500 || res.status === 404) {
          lastErr = err;
          continue;
        }
        throw err;
      }
      if (!res.body)
        throw new AIError("bad_response", "The AI returned an empty answer. Please try again.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((json as any)?.error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw new AIError("server", `AI error: ${(json as any).error.message || "stream failed"}`);
        }
        const piece = extractText(json);
        if (piece) {
          full += piece;
          opts.onText(full);
        }
      };


      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          handleLine(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
        }
      }
      buffer += decoder.decode();
      if (buffer) handleLine(buffer);

      if (!full.trim())
        throw new AIError("bad_response", "The AI returned an empty answer. Please try again.");
      return full;
    } catch (err) {
      const aiErr = networkError(err, t.didTimeout());
      (aiErr as AIError & { partialText?: string }).partialText = full;
      if (full.length > 0) throw aiErr;
      lastErr = aiErr;
    } finally {
      t.done();
    }
  }

  if (lastErr instanceof AIError) throw lastErr;
  throw new AIError("server", "The AI service is busy right now. Please try again in a moment.");
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

function parseJSON<T>(text: string): T {
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Fall back to the first JSON object/array in the text.
    const start = clean.search(/[[{]/);
    const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new AIError("bad_response", "The AI returned an unreadable answer. Please try again.");
  }
}

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

function range(v: unknown, fallback: [number, number]): [number, number] {
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => typeof n === "number" && isFinite(n)) &&
    v[0] < v[1]
  ) {
    return [v[0], v[1]];
  }
  return fallback;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function shuffleQuestion(q: QuizQuestion): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answerIndex: order.indexOf(q.answerIndex),
  };
}

/** Accepts a plottable expression only if it actually evaluates somewhere on the x-range. */
function validGraphFn(fn: unknown, xr: [number, number]): string | undefined {
  const clean = str(fn)
    .replace(/\bMath\./g, "")
    .replace(/^(y|f\(x\))\s*=\s*/i, "")
    .trim();
  if (!clean || clean.toLowerCase() === "null") return undefined;
  const f = compileMathFunction(clean);
  for (let i = 0; i <= 20; i++) {
    const x = xr[0] + ((xr[1] - xr[0]) * i) / 20;
    if (f(x) !== null) return clean;
  }
  return undefined;
}

// Response schemas (Gemini OpenAPI subset)
const S = {
  string: { type: "STRING" },
  stringArray: { type: "ARRAY", items: { type: "STRING" } },
  numberPair: { type: "ARRAY", items: { type: "NUMBER" } },
};

const MATH_SCHEMA = {
  type: "OBJECT",
  properties: {
    latex: S.string,
    solution: S.string,
    steps: S.stringArray,
    graphableFn: { type: "STRING", nullable: true },
    xRange: S.numberPair,
    yRange: S.numberPair,
    title: S.string,
  },
  required: ["latex", "solution", "steps"],
};

const QUIZ_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      question: S.string,
      options: S.stringArray,
      answerIndex: { type: "INTEGER" },
      explanation: S.string,
    },
    required: ["question", "options", "answerIndex", "explanation"],
  },
};

const FLASHCARD_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { front: S.string, back: S.string },
    required: ["front", "back"],
  },
};

const SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: {
    overview: S.string,
    keyPoints: S.stringArray,
    actionItems: S.stringArray,
    takeaway: S.string,
  },
  required: ["overview", "keyPoints", "actionItems", "takeaway"],
};

const EXPLAIN_SCHEMA = {
  type: "OBJECT",
  properties: { summary: S.string, breakdown: S.stringArray, recommendations: S.stringArray },
  required: ["summary", "breakdown", "recommendations"],
};

const MINDMAP_SCHEMA = {
  type: "OBJECT",
  properties: {
    label: S.string,
    children: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: S.string,
          children: {
            type: "ARRAY",
            items: { type: "OBJECT", properties: { label: S.string }, required: ["label"] },
          },
        },
        required: ["label", "children"],
      },
    },
  },
  required: ["label", "children"],
};

const DIAGRAM_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: S.string,
      type: { type: "STRING", enum: ["start", "process", "decision", "end"] },
      label: S.string,
      x: { type: "NUMBER" },
      y: { type: "NUMBER" },
      w: { type: "NUMBER" },
      h: { type: "NUMBER" },
      connectedTo: S.stringArray,
    },
    required: ["id", "type", "label", "x", "y", "w", "h", "connectedTo"],
  },
};

const STUDY_PLAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: S.string,
    dailyRoutine: S.string,
    phases: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: S.string, tasks: S.stringArray },
        required: ["title", "tasks"],
      },
    },
  },
  required: ["title", "dailyRoutine", "phases"],
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const TUTOR_SYSTEM = `You are Slate AI, a friendly and precise study assistant inside a whiteboard and notes app.
- Answer the user's actual question directly first, then add only the detail that helps.
- Use clean Markdown: short paragraphs, bullet lists, **bold** key terms, and ### headings only for longer answers.
- Write all math in LaTeX: $...$ inline and $$...$$ for display equations.
- For math and science, show clear numbered steps and state the final answer explicitly.
- If the request is ambiguous, make a sensible assumption and say what you assumed.
- Never invent facts about the user's notes; only use the provided board or notes context.`;

const TRANSLATE_SYSTEM =
  "You are a professional translator and handwriting reader. Respond only with JSON matching the schema. Translate meaning naturally, never word-by-word, and always write the translation in the requested script.";

const TRANSLATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    source: { type: "STRING" },
    sourceLanguage: { type: "STRING" },
    translation: { type: "STRING" },
  },
  required: ["source", "sourceLanguage", "translation"],
};

export interface TranslationResult {
  source: string;
  sourceLanguage: string;
  translation: string;
}

function parseTranslation(raw: string): TranslationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = parseJSON<any>(raw);
  const translation = String(p?.translation ?? "").replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!translation) {
    throw new AIError("bad_response", "Couldn't read that — try writing a little larger or clearer.");
  }
  return {
    source: String(p?.source ?? "").trim(),
    sourceLanguage: String(p?.sourceLanguage ?? "").trim(),
    translation,
  };
}

const JSON_SYSTEM =
  "You are an accurate educational content engine. Respond only with JSON that matches the requested schema. Base every item strictly on the provided material.";

const MATH_SYSTEM = `You are an expert mathematics educator and tutor.
Solve the math problem accurately, step-by-step, the way it is written down in top-tier textbooks.

Respond only with JSON matching the schema:
- latex: the problem formatted as standard LaTeX (without enclosing $ signs).
- solution: the final boxed answer only (e.g. "x = 2, -2", "x = 4", "120", or "\\frac{\\pi}{6} + 2k\\pi"), no leading "=".
- steps: 3 to 7 clear pedagogical steps. Each step MUST follow the format "Action Title: equation" (e.g. "Factor the expression: (x - 2)(x + 2) = 0" or "Isolate the variable x: 2x = 14").
- graphableFn: for any algebraic, trigonometric, polynomial, or functional problem, provide a clean plottable function of x using only standard operations (+, -, *, /, ^, sin, cos, tan, sqrt, abs, exp, ln) without "y =" or "f(x) =" (e.g. "x^2 - 4" or "2*x + 6" or "sin(x)"). If purely arithmetic with no variables (e.g. 15 * 8), set to null.
- xRange: [min, max] range appropriate for viewing the roots/behavior (e.g. [-5, 5]).
- yRange: [min, max] range appropriate for the curve.
- title: concise descriptive topic title (e.g. "Quadratic Equation", "Linear System", "Right Triangle Trigonometry", "Definite Integral").`;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class AIEngine {
  /** True when a Gemini key is configured (built-in or user-provided). */
  static isConfigured(): boolean {
    return Boolean(useAISettings.getState().getApiKey());
  }

  // ---- Chat (streaming) ----
  static async chat(
    history: ChatMessage[],
    opts: { contextText?: string; onText: (fullText: string) => void; signal?: AbortSignal },
  ): Promise<{ text: string; sources: ChatSource[] }> {
    const turns = history.filter((m) => m.content.trim()).slice(-20);
    const last = turns[turns.length - 1];
    if (!last || last.role !== "user") throw new AIError("bad_input", "Type a message first.");

    // Relevant snippets from the user's own notes and boards.
    let sources: ChatSource[] = [];
    let notesContext = "";
    try {
      const chunks = retrieveRAGContext(last.content, 3);
      if (chunks.length) {
        notesContext = chunks.map((c, i) => `[${i + 1}] ${c.source}\n${c.text}`).join("\n\n");
        sources = chunks.map((c) => ({
          title: c.source.replace(/^(NOTE|BOARD|FLASHCARD):\s*/i, ""),
        }));
      }
    } catch {
      /* search is optional */
    }

    let system = TUTOR_SYSTEM;
    if (opts.contextText?.trim()) {
      system += `\n\nThe user selected this content on their whiteboard. Treat it as the main subject when relevant:\n"""\n${opts.contextText.trim().slice(0, 4000)}\n"""`;
    }
    if (notesContext) {
      system += `\n\nPossibly relevant excerpts from the user's own notes and boards (use only if they help; mention the source title when you use one):\n${notesContext}`;
    }

    const contents: Content[] = turns.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const text = await streamGemini(contents, {
      system,
      temperature: 0.6,
      signal: opts.signal,
      onText: opts.onText,
    });
    return { text, sources };
  }

  /** Single-turn question (used by features that just need a text answer). */
  static async askAssistant(
    prompt: string,
    contextText?: string,
    imageDataUrl?: string,
  ): Promise<string> {
    if (!prompt.trim()) throw new AIError("bad_input", "Type a question first.");
    const system = contextText?.trim()
      ? `${TUTOR_SYSTEM}\n\nSelected whiteboard content:\n"""\n${contextText.trim().slice(0, 4000)}\n"""`
      : TUTOR_SYSTEM;
    return callGemini(userContent(prompt, imageDataUrl), { system, temperature: 0.6 });
  }

  // ---- Handwriting → text ----
  static async transcribeHandwriting(
    imageDataUrl?: string,
    languageHint?: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<string> {
    if (!imageDataUrl) throw new AIError("bad_input", "Select some handwriting first.");
    const langClause = languageHint
      ? ` The expected language/script is ${languageHint} or English/Latin. Transcribe in the native script for ${languageHint}, or English if written in English.`
      : "";
    const text = await callGemini(
      userContent(
        `Transcribe whatever handwritten text, characters, letters, glyphs, words, numbers, or math are written in this image exactly as written.${langClause} Even if it is a single character, letter, symbol, or digit, output that character (for example: 'H', '1', 'क', 'a'). Output ONLY the transcribed characters without code fences, quotes, or commentary. Only output [unreadable] if the image is completely blank, accidental noise, or contains no characters/symbols at all.`,
        imageDataUrl,
      ),
      { temperature: 0, ...opts },
    );
    const clean = text.replace(/^```\w*\s*|```$/g, "").replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!clean || /^\[unreadable\]$/i.test(clean)) {
      throw new AIError(
        "bad_response",
        "Couldn't read the handwriting. Try writing a little larger or clearer.",
      );
    }
    return clean;
  }

  // ---- Translation (handwriting or text → any language, in the right script) ----
  /**
   * Reads handwriting from an image and translates it. `target` is the language
   * name (e.g. "Hindi (हिन्दी)") and `script` the writing system to answer in.
   */
  static async translateHandwriting(
    imageDataUrl: string | undefined,
    target: string,
    script: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<TranslationResult> {
    if (!imageDataUrl) throw new AIError("bad_input", "Select some handwriting first.");
    const raw = await callGemini(
      userContent(
        `Read the handwritten text in this image (it may be in any language or script). Then translate it into ${target}, written in ${script} script, the way a fluent native speaker would naturally write it.
Return JSON with:
- source: the handwriting exactly as written (keep its original script)
- sourceLanguage: the English name of the language it is written in
- translation: the translation in ${target} (${script} script). Keep numbers, names, units and math as they are. Keep line breaks. If it is already in ${target}, return it unchanged (fix obvious spelling only).
Even if it is a single word, greeting, letter, character, or digit, accurately transcribe and translate it. Only return empty strings if the image is completely blank, accidental noise, or contains no characters/symbols at all.`,
        imageDataUrl,
      ),
      { system: TRANSLATE_SYSTEM, json: true, schema: TRANSLATION_SCHEMA, temperature: 0.1, ...opts },
    );
    return parseTranslation(raw);
  }

  /** Translates typed text into `target` (written in `script`). */
  static async translateText(
    text: string,
    target: string,
    script: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<TranslationResult> {
    const clean = text.trim();
    if (!clean) throw new AIError("bad_input", "There's no text to translate.");
    const raw = await callGemini(
      userContent(
        `Translate this text into ${target}, written in ${script} script, the way a fluent native speaker would naturally write it. Keep numbers, names, units and math as they are. Keep line breaks. If it is already in ${target}, return it unchanged.
Return JSON with source (the text as given), sourceLanguage (English name of its language) and translation.

TEXT:
${clean.slice(0, 8000)}`,
      ),
      { system: TRANSLATE_SYSTEM, json: true, schema: TRANSLATION_SCHEMA, temperature: 0.1, ...opts },
    );
    const r = parseTranslation(raw);
    return { ...r, source: r.source || clean };
  }

  // ---- Handwriting → LaTeX ----
  static async recognizeMath(imageDataUrl?: string): Promise<string> {
    if (!imageDataUrl) throw new AIError("bad_input", "Select a handwritten formula first.");
    const text = await callGemini(
      userContent(
        "Convert the handwritten math in this image to LaTeX. Output only the LaTeX expression, without $ signs, code fences or explanation. If there is no math, output exactly: [none]",
        imageDataUrl,
      ),
      { temperature: 0 },
    );
    const latex = text
      .replace(/^```\w*\s*|```$/g, "")
      .replace(/^\$+|\$+$/g, "")
      .trim();
    if (!latex || /^\[none\]$/i.test(latex)) {
      throw new AIError("bad_response", "Couldn't find a formula in the selection.");
    }
    return latex;
  }

  // ---- Math solver (typed formula and/or handwriting image) ----
  static async solveMath(formula?: string, imageDataUrl?: string): Promise<MathSolveResult> {
    const typed = formula?.trim() || "";
    if (!typed && !imageDataUrl)
      throw new AIError("bad_input", "Enter or select a math problem first.");
    const prompt = typed
      ? `Solve this problem: ${typed}${imageDataUrl ? "\n(The image shows the same problem as written on the board.)" : ""}`
      : "Solve the math problem written in this image.";

    const raw = await callGemini(userContent(prompt, imageDataUrl), {
      system: MATH_SYSTEM,
      json: true,
      schema: MATH_SCHEMA,
      temperature: 0.1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parseJSON<any>(raw);
    const solution = str(p.solution).replace(/^=\s*/, "");
    const steps = strList(p.steps);
    if (!solution)
      throw new AIError(
        "bad_response",
        "The AI couldn't solve this problem. Check that it's written clearly.",
      );

    const xRange = range(p.xRange, [-6, 6]);
    return {
      latex: str(p.latex) || typed,
      solution,
      steps,
      graphableFn: validGraphFn(p.graphableFn, xRange),
      xRange,
      yRange: range(p.yRange, [-5, 8]),
      title: str(p.title) || undefined,
    };
  }

  // ---- Hand-drawn diagram → flowchart ----
  static async convertDiagram(
    imageDataUrl: string | undefined,
    _title = "Process Flow",
    startX = 300,
    startY = 200,
    scale = 1,
    pad = 24,
  ): Promise<FlowchartNode[]> {
    if (!imageDataUrl) throw new AIError("bad_input", "Select a hand-drawn diagram first.");
    const raw = await callGemini(
      userContent(
        `Convert this hand-drawn flowchart/diagram into nodes.
For every box/shape give: id, type ("start" for start/begin ovals, "end" for end/stop ovals, "decision" for diamonds/questions, otherwise "process"), the text inside it as label, and its position and size in image pixels (x, y = top-left corner; w, h).
connectedTo lists the ids each node's arrows point to. Use an empty array when there are none.`,
        imageDataUrl,
      ),
      { system: JSON_SYSTEM, json: true, schema: DIAGRAM_SCHEMA, temperature: 0.1 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parseJSON<any[]>(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new AIError("bad_response", "Couldn't find any diagram boxes in the selection.");
    }

    const idMap = new Map<string, string>();
    parsed.forEach((n, i) => idMap.set(str(n?.id) || `n${i}`, newId("node")));
    const types = ["start", "process", "decision", "end"] as const;
    const s = scale > 0 ? scale : 1;

    return parsed.map((n, i) => {
      const t = types.includes(n?.type) ? (n.type as FlowchartNode["type"]) : "process";
      const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
      return {
        id: idMap.get(str(n?.id) || `n${i}`)!,
        type: t,
        label: str(n?.label) || "Step",
        x: startX + num(n?.x, i * 220) / s - pad,
        y: startY + num(n?.y, 0) / s - pad,
        w: Math.max(80, num(n?.w, 180) / s),
        h: Math.max(44, num(n?.h, 60) / s),
        connectedTo: strList(n?.connectedTo)
          .map((target) => idMap.get(target))
          .filter((v): v is string => Boolean(v)),
      };
    });
  }

  // ---- Explain the board (vision) ----
  static async explainBoard(imageDataUrl: string, boardContext = ""): Promise<BoardExplanation> {
    const raw = await callGemini(
      userContent(
        `Explain what is on this whiteboard for a student.${boardContext ? `\nText found on the board:\n${boardContext}` : ""}
summary: 1–2 sentences on what the board is about.
breakdown: 3–5 key ideas shown on the board, each one sentence.
recommendations: 3 concrete next steps (something to verify, a practice question, a related topic).`,
        imageDataUrl,
      ),
      { system: JSON_SYSTEM, json: true, schema: EXPLAIN_SCHEMA, temperature: 0.3 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parseJSON<any>(raw);
    const summary = str(p.summary);
    if (!summary)
      throw new AIError("bad_response", "The AI couldn't analyse this board. Please try again.");
    return {
      summary,
      breakdown: strList(p.breakdown),
      recommendations: strList(p.recommendations),
    };
  }

  // ---- Note / document summary ----
  static async summarizeNote(title: string, blocks: string[]): Promise<NoteSummary> {
    const content = blocks.join("\n").trim();
    if (content.length < 20) throw new AIError("bad_input", "Add more content before summarizing.");
    const raw = await callGemini(
      userContent(
        `Summarize this material titled "${title}".
overview: 2 sentences. keyPoints: 3–6 most important points. actionItems: concrete follow-ups (empty array if none). takeaway: one memorable sentence.

MATERIAL:
${content.slice(0, 60000)}`,
      ),
      { system: JSON_SYSTEM, json: true, schema: SUMMARY_SCHEMA, temperature: 0.3 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parseJSON<any>(raw);
    const overview = str(p.overview);
    if (!overview)
      throw new AIError("bad_response", "The AI couldn't summarize this. Please try again.");
    return {
      overview,
      keyPoints: strList(p.keyPoints),
      actionItems: strList(p.actionItems),
      takeaway: str(p.takeaway),
    };
  }

  // ---- Quiz ----
  static async generateQuiz(content: string, title?: string, count = 5): Promise<QuizQuestion[]> {
    if (content.trim().length < 20)
      throw new AIError("bad_input", "Add more content before generating a quiz.");
    const raw = await callGemini(
      userContent(
        `Write ${count} multiple-choice questions that test understanding of this material${title ? ` ("${title}")` : ""}.
Each question has exactly 4 options, one correct answer (answerIndex is its 0-based position), plausible wrong options, and a one-sentence explanation.

MATERIAL:
${content.slice(0, 60000)}`,
      ),
      { system: JSON_SYSTEM, json: true, schema: QUIZ_SCHEMA, temperature: 0.4 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parseJSON<any[]>(raw);
    const questions: QuizQuestion[] = (Array.isArray(parsed) ? parsed : [])
      .map((q) => ({
        question: str(q?.question),
        options: strList(q?.options),
        answerIndex: Number(q?.answerIndex),
        explanation: str(q?.explanation) || undefined,
      }))
      .filter(
        (q) =>
          q.question &&
          q.options.length >= 2 &&
          Number.isInteger(q.answerIndex) &&
          q.answerIndex >= 0 &&
          q.answerIndex < q.options.length,
      )
      .map(shuffleQuestion);
    if (!questions.length)
      throw new AIError(
        "bad_response",
        "The AI couldn't create a quiz from this. Please try again.",
      );
    return questions;
  }

  // ---- Flashcards ----
  static async generateFlashcards(
    content: string,
    title?: string,
    count = 6,
  ): Promise<FlashcardItem[]> {
    if (content.trim().length < 3)
      throw new AIError("bad_input", "Add some content before generating flashcards.");
    const raw = await callGemini(
      userContent(
        `Create up to ${count} spaced-repetition flashcards from this material${title ? ` ("${title}")` : ""}.
front: a short question or term. back: a concise, correct answer (max ~30 words). Cover the most important facts first. If the material is only a topic name, make cards about that topic's core ideas.

MATERIAL:
${content.slice(0, 60000)}`,
      ),
      { system: JSON_SYSTEM, json: true, schema: FLASHCARD_SCHEMA, temperature: 0.3 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parseJSON<any[]>(raw);
    const cards = (Array.isArray(parsed) ? parsed : [])
      .map((c) => ({ front: str(c?.front), back: str(c?.back) }))
      .filter((c) => c.front && c.back);
    if (!cards.length)
      throw new AIError(
        "bad_response",
        "The AI couldn't create flashcards from this. Please try again.",
      );
    return cards;
  }

  // ---- Mind map ----
  static async generateMindMap(topic: string, startX = 600, startY = 400): Promise<MindMapNode> {
    if (!topic.trim()) throw new AIError("bad_input", "Enter a topic for the mind map.");
    const raw = await callGemini(
      userContent(
        `Create a concept mind map for: "${topic.trim().slice(0, 2000)}".
label: the central topic in 1–5 words. children: 4–6 main branches, each with 2–4 short sub-concepts (1–5 words each).`,
      ),
      { system: JSON_SYSTEM, json: true, schema: MINDMAP_SCHEMA, temperature: 0.4 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parseJSON<any>(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branches: any[] = Array.isArray(p?.children)
      ? p.children.filter((b: any) => str(b?.label))
      : [];
    if (!branches.length)
      throw new AIError("bad_response", "The AI couldn't build a mind map. Please try again.");

    const root: MindMapNode = {
      id: newId("mm-root"),
      label: str(p.label) || topic.trim().slice(0, 40),
      x: startX,
      y: startY,
      level: 0,
      color: "#6366f1",
      children: [],
    };
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
    branches.forEach((b, i) => {
      const angle = (i * 2 * Math.PI) / branches.length - Math.PI / 2;
      const bx = startX + Math.cos(angle) * 260;
      const by = startY + Math.sin(angle) * 220;
      const col = colors[i % colors.length];
      const bNode: MindMapNode = {
        id: newId("mm-b"),
        label: str(b.label),
        x: bx,
        y: by,
        level: 1,
        color: col,
        parentId: root.id,
        children: [],
      };
      const subs = strList(
        Array.isArray(b.children) ? b.children.map((c: { label?: string }) => c?.label) : [],
      );
      subs.forEach((label, j) => {
        const spread = 0.9;
        const subAngle =
          subs.length > 1 ? angle - spread / 2 + (j * spread) / (subs.length - 1) : angle;
        bNode.children!.push({
          id: newId("mm-s"),
          label,
          x: bx + Math.cos(subAngle) * 180,
          y: by + Math.sin(subAngle) * 120,
          level: 2,
          color: col,
          parentId: bNode.id,
        });
      });
      root.children!.push(bNode);
    });
    return root;
  }

  // ---- Study planner ----
  static async generateStudyPlan(goal: string, days = 14, hours = "2"): Promise<StudyPlan> {
    if (!goal.trim()) throw new AIError("bad_input", "Enter what you want to study.");
    const raw = await callGemini(
      userContent(
        `Create a realistic study plan for: "${goal.trim()}".
Duration: ${days} days, about ${hours} hours per day.
title: a short plan title. dailyRoutine: how to split each day's ${hours} hours.
phases: 3–4 phases covering all ${days} days in order; put the day range in each phase title (e.g. "Phase 1: Foundations (Days 1–4)"); 3–6 specific tasks per phase that name actual topics for this goal.`,
      ),
      { system: JSON_SYSTEM, json: true, schema: STUDY_PLAN_SCHEMA, temperature: 0.4 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parseJSON<any>(raw);
    const phases = (Array.isArray(p?.phases) ? p.phases : [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ph: any) => ({ title: str(ph?.title) || "Study phase", tasks: strList(ph?.tasks) }))
      .filter((ph: { tasks: string[] }) => ph.tasks.length);
    if (!phases.length)
      throw new AIError("bad_response", "The AI couldn't build a plan. Please try again.");
    return {
      title: str(p.title) || `${goal.trim()} study plan`,
      phases,
      dailyRoutine: str(p.dailyRoutine),
    };
  }
}
