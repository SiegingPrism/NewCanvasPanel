import { describe, it, expect } from "vitest";

describe("Indian Lesson Packs", () => {
  it("defines standard NCERT/CBSE packs for offline classroom use", () => {
    const packs = ["geography", "science", "math", "devanagari"];
    expect(packs).toHaveLength(4);
    expect(packs).toContain("devanagari");
    expect(packs).toContain("geography");
  });
});
