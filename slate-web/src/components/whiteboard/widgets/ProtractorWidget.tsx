import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Compass, Stamp, ArrowUpRight } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import type { PenStroke, TextObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ProtractorWidget() {
  const { addObject, pushHistory, camera, color, size } = useWhiteboard();
  const [angle, setAngle] = useState(45); // Current measured angle (0° to 180°)
  const [baseRotation, setBaseRotation] = useState(0); // Protractor tilt
  const [radiusCm, setRadiusCm] = useState(8); // Radius in cm (1cm = ~20px)

  const radiusPx = radiusCm * 20;

  // Stamp the measured angle (2 rays + arc + degree text) directly onto canvas
  function handleDrawAngle() {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

    const cx = Math.round((screenW / 2 - camera.x) / camera.zoom);
    const cy = Math.round((screenH / 2 - camera.y) / camera.zoom);

    const baseRad = (baseRotation * Math.PI) / 180;
    const targetRad = ((baseRotation + angle) * Math.PI) / 180;

    // Ray 1: Base ray
    const points1 = [];
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points1.push({
        x: Math.round(cx + radiusPx * t * Math.cos(baseRad)),
        y: Math.round(cy + radiusPx * t * Math.sin(baseRad)),
        p: 0.6,
      });
    }

    // Ray 2: Angle ray
    const points2 = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points2.push({
        x: Math.round(cx + radiusPx * t * Math.cos(targetRad)),
        y: Math.round(cy + radiusPx * t * Math.sin(targetRad)),
        p: 0.6,
      });
    }

    // Measurement Arc
    const arcRadius = radiusPx * 0.45;
    const arcPoints = [];
    const arcSteps = Math.max(10, Math.round(angle / 5));
    for (let i = 0; i <= arcSteps; i++) {
      const curAngle = baseRotation + (angle * i) / arcSteps;
      const curRad = (curAngle * Math.PI) / 180;
      arcPoints.push({
        x: Math.round(cx + arcRadius * Math.cos(curRad)),
        y: Math.round(cy + arcRadius * Math.sin(curRad)),
        p: 0.5,
      });
    }

    const strokeColor = color || "#2563eb";
    const strokeSize = Math.max(2, size || 3);

    const baseStroke: PenStroke = {
      id: uid(),
      kind: "pen",
      color: strokeColor,
      size: strokeSize,
      points: points1,
    };

    const angleStroke: PenStroke = {
      id: uid(),
      kind: "pen",
      color: strokeColor,
      size: strokeSize,
      points: points2,
    };

    const arcStroke: PenStroke = {
      id: uid(),
      kind: "pen",
      color: "#f59e0b",
      size: Math.max(1.5, strokeSize * 0.8),
      points: arcPoints,
    };

    // Label Text at mid-arc
    const midRad = ((baseRotation + angle / 2) * Math.PI) / 180;
    const labelX = Math.round(cx + (arcRadius + 22) * Math.cos(midRad));
    const labelY = Math.round(cy + (arcRadius + 22) * Math.sin(midRad) - 10);

    const textObj: TextObject = {
      id: uid(),
      kind: "text",
      x: labelX,
      y: labelY,
      w: 60,
      h: 28,
      text: `${angle}°`,
      fontSize: 18,
      color: "#f59e0b",
    };

    addObject(baseStroke);
    addObject(angleStroke);
    addObject(arcStroke);
    addObject(textObj);
    pushHistory();
    toast.success(`Drawn ${angle}° angle with arc on canvas!`);
  }

  return (
    <div className="flex flex-col gap-3 min-w-[280px] max-w-[340px]">
      {/* Interactive Protractor Dial */}
      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border bg-gradient-to-b from-card to-muted flex items-center justify-center select-none shadow-sm">
        {/* Protractor Semi-Circle Graphic */}
        <svg
          viewBox="-110 -110 220 120"
          className="w-56 h-32 transition-transform duration-75"
          style={{ transform: `rotate(${baseRotation}deg)` }}
        >
          {/* Semicircle body */}
          <path
            d="M -100 0 A 100 100 0 0 1 100 0 Z"
            fill="rgba(59, 130, 246, 0.08)"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/70"
          />
          {/* Inner cutout */}
          <path
            d="M -50 0 A 50 50 0 0 1 50 0 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2,2"
            className="text-muted-foreground/40"
          />
          {/* Center origin */}
          <circle cx="0" cy="0" r="3" fill="#ef4444" />

          {/* Major tick lines & degree labels */}
          {[0, 30, 45, 60, 90, 120, 135, 150, 180].map((deg) => {
            const rad = ((180 - deg) * Math.PI) / 180;
            const x1 = 100 * Math.cos(rad);
            const y1 = -100 * Math.sin(rad);
            const x2 = 88 * Math.cos(rad);
            const y2 = -88 * Math.sin(rad);
            const textX = 76 * Math.cos(rad);
            const textY = -76 * Math.sin(rad);
            return (
              <g key={deg}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-muted-foreground"
                />
                <text
                  x={textX}
                  y={textY}
                  fontSize="7"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-muted-foreground font-mono"
                >
                  {deg}
                </text>
              </g>
            );
          })}

          {/* Active Angle Arm Indicator */}
          <line
            x1="0"
            y1="0"
            x2={98 * Math.cos(((180 - angle) * Math.PI) / 180)}
            y2={-98 * Math.sin(((180 - angle) * Math.PI) / 180)}
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Current Angle Display Overlay */}
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-amber-500 shadow-sm">
          {angle}°
        </div>
      </div>

      {/* Angle Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>0° (Flat)</span>
          <span className="font-semibold text-foreground">{angle}° Angle</span>
          <span>180° (Straight)</span>
        </div>
        <Slider
          value={[angle]}
          min={0}
          max={180}
          step={1}
          onValueChange={(val) => setAngle(val[0])}
        />
      </div>

      {/* Base Rotation Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>Tilt Base</span>
          <span className="font-mono text-[11px] text-foreground">{baseRotation}°</span>
        </div>
        <Slider
          value={[baseRotation]}
          min={0}
          max={360}
          step={5}
          onValueChange={(val) => setBaseRotation(val[0])}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          className="flex-1 text-xs h-9 gap-1.5 font-semibold"
          onClick={handleDrawAngle}
        >
          <ArrowUpRight className="h-4 w-4" />
          Stamp Angle ({angle}°)
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-9 gap-1"
          onClick={() => {
            const presets = [30, 45, 60, 90, 120, 135];
            const next = presets[(presets.indexOf(angle) + 1) % presets.length] || 90;
            setAngle(next);
          }}
          title="Cycle standard geometry presets"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Preset
        </Button>
      </div>
    </div>
  );
}
