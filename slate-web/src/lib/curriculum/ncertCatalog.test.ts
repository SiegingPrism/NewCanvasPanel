import { describe, it, expect } from "vitest";
import {
  NCERT_CATALOG,
  queryBooks,
  findByDikshaDialCode,
  checkForOfficialUpdates,
} from "./ncertCatalog";

describe("NCERT & State Board Textbook Catalog & Auto-Sync", () => {
  it("provides comprehensive coverage across Class 1 to 12", () => {
    const grades = new Set(NCERT_CATALOG.map((b) => b.grade));
    expect(grades.has(12)).toBe(true);
    expect(grades.has(10)).toBe(true);
    expect(grades.has(5)).toBe(true);
    expect(grades.has(1)).toBe(true);
  });

  it("covers all Class 12 streams: Science, Commerce, and Arts/Humanities", () => {
    const class12Books = NCERT_CATALOG.filter((b) => b.grade === 12);
    const branches = new Set(class12Books.map((b) => b.branch));

    expect(branches.has("science")).toBe(true);
    expect(branches.has("commerce")).toBe(true);
    expect(branches.has("arts")).toBe(true);

    // Verify key subjects exist
    const subjects = class12Books.map((b) => b.subject);
    expect(subjects).toContain("Physics");
    expect(subjects).toContain("Chemistry");
    expect(subjects).toContain("Mathematics");
    expect(subjects).toContain("Biology");
    expect(subjects).toContain("Accountancy");
    expect(subjects).toContain("Business Studies");
    expect(subjects).toContain("Economics");
    expect(subjects).toContain("History");
    expect(subjects).toContain("Political Science");
  });

  it("supports state board textbooks (e.g. Maharashtra Balbharti)", () => {
    const msbBooks = NCERT_CATALOG.filter((b) => b.board === "maharashtra");
    expect(msbBooks.length).toBeGreaterThan(0);
    expect(msbBooks.some((b) => b.medium === "marathi")).toBe(true);
    expect(msbBooks.some((b) => b.medium === "english")).toBe(true);
  });

  it("resolves chapters by 6-character DIKSHA DIAL codes", () => {
    const match = findByDikshaDialCode("U1R9C1");
    expect(match).not.toBeNull();
    expect(match?.book.subject).toBe("Physics");
    expect(match?.chapter.title).toBe("Electric Charges and Fields");
  });

  it("filters books by grade, branch, and keyword query", () => {
    const science12 = queryBooks({ grade: 12, branch: "science" });
    expect(science12.length).toBeGreaterThanOrEqual(4);

    const searchElectro = queryBooks({ searchQuery: "Electrostatic" });
    expect(searchElectro.length).toBeGreaterThan(0);
    expect(searchElectro[0].chapters.some((c) => c.title.includes("Electrostatic"))).toBe(true);
  });

  it("checks for official updates and reports live sync status", async () => {
    const res = await checkForOfficialUpdates();
    expect(res).toHaveProperty("status");
    expect(res.status.isOnline).toBe(true);
    expect(res.status.sourcePortal).toContain("ncert.nic.in");
  });
});

