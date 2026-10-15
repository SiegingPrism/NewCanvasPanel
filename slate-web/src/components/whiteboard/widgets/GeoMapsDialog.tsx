import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, MapPin, Check } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import type { ImageObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const MAPS = [
  { id: "world", name: "World Map", file: "/geo_maps/world_map.svg", region: "Global Continents & Oceans" },
  { id: "asia", name: "Asia", file: "/geo_maps/Asia.svg", region: "Largest continent, 48 countries" },
  { id: "europe", name: "Europe", file: "/geo_maps/Europe.svg", region: "European nations & borders" },
  { id: "africa", name: "Africa", file: "/geo_maps/Africa.svg", region: "54 sovereign countries" },
  { id: "north_america", name: "North America", file: "/geo_maps/North_America.svg", region: "USA, Canada, Mexico & Caribbean" },
  { id: "south_america", name: "South America", file: "/geo_maps/South_America.svg", region: "12 South American nations" },
  { id: "australia", name: "Australia & Oceania", file: "/geo_maps/Australia.svg", region: "Australia & surrounding islands" },
  { id: "india", name: "India Political Map", file: "/geo_maps/India_map.svg", region: "States & Union Territories" },
  { id: "antarctica", name: "Antarctica", file: "/geo_maps/Antractica.svg", region: "Southern polar region" },
];

export function GeoMapsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [selected, setSelected] = useState(MAPS[0]);

  function handleInsertMap() {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1000;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 700;

    const w = 920;
    const h = 580;
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
    toast.success(`Inserted ${selected.name} onto canvas! Ready to annotate!`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-blue-500" />
            <span>Interactive Geography & Historical Maps</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Insert high-resolution maps onto the whiteboard to draw trade routes, borders, and geography notes.
          </DialogDescription>
        </DialogHeader>

        {/* Map Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto p-1 max-h-80 border border-border rounded-xl bg-muted/15 my-2">
          {MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`flex flex-col items-center p-2.5 rounded-lg border text-left transition-all relative ${
                selected.id === m.id
                  ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500"
                  : "border-border/60 bg-card hover:bg-accent opacity-85"
              }`}
            >
              <div className="h-16 w-full rounded bg-white p-1 flex items-center justify-center border border-border/40 overflow-hidden mb-1.5">
                <img src={m.file} alt={m.name} className="h-full w-full object-contain" />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight truncate w-full">
                {m.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-full mt-0.5">
                {m.region}
              </span>
              {selected.id === m.id && (
                <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white rounded-full p-0.5 shadow">
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
            className="text-xs h-9 gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleInsertMap}
          >
            <MapPin className="h-4 w-4" />
            Place Map on Canvas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
