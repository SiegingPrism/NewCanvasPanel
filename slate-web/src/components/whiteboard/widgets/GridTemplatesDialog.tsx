import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Grid, Stamp, Check } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import type { ImageObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const TEMPLATES = [
  {
    id: "1",
    name: "Ruled Notebook Lines",
    file: "/grid_templates/template1.svg",
    desc: "Standard ruled lines for handwriting",
  },
  {
    id: "2",
    name: "Square Grid Paper",
    file: "/grid_templates/template2.svg",
    desc: "Math calculation & geometry grid",
  },
  {
    id: "3",
    name: "Double Ruled Lines",
    file: "/grid_templates/template3.svg",
    desc: "Primary handwriting guide lines",
  },
  {
    id: "4",
    name: "Four-Line Cursive",
    file: "/grid_templates/template4.svg",
    desc: "English cursive letter practice lines",
  },
  {
    id: "5",
    name: "Isometric Dot Matrix",
    file: "/grid_templates/template5.svg",
    desc: "Engineering 3D sketching dot grid",
  },
  {
    id: "6",
    name: "Millimeter Graph",
    file: "/grid_templates/template6.svg",
    desc: "High-precision science plotting paper",
  },
  {
    id: "7",
    name: "Music Notation Staves",
    file: "/grid_templates/template7.svg",
    desc: "Five-line musical staff sheet",
  },
  {
    id: "8",
    name: "Coordinate X-Y Plane",
    file: "/grid_templates/template8.svg",
    desc: "Cartesian 4-quadrant coordinate axes",
  },
  {
    id: "9",
    name: "Basketball Court",
    file: "/grid_templates/template9.svg",
    desc: "Sports tactic & play diagram",
  },
  {
    id: "10",
    name: "Football / Soccer Pitch",
    file: "/grid_templates/template10.svg",
    desc: "Soccer field tactical formation pitch",
  },
  {
    id: "11",
    name: "Cricket Pitch",
    file: "/grid_templates/template11.svg",
    desc: "Cricket field layout & batting crease",
  },
  {
    id: "12",
    name: "Badminton / Tennis Court",
    file: "/grid_templates/template12.svg",
    desc: "Racquet sports court boundaries",
  },
];

export function GridTemplatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [selected, setSelected] = useState(TEMPLATES[1]);

  function handleStampTemplate() {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1000;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 700;

    const w = 960;
    const h = 600;
    const cx = Math.round((screenW / 2 - camera.x) / camera.zoom - w / 2);
    const cy = Math.round((screenH / 2 - camera.y) / camera.zoom - h / 2);

    const img: ImageObject = {
      id: uid(),
      kind: "image",
      x: cx,
      y: cy,
      w,
      h,
      src: selected.file,
    };

    addObject(img);
    pushHistory();
    onOpenChange(false);
    toast.success(`Inserted ${selected.name} template onto canvas!`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Grid className="h-5 w-5 text-teal-500" />
            <span>Classroom Paper & Grid Templates</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Stamp notebook lines, coordinate planes, music staves, or sports courts onto the canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Template Grid Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto p-1 max-h-80 border border-border rounded-xl bg-muted/15 my-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelected(tmpl)}
              className={`flex flex-col items-center p-2.5 rounded-lg border text-left transition-all relative ${
                selected.id === tmpl.id
                  ? "border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500"
                  : "border-border/60 bg-card hover:bg-accent opacity-85"
              }`}
            >
              <div className="h-16 w-full rounded bg-white p-1 flex items-center justify-center border border-border/40 overflow-hidden mb-1.5">
                <img src={tmpl.file} alt={tmpl.name} className="h-full w-full object-contain" />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight truncate w-full">
                {tmpl.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-full mt-0.5">
                {tmpl.desc}
              </span>
              {selected.id === tmpl.id && (
                <div className="absolute top-1.5 right-1.5 bg-teal-500 text-white rounded-full p-0.5 shadow">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
          <div className="text-xs text-muted-foreground">
            Selected: <span className="font-semibold text-foreground">{selected.name}</span>
          </div>
          <Button
            variant="default"
            size="sm"
            className="text-xs h-9 gap-1.5 font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleStampTemplate}
          >
            <Stamp className="h-4 w-4" />
            Stamp onto Canvas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
