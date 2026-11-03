import { describe, expect, it } from "vitest";
import { layoutMindMap, type MindMapNode } from "./aiEngine";

/** Builds a map the same way generateMindMap does (x/y = centres before layout). */
function radial(branches: [string, string[]][], sx = 600, sy = 400): MindMapNode {
  const root: MindMapNode = { id: "r", label: "Photosynthesis in green plants", x: sx, y: sy, w: 0, h: 0, level: 0, color: "#000", children: [] };
  branches.forEach(([bl, subs], i) => {
    const angle = (i * 2 * Math.PI) / branches.length - Math.PI / 2;
    const bx = sx + Math.cos(angle) * 300, by = sy + Math.sin(angle) * 230;
    const b: MindMapNode = { id: "b" + i, label: bl, x: bx, y: by, w: 0, h: 0, level: 1, color: "#000", parentId: "r", children: [] };
    subs.forEach((l, j) => {
      const sa = subs.length > 1 ? angle - 0.45 + (j * 0.9) / (subs.length - 1) : angle;
      b.children!.push({ id: `s${i}${j}`, label: l, x: bx + Math.cos(sa) * 210, y: by + Math.sin(sa) * 150, w: 0, h: 0, level: 2, color: "#000", parentId: b.id });
    });
    root.children!.push(b);
  });
  return root;
}
const flat = (n: MindMapNode): MindMapNode[] => [n, ...(n.children ?? []).flatMap(flat)];

describe("mind map layout", () => {
  for (const count of [4, 5, 6]) {
    it(`no blocks overlap with ${count} branches of 4 long sub-topics`, () => {
      const branches: [string, string[]][] = Array.from({ length: count }, (_, i) => [
        `Main branch number ${i + 1}`,
        ["Chlorophyll pigments", "ATP is produced", "Water molecules split", "Oxygen released"],
      ]);
      const root = radial(branches);
      const cx0 = root.x;
      layoutMindMap(root);
      const all = flat(root);
      for (const n of all) expect(n.w).toBeGreaterThanOrEqual(n.label.length * 7);
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap, `${a.label} overlaps ${b.label}`).toBe(false);
        }
      // root stays where it was asked to go (centred on the start point)
      expect(root.x + root.w / 2).toBeCloseTo(cx0, 0);
    });
  }
});
