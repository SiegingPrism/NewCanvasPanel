import { describe, it, expect, beforeEach } from "vitest";
import { useWhiteboard } from "./store";
import { TEMPLATES } from "./templates";
import type { PenStroke } from "./types";

describe("New Page Picker & Store Operations", () => {
  beforeEach(() => {
    // Reset state to a simple single page
    useWhiteboard.setState({
      pages: [
        {
          id: "page-1",
          background: "white",
          objects: [
            {
              id: "stroke-1",
              kind: "pen",
              color: "#000000",
              size: 4,
              points: [
                { x: 10, y: 10, p: 1 },
                { x: 20, y: 20, p: 1 },
              ],
            } as PenStroke,
          ],
        },
      ],
      activePageId: "page-1",
      history: [],
      historyIndex: -1,
      selectedId: null,
      selectedIds: [],
    });
  });

  it("duplicates active page with new IDs and pushes to history", () => {
    const { duplicatePage } = useWhiteboard.getState();
    duplicatePage();

    const state = useWhiteboard.getState();
    expect(state.pages.length).toBe(2);
    expect(state.pages[0].id).toBe("page-1");

    const duplicatedPage = state.pages[1];
    expect(duplicatedPage.id).not.toBe("page-1");
    expect(state.activePageId).toBe(duplicatedPage.id);
    expect(duplicatedPage.objects.length).toBe(1);
    expect(duplicatedPage.objects[0].id).not.toBe("stroke-1");
    expect(duplicatedPage.background).toBe("white");
    expect(state.history.length).toBeGreaterThan(0);
  });

  it("adds a template page with addPageWithTemplate", () => {
    const { addPageWithTemplate } = useWhiteboard.getState();
    addPageWithTemplate("cornell");

    const state = useWhiteboard.getState();
    expect(state.pages.length).toBe(2);
    const cornellPage = state.pages[1];
    expect(state.activePageId).toBe(cornellPage.id);
    expect(cornellPage.objects.length).toBeGreaterThan(0);
  });

  it("TEMPLATES includes Geography and Arts & Music categories", () => {
    const geographyTemplates = TEMPLATES.filter((t) => t.category === "Geography");
    expect(geographyTemplates.map((t) => t.key)).toContain("world-map");
    expect(geographyTemplates.map((t) => t.key)).toContain("india-map");

    const musicTemplates = TEMPLATES.filter((t) => t.category === "Arts & Music");
    expect(musicTemplates.map((t) => t.key)).toContain("music-staves");
  });
});
