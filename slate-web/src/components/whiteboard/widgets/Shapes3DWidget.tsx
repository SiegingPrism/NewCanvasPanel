import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Box, Plus, Info } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import type { ImageObject, StickyNoteObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const SHAPES_3D = [
  {
    name: "Cube / Cuboid",
    file: "/shapes_3d/cuboid.svg",
    volume: "V = l × w × h",
    surface: "A = 2(lw + lh + wh)",
    desc: "6 rectangular faces, 12 edges, 8 vertices",
  },
  {
    name: "Cylinder",
    file: "/shapes_3d/pillar.svg",
    volume: "V = π r² h",
    surface: "A = 2πrh + 2πr²",
    desc: "2 parallel circular bases connected by curved surface",
  },
  {
    name: "Cone",
    file: "/shapes_3d/cone.svg",
    volume: "V = (1/3) π r² h",
    surface: "A = πr(r + √(h² + r²))",
    desc: "Circular base tapering smoothly to an apex",
  },
  {
    name: "Sphere",
    file: "/shapes_3d/sphere.svg",
    volume: "V = (4/3) π r³",
    surface: "A = 4 π r²",
    desc: "Perfect round 3D solid equidistant from center",
  },
  {
    name: "Square Pyramid",
    file: "/shapes_3d/pyramid.svg",
    volume: "V = (1/3) s² h",
    surface: "A = s² + 2s √( (s/2)² + h² )",
    desc: "Square base with 4 triangular lateral faces",
  },
  {
    name: "Triangular Prism",
    file: "/shapes_3d/triangular%20prism.svg",
    volume: "V = (1/2) b h_b × L",
    surface: "A = b h_b + (s1 + s2 + s3) L",
    desc: "2 triangular bases and 3 rectangular faces",
  },
  {
    name: "Hexagonal Prism",
    file: "/shapes_3d/hexagonal%20prism.svg",
    volume: "V = ((3√3)/2) s² h",
    surface: "A = 6sh + 3√3 s²",
    desc: "6-sided polygon prism with 8 faces total",
  },
  {
    name: "Pentagonal Prism",
    file: "/shapes_3d/pentagonal%20prism.svg",
    volume: "V = (1/4) √(5(5 + 2√5)) s² h",
    surface: "A = 5sh + 2 × Area_base",
    desc: "5-sided regular pentagon bases with 7 faces",
  },
  {
    name: "Capsule",
    file: "/shapes_3d/capsule.svg",
    volume: "V = π r² ((4/3)r + a)",
    surface: "A = 2πr(2r + a)",
    desc: "Cylinder with hemispherical ends",
  },
];

export function Shapes3DWidget() {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [selected, setSelected] = useState(SHAPES_3D[0]);

  function handleInsert(withFormula: boolean) {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

    const cx = Math.round((screenW / 2 - camera.x) / camera.zoom - 100);
    const cy = Math.round((screenH / 2 - camera.y) / camera.zoom - 100);

    const img: ImageObject = {
      id: uid(),
      kind: "image",
      x: cx,
      y: cy,
      w: 200,
      h: 200,
      src: selected.file,
    };

    addObject(img);

    if (withFormula) {
      const note: StickyNoteObject = {
        id: uid(),
        kind: "sticky",
        x: cx + 220,
        y: cy + 10,
        w: 220,
        h: 180,
        text: `3D SOLID: ${selected.name.toUpperCase()}\n\nVolume:\n${selected.volume}\n\nSurface Area:\n${selected.surface}`,
        color: "#dbeafe",
      };
      addObject(note);
    }

    pushHistory();
    toast.success(`Inserted 3D ${selected.name} onto board!`);
  }

  return (
    <div className="flex flex-col gap-3 min-w-[300px] max-w-[360px]">
      {/* 3D Shapes Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-border rounded-xl bg-muted/20">
        {SHAPES_3D.map((s) => (
          <button
            key={s.name}
            onClick={() => setSelected(s)}
            className={`flex flex-col items-center p-2 rounded-lg border transition-all text-center ${
              selected.name === s.name
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border/60 bg-card hover:bg-accent opacity-85"
            }`}
          >
            <img src={s.file} alt={s.name} className="h-10 w-10 object-contain my-1" />
            <span className="text-[10px] font-medium leading-tight truncate w-full mt-1">{s.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Shape Detail & Formulas */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-semibold">
          <span className="text-foreground">{selected.name}</span>
          <span className="text-[10px] text-muted-foreground">{selected.desc}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
          <div className="bg-muted p-1.5 rounded border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-sans">Volume:</span>
            <span className="text-primary font-bold">{selected.volume}</span>
          </div>
          <div className="bg-muted p-1.5 rounded border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-sans">Surface Area:</span>
            <span className="text-amber-500 font-bold">{selected.surface}</span>
          </div>
        </div>
      </div>

      {/* Insert Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9 gap-1"
          onClick={() => handleInsert(false)}
        >
          <Box className="h-3.5 w-3.5" />
          Insert Shape Only
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 text-xs h-9 gap-1 font-semibold"
          onClick={() => handleInsert(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          With Formulas
        </Button>
      </div>
    </div>
  );
}
