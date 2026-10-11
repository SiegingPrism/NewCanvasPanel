import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AIEngine,
  AIError,
  aiErrorMessage,
  verifyRootsWithSafeMath,
  parseCandidateRoots,
} from "./aiEngine";
import { useAISettings } from "./aiSettingsStore";

function geminiResponse(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AIEngine (online-only)", () => {
  beforeEach(() => {
    useAISettings.setState({ geminiKey: "test-key" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws a no_key error when no API key is configured", async () => {
    useAISettings.setState({ geminiKey: "", getApiKey: () => "" });
    await expect(AIEngine.askAssistant("hi")).rejects.toMatchObject({ code: "no_key" });
    useAISettings.setState({ getApiKey: () => useAISettings.getState().geminiKey });
  });

  it("sends the key in a header, never in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse("Hello"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(AIEngine.askAssistant("hi")).resolves.toBe("Hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("key=");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("maps HTTP 429 to a friendly quota error and does not retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Quota", status: "RESOURCE_EXHAUSTED" } }),
          { status: 429 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const err = await AIEngine.askAssistant("hi").catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect(err.code).toBe("quota");
    expect(aiErrorMessage(err)).toMatch(/limit/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a rejected key to invalid_key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "API key not valid. Please pass a valid API key.",
              status: "INVALID_ARGUMENT",
            },
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(AIEngine.askAssistant("hi")).rejects.toMatchObject({ code: "invalid_key" });
  });

  it("validates quiz output and keeps the correct answer after shuffling", async () => {
    const quiz = [
      {
        question: "2 + 2 = ?",
        options: ["4", "3", "5", "22"],
        answerIndex: 0,
        explanation: "Basic addition.",
      },
      { question: "Broken", options: ["a"], answerIndex: 3, explanation: "" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(quiz))));
    const out = await AIEngine.generateQuiz("Some study material about arithmetic and numbers.");
    expect(out).toHaveLength(1);
    expect(out[0].options[out[0].answerIndex]).toBe("4");
  });

  it("drops graph functions that cannot be plotted", async () => {
    const res = {
      latex: "x^2=9",
      solution: "x = 3, -3",
      steps: ["Take square roots: x = \\pm 3"],
      graphableFn: "Math.pow(x)",
      xRange: [-6, 6],
      yRange: [-5, 8],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(res))));
    const out = await AIEngine.solveMath("x^2 = 9");
    expect(out.solution).toBe("x = 3, -3");
    expect(out.graphableFn).toBeUndefined();
  });

  it("keeps a valid graph function and strips Math. prefixes", async () => {
    const res = {
      latex: "y=sin(x)",
      solution: "periodic",
      steps: ["a"],
      graphableFn: "Math.sin(x)",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(res))));
    const out = await AIEngine.solveMath("y = sin(x)");
    expect(out.graphableFn).toBe("sin(x)");
  });

  it("streams chat text and returns the full answer", async () => {
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\r\n\r\n' +
      'data: {"candidates":[{"content":{"parts":[{"text":"lo!"}]}}]}\r\n\r\n';
    const body = new ReadableStream({
      start(c) {
        const enc = new TextEncoder();
        // Split in the middle of a line to test buffering across chunks.
        c.enqueue(enc.encode(sse.slice(0, 30)));
        c.enqueue(enc.encode(sse.slice(30)));
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const seen: string[] = [];
    const { text } = await AIEngine.chat([{ role: "user", content: "hi" }], {
      onText: (t) => seen.push(t),
    });
    expect(text).toBe("Hello!");
    expect(seen.at(-1)).toBe("Hello!");
  });

  it("routes through server proxy when user has no personal key but has Supabase session", async () => {
    const { useAuth } = await import("@/lib/supabase/authStore");
    useAISettings.setState({ geminiKey: "", getApiKey: () => "" });
    useAuth.setState({
      session: {
        access_token: "mock-supabase-token",
        user: { id: "user-123" } as any,
      } as any,
    });

    const fetchMock = vi.fn().mockResolvedValue(geminiResponse("Proxy response"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await AIEngine.askAssistant("help me with math");
    expect(result).toBe("Proxy response");
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/ai");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer mock-supabase-token",
    );

    // Clean up
    useAuth.setState({ session: null, user: null });
    useAISettings.setState({ getApiKey: () => useAISettings.getState().geminiKey });
  });

  it("handles long-document quiz generation cleanly without truncation", async () => {
    const longDocument =
      "Photosynthesis is the biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy stored in glucose molecules. ".repeat(
        100,
      );
    const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
      question: `Question ${i + 1} regarding the biochemical mechanisms of photosynthesis?`,
      options: [
        "Photolysis of water",
        "Calvin cycle fixation",
        "ATP synthase rotation",
        "Chlorophyll excitation",
      ],
      answerIndex: 1,
      explanation: `Detailed explanation for question ${i + 1} describing carbon fixation in chloroplasts.`,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(mockQuestions))),
    );
    const out = await AIEngine.generateQuiz(longDocument, "Cellular Biology", 10);
    expect(out).toHaveLength(10);
    expect(out[0].options).toHaveLength(4);
    expect(out[0].explanation).toBeDefined();
  });

  describe("Math answer verification", () => {
    it("parses fractions like x = \\frac{3}{2} and verifies correctly without false failure", () => {
      const roots = parseCandidateRoots("x = \\frac{3}{2}");
      expect(roots).toEqual([1.5]);
      expect(verifyRootsWithSafeMath("2x - 3 = 0", "x = \\frac{3}{2}")).toBe(true);
    });

    it("parses square roots and ± / \\pm like ±√2 and \\pm\\sqrt{2}", () => {
      const roots = parseCandidateRoots("x = \\pm\\sqrt{2}");
      expect(roots).toBeDefined();
      expect(roots).toHaveLength(2);
      expect(roots![0]).toBeCloseTo(1.4142, 3);
      expect(roots![1]).toBeCloseTo(-1.4142, 3);
      expect(verifyRootsWithSafeMath("x^2 - 2 = 0", "x = \\pm\\sqrt{2}")).toBe(true);
      expect(verifyRootsWithSafeMath("x^2 - 2 = 0", "±√2")).toBe(true);
    });

    it("parses complex expressions like 1 ± √2 and verifies against quadratic", () => {
      const roots = parseCandidateRoots("1 \\pm \\sqrt{2}");
      expect(roots).toHaveLength(2);
      expect(roots![0]).toBeCloseTo(2.4142, 3);
      expect(roots![1]).toBeCloseTo(-0.4142, 3);
      expect(verifyRootsWithSafeMath("x^2 - 2x - 1 = 0", "1 \\pm \\sqrt{2}")).toBe(true);
    });

    it("treats periodic families like π/6 + 2kπ as can't check (undefined), never false", () => {
      expect(parseCandidateRoots("\\pi/6 + 2k\\pi")).toBeNull();
      expect(verifyRootsWithSafeMath("\\sin(x) = 1/2", "\\pi/6 + 2k\\pi")).toBeUndefined();
      expect(verifyRootsWithSafeMath("y = \\cos(x)", "x = \\pi/2 + k\\pi")).toBeUndefined();
    });

    it("correctly identifies genuinely wrong roots as false", () => {
      // 5 violates x^2 = 9
      expect(verifyRootsWithSafeMath("x^2 = 9", "x = 5")).toBe(false);
      // x = 1 violates 2x - 3 = 0
      expect(verifyRootsWithSafeMath("2x - 3 = 0", "x = 1")).toBe(false);
    });
  });
});

