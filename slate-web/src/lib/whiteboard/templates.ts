import type { CanvasObject, Page } from "./types";

export type TemplateKey =
  | "blank"
  | "grid"
  | "lined"
  | "dot"
  | "cornell"
  | "mindmap"
  | "graph"
  | "number-line"
  | "lab-report"
  | "kwl"
  | "drafting-3d"
  | "four-line"
  | "music-staves"
  | "millimeter-graph"
  | "india-map"
  | "world-map";

export type Template = {
  key: TemplateKey;
  title: string;
  description: string;
  category: "Built-in" | "Math" | "Science" | "Language";
  emoji: string;
};

export const TEMPLATES: Template[] = [
  {
    key: "blank",
    title: "Blank",
    description: "Start from an empty canvas.",
    category: "Built-in",
    emoji: "🗒️",
  },
  {
    key: "grid",
    title: "Grid paper",
    description: "Square grid for tidy diagrams.",
    category: "Built-in",
    emoji: "🔳",
  },
  {
    key: "lined",
    title: "Lined paper",
    description: "Ruled lines for writing.",
    category: "Built-in",
    emoji: "📄",
  },
  {
    key: "dot",
    title: "Dot grid",
    description: "Subtle dots for sketching.",
    category: "Built-in",
    emoji: "⚫",
  },
  {
    key: "cornell",
    title: "Cornell notes",
    description: "Cues, notes and summary.",
    category: "Built-in",
    emoji: "🗂️",
  },
  {
    key: "mindmap",
    title: "Mind map",
    description: "Central idea with branches.",
    category: "Built-in",
    emoji: "🧠",
  },
  {
    key: "graph",
    title: "Math graph",
    description: "Cartesian grid with axes.",
    category: "Math",
    emoji: "📈",
  },
  {
    key: "drafting-3d",
    title: "3D Isometric Drafting",
    description: "Isometric 3D grid with 3D coordinate axes and sample solids.",
    category: "Math",
    emoji: "📐",
  },
  {
    key: "number-line",
    title: "Number line",
    description: "Horizontal number line.",
    category: "Math",
    emoji: "➖",
  },
  {
    key: "lab-report",
    title: "Science lab report",
    description: "Hypothesis, method, results.",
    category: "Science",
    emoji: "🧪",
  },
  {
    key: "kwl",
    title: "KWL chart",
    description: "Know · Want to know · Learned.",
    category: "Language",
    emoji: "📚",
  },
  {
    key: "four-line",
    title: "4-Line Handwriting",
    description: "Standard primary 4-line notebook ruling for English and Hindi practice.",
    category: "Language",
    emoji: "✍️",
  },
  {
    key: "music-staves",
    title: "Music Staves",
    description: "5-line music staves for notation, melody composition, and rhythm lessons.",
    category: "Built-in",
    emoji: "🎼",
  },
  {
    key: "millimeter-graph",
    title: "Millimeter Graph Paper",
    description: "Precision Cartesian engineering grid with 1mm, 5mm and 10mm divisions.",
    category: "Math",
    emoji: "📊",
  },
  {
    key: "india-map",
    title: "India Political Map",
    description: "Outline map of India with states for social science and geography.",
    category: "Science",
    emoji: "🇮🇳",
  },
  {
    key: "world-map",
    title: "World Map Outline",
    description: "Global continents outline for world history, climate zones, and geography.",
    category: "Science",
    emoji: "🗺️",
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function text(
  x: number,
  y: number,
  str: string,
  opts: Partial<{ w: number; h: number; fontSize: number; color: string; bg: string }> = {},
): CanvasObject {
  return {
    id: uid(),
    kind: "text",
    x,
    y,
    w: opts.w ?? 240,
    h: opts.h ?? 40,
    text: str,
    color: opts.color ?? "#0f172a",
    fontSize: opts.fontSize ?? 18,
    bg: opts.bg,
  };
}

function rect(x: number, y: number, w: number, h: number, color = "#94a3b8"): CanvasObject {
  return { id: uid(), kind: "shape", shape: "rect", color, size: 2, x, y, w, h };
}

function line(x: number, y: number, w: number, h: number, color = "#94a3b8"): CanvasObject {
  return { id: uid(), kind: "shape", shape: "line", color, size: 2, x, y, w, h };
}

export function pagesForTemplate(key: TemplateKey): Page[] {
  const pid = uid();
  const base: Omit<Page, "objects"> = { id: pid, background: "white" };
  switch (key) {
    case "blank":
      return [{ ...base, objects: [] }];
    case "grid":
      return [{ ...base, background: "grid", objects: [] }];
    case "lined":
      return [{ ...base, background: "lined", objects: [] }];
    case "dot":
      return [{ ...base, background: "dots", objects: [] }];
    case "cornell":
      return [
        {
          ...base,
          objects: [
            text(40, 20, "Topic", { fontSize: 22 }),
            line(40, 60, 720, 0),
            line(220, 80, 0, 500),
            line(40, 580, 720, 0),
            text(50, 90, "Cues", { fontSize: 14, color: "#64748b" }),
            text(240, 90, "Notes", { fontSize: 14, color: "#64748b" }),
            text(50, 600, "Summary", { fontSize: 14, color: "#64748b" }),
          ],
        },
      ];
    case "mindmap":
      return [
        {
          ...base,
          objects: [
            {
              id: uid(),
              kind: "shape",
              shape: "circle",
              color: "#6366f1",
              size: 3,
              x: 340,
              y: 240,
              w: 160,
              h: 100,
            },
            text(360, 275, "Main idea", { fontSize: 18, color: "#0f172a" }),
            line(500, 290, 160, -80, "#94a3b8"),
            line(500, 290, 160, 80, "#94a3b8"),
            line(340, 290, -160, -80, "#94a3b8"),
            line(340, 290, -160, 80, "#94a3b8"),
          ],
        },
      ];
    case "graph":
      return [
        {
          ...base,
          background: "grid",
          objects: [
            line(60, 300, 720, 0, "#0f172a"),
            line(420, 40, 0, 520, "#0f172a"),
            text(760, 280, "x", { fontSize: 14, w: 20 }),
            text(430, 30, "y", { fontSize: 14, w: 20 }),
          ],
        },
      ];
    case "number-line":
      return [
        {
          ...base,
          objects: [
            line(60, 300, 720, 0, "#0f172a"),
            ...Array.from({ length: 11 }).flatMap((_, i) => {
              const x = 60 + i * 72;
              return [
                line(x, 290, 0, 20, "#0f172a"),
                text(x - 10, 315, String(i - 5), { fontSize: 14, w: 30 }),
              ];
            }),
          ],
        },
      ];
    case "lab-report":
      return [
        {
          ...base,
          objects: [
            text(40, 20, "Lab Report", { fontSize: 26 }),
            text(40, 70, "Hypothesis", { fontSize: 16, color: "#64748b" }),
            rect(40, 95, 720, 100, "#cbd5e1"),
            text(40, 210, "Materials & Method", { fontSize: 16, color: "#64748b" }),
            rect(40, 235, 720, 140, "#cbd5e1"),
            text(40, 390, "Observations", { fontSize: 16, color: "#64748b" }),
            rect(40, 415, 720, 140, "#cbd5e1"),
            text(40, 570, "Conclusion", { fontSize: 16, color: "#64748b" }),
            rect(40, 595, 720, 80, "#cbd5e1"),
          ],
        },
      ];
    case "kwl":
      return [
        {
          ...base,
          objects: [
            text(40, 20, "KWL Chart", { fontSize: 24 }),
            text(60, 70, "K — Know", { fontSize: 16, color: "#0ea5e9" }),
            text(300, 70, "W — Want to know", { fontSize: 16, color: "#a855f7" }),
            text(560, 70, "L — Learned", { fontSize: 16, color: "#22c55e" }),
            rect(40, 100, 240, 480, "#cbd5e1"),
            rect(280, 100, 240, 480, "#cbd5e1"),
            rect(520, 100, 240, 480, "#cbd5e1"),
          ],
        },
      ];
    case "drafting-3d":
      return [
        {
          ...base,
          background: "isometric",
          objects: [
            text(50, 40, "3D Isometric Drafting", { fontSize: 24, color: "#1e293b" }),
            {
              id: uid(),
              kind: "shape",
              shape: "axes3d",
              color: "#6366f1",
              size: 3,
              x: 80,
              y: 140,
              w: 220,
              h: 220,
            },
            {
              id: uid(),
              kind: "shape",
              shape: "cube",
              color: "#0ea5e9",
              size: 2.5,
              x: 360,
              y: 160,
              w: 160,
              h: 160,
            },
            {
              id: uid(),
              kind: "shape",
              shape: "cylinder",
              color: "#10b981",
              size: 2.5,
              x: 580,
              y: 160,
              w: 130,
              h: 160,
            },
          ],
        },
      ];
    case "four-line":
      return [
        {
          ...base,
          background: "four-line",
          objects: [
            text(60, 40, "Handwriting Practice (4-Line Ruling)", { fontSize: 24, color: "#1e293b" }),
            text(60, 100, "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz", {
              fontSize: 22,
              color: "#0369a1",
            }),
          ],
        },
      ];
    case "music-staves":
      return [
        {
          ...base,
          background: "music-staves",
          objects: [
            text(60, 30, "Music Theory & Staves", { fontSize: 24, color: "#0f172a" }),
            text(60, 75, "Treble Clef & Key Signature Practice", { fontSize: 16, color: "#64748b" }),
          ],
        },
      ];
    case "millimeter-graph":
      return [
        {
          ...base,
          background: "millimeter-graph",
          objects: [
            text(60, 30, "Engineering & Physics Graph Paper (1mm / 5mm / 10mm)", {
              fontSize: 22,
              color: "#15803d",
            }),
            {
              id: uid(),
              kind: "graph",
              fn: "sin(x)",
              xMin: -10,
              xMax: 10,
              yMin: -2,
              yMax: 2,
              color: "#2563eb",
              x: 100,
              y: 100,
              w: 520,
              h: 340,
              title: "f(x) = sin(x)",
            },
          ],
        },
      ];
    case "india-map":
      return [
        {
          ...base,
          background: "white",
          objects: [
            text(60, 30, "Geography of India — Map Activity", { fontSize: 24, color: "#0f172a" }),
            text(60, 70, "Mark capitals, rivers, mountain ranges, and climate zones.", {
              fontSize: 15,
              color: "#64748b",
            }),
            {
              id: uid(),
              kind: "shape",
              shape: "rect",
              x: 80,
              y: 110,
              w: 640,
              h: 460,
              color: "#3b82f6",
              size: 2,
            },
            text(120, 150, "India Map Outline (States & Union Territories)", { fontSize: 18, color: "#1e3a8a" }),
          ],
        },
      ];
    case "world-map":
      return [
        {
          ...base,
          background: "white",
          objects: [
            text(60, 30, "World Geography & Continents", { fontSize: 24, color: "#0f172a" }),
            text(60, 70, "Identify the 7 continents, oceans, and equatorial lines.", {
              fontSize: 15,
              color: "#64748b",
            }),
            {
              id: uid(),
              kind: "shape",
              shape: "rect",
              x: 80,
              y: 110,
              w: 720,
              h: 460,
              color: "#059669",
              size: 2,
            },
            text(120, 150, "World Continents & Oceans Reference", { fontSize: 18, color: "#065f46" }),
          ],
        },
      ];
  }
}
