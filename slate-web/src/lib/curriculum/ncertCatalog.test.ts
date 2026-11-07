import { describe, it, expect, beforeEach } from "vitest";
import {
  NCERT_CATALOG,
  queryBooks,
  isTextbookLibraryPermitted,
  setTextbookLibraryPermitted,
  syncCatalogWithServer,
} from "./ncertCatalog";

const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => store.set(key, String(val)),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("NCERT Official Curriculum Textbook Catalog", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("provides comprehensive coverage across Class 1 to 12", () => {
    const grades = new Set(NCERT_CATALOG.map((b) => b.grade));
    expect(grades.has(12)).toBe(true);
    expect(grades.has(11)).toBe(true);
    expect(grades.has(10)).toBe(true);
    expect(grades.has(9)).toBe(true);
    expect(grades.has(8)).toBe(true);
    expect(grades.has(7)).toBe(true);
    expect(grades.has(6)).toBe(true);
    expect(grades.has(5)).toBe(true);
    expect(grades.has(4)).toBe(true);
    expect(grades.has(3)).toBe(true);
    expect(grades.has(2)).toBe(true);
    expect(grades.has(1)).toBe(true);
  });

  it("covers all Class 12 streams: Science, Commerce, and Arts with Microeconomics and Pol Science Part 2", () => {
    const class12Books = NCERT_CATALOG.filter((b) => b.grade === 12);
    const branches = new Set(class12Books.map((b) => b.branch));

    expect(branches.has("science")).toBe(true);
    expect(branches.has("commerce")).toBe(true);
    expect(branches.has("arts")).toBe(true);

    // Verify key subjects and specific required books exist
    const bookTitles = class12Books.map((b) => b.title);
    expect(bookTitles).toContain("Introductory Microeconomics (Class 12)");
    expect(bookTitles).toContain("Introductory Macroeconomics (Class 12)");
    expect(bookTitles).toContain("Politics in India since Independence (Class 12)");
    expect(bookTitles).toContain("Contemporary World Politics (Class 12)");

    const micro = class12Books.find((b) => b.id === "ncert-class-12-microeconomics");
    expect(micro).toBeDefined();
    expect(micro?.chapters.length).toBe(6);
    expect(micro?.chapters[0].pdfCode).toBe("leec201.pdf");

    const pol2 = class12Books.find((b) => b.id === "ncert-class-12-pol-science-2");
    expect(pol2).toBeDefined();
    expect(pol2?.chapters.length).toBe(8);
    expect(pol2?.chapters[0].pdfCode).toBe("leps201.pdf");
  });

  it("provides complete chapter sets without artificial truncation", () => {
    // Class 11 Mathematics must have all 14 chapters
    const math11 = NCERT_CATALOG.find((b) => b.id === "ncert-class-11-math");
    expect(math11).toBeDefined();
    expect(math11?.chapters.length).toBe(14);
    expect(math11?.chapters[13].pdfCode).toBe("kemh114.pdf");

    // Class 1 Joyful Mathematics must have all 13 chapters
    const joyfulMath1 = NCERT_CATALOG.find((b) => b.id === "ncert-class-1-math-joyful");
    expect(joyfulMath1).toBeDefined();
    expect(joyfulMath1?.chapters.length).toBe(13);
    expect(joyfulMath1?.chapters[12].pdfCode).toBe("aejm113.pdf");

    // Class 9 Science Exploration has all 12 chapters
    const sci9 = NCERT_CATALOG.find((b) => b.id === "ncert-class-9-science-exploration");
    expect(sci9).toBeDefined();
    expect(sci9?.chapters.length).toBe(12);
  });

  it("maps chapters strictly to official ncert.nic.in URLs", () => {
    for (const book of NCERT_CATALOG) {
      for (const ch of book.chapters) {
        expect(ch.officialUrl).toMatch(/^https:\/\/ncert\.nic\.in\/textbook\/pdf\/[a-z0-9]+\.pdf$/);
      }
    }
  });

  it("supports institutional permission flag (disabled by default)", () => {
    expect(isTextbookLibraryPermitted()).toBe(false);

    setTextbookLibraryPermitted(true);
    expect(isTextbookLibraryPermitted()).toBe(true);

    setTextbookLibraryPermitted(false);
    expect(isTextbookLibraryPermitted()).toBe(false);
  });

  it("filters books by grade, branch, and keyword query", () => {
    const science12 = queryBooks({ grade: 12, branch: "science" });
    expect(science12.length).toBeGreaterThanOrEqual(3);

    const searchElectro = queryBooks({ searchQuery: "Electrostatic" });
    expect(searchElectro.length).toBeGreaterThan(0);
    expect(searchElectro[0].chapters.some((c) => c.title.includes("Electrostatic"))).toBe(true);
  });

  it("provides honest server catalog check with clean offline fallback", async () => {
    const res = await syncCatalogWithServer(true);
    expect(res).toHaveProperty("result");
    expect(["server", "bundled", "cache"]).toContain(res.result.source);
    expect(res.catalog.length).toBeGreaterThan(0);
  });
});