describe("AIEngine speed settings", () => {
  beforeEach(() => {
    useAISettings.setState({ geminiKey: "test-key" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets an explicit thinking level (Gemini 3 defaults to slow 'high')", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse("Hello"));
    vi.stubGlobal("fetch", fetchMock);
    await AIEngine.askAssistant("hi");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  it("uses a deeper thinking level for math solving", async () => {
    const res = {
      latex: "2x = 4",
      solution: "x = 2",
      steps: ["Divide by 2: x = 2"],
      graphableFn: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(res)));
    vi.stubGlobal("fetch", fetchMock);
    await AIEngine.solveMath("2x = 4");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "medium" });
  });

  it("retries without thinkingConfig if the API rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message:
                "Invalid JSON payload: Unknown name \"thinkingLevel\" at 'generation_config.thinking_config'",
              status: "INVALID_ARGUMENT",
            },
          }),
          { status: 400 },
        ),
      )
      .mockResolvedValue(geminiResponse("Hello"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(AIEngine.askAssistant("hi")).resolves.toBe("Hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retryBody.generationConfig.thinkingConfig).toBeUndefined();
  });

  it("does not cut off a long streamed answer that keeps sending text", async () => {
    vi.useFakeTimers();
    const enc = new TextEncoder();
    const chunk = (t: string) =>
      enc.encode(`data: {"candidates":[{"content":{"parts":[{"text":"${t}"}]}}]}\n\n`);
    const body = new ReadableStream({
      async start(c) {
        // 8 chunks, 10 s apart = 80 s total, far longer than the 25 s stream timeout.
        for (let i = 0; i < 8; i++) {
          c.enqueue(chunk(`p${i} `));
          await new Promise((r) => setTimeout(r, 10000));
        }
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const p = AIEngine.chat([{ role: "user", content: "write a long lesson plan" }], {
      onText: () => {},
    });
    await vi.advanceTimersByTimeAsync(90000);
    const { text } = await p;
    expect(text).toBe("p0 p1 p2 p3 p4 p5 p6 p7 ");
  });

  it("does not restart on a backup model after a timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_, reject) => {
          const fail = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          if (init.signal?.aborted) fail();
          else init.signal?.addEventListener("abort", fail);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = AIEngine.chat([{ role: "user", content: "hi" }], { onText: () => {} }).catch(
      (e) => e,
    );
    await vi.advanceTimersByTimeAsync(130000);
    const err = await p;
    expect(err.code).toBe("timeout");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
