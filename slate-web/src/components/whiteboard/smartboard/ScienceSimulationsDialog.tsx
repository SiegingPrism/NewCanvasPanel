import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Zap,
  Atom,
  Flame,
  Waves,
  Scale,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  PenTool,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";

export interface ScienceSimulation {
  id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Biology";
  description: string;
  embedUrl: string;
  license: string;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
}

export const SCIENCE_SIMULATIONS: ScienceSimulation[] = [
  {
    id: "circuits-dc",
    title: "Circuit Construction Kit: DC",
    subject: "Physics",
    description: "Build virtual circuits with batteries, resistors, light bulbs, switches and ammeters. Explore Ohm's Law and parallel circuits.",
    embedUrl: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Zap,
    tags: ["Current", "Voltage", "Ohm's Law", "Class 10 & 12"],
  },
  {
    id: "states-of-matter",
    title: "States of Matter: Basics",
    subject: "Chemistry",
    description: "Heat, cool and compress atoms and molecules. Watch them transition between solid, liquid, and gas phases.",
    embedUrl: "https://phet.colorado.edu/sims/html/states-of-matter-basics/latest/states-of-matter-basics_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Flame,
    tags: ["Temperature", "Phase Change", "Molecules", "Class 9 & 11"],
  },
  {
    id: "pendulum-lab",
    title: "Pendulum Lab",
    subject: "Physics",
    description: "Play with one or two pendulums and discover how the period of a simple pendulum depends on length, mass, and gravity.",
    embedUrl: "https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Scale,
    tags: ["Oscillation", "Period", "Gravity", "Class 9 & 11"],
  },
  {
    id: "energy-skate-park",
    title: "Energy Skate Park: Basics",
    subject: "Physics",
    description: "Learn about conservation of energy with a skater dude! Explore kinetic, potential and thermal energy bar charts.",
    embedUrl: "https://phet.colorado.edu/sims/html/energy-skate-park-basics/latest/energy-skate-park-basics_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Zap,
    tags: ["Kinetic Energy", "Potential Energy", "Class 9"],
  },
  {
    id: "waves-intro",
    title: "Waves Intro",
    subject: "Physics",
    description: "Make waves with water, sound, and light. See how frequency, amplitude, and wavelength change the pattern.",
    embedUrl: "https://phet.colorado.edu/sims/html/waves-intro/latest/waves-intro_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Waves,
    tags: ["Frequency", "Amplitude", "Sound Waves", "Class 9 & 11"],
  },
  {
    id: "build-an-atom",
    title: "Build an Atom",
    subject: "Chemistry",
    description: "Build atoms out of protons, neutrons, and electrons. See how the element, charge, and mass number change.",
    embedUrl: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: Atom,
    tags: ["Atomic Structure", "Protons", "Neutrons", "Class 9 & 11"],
  },
  {
    id: "ph-scale",
    title: "pH Scale: Basics",
    subject: "Chemistry",
    description: "Test the pH of everyday things like coffee, spit, and soap! Investigate whether dilution changes pH.",
    embedUrl: "https://phet.colorado.edu/sims/html/ph-scale-basics/latest/ph-scale-basics_all.html",
    license: "CC-BY 4.0 (University of Colorado Boulder)",
    icon: FlaskConical,
    tags: ["Acids", "Bases", "pH Indicator", "Class 10"],
  },
];

export interface ScienceSimulationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScienceSimulationsDialog({ open, onOpenChange }: ScienceSimulationsDialogProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [activeSubject, setActiveSubject] = useState<"All" | "Physics" | "Chemistry" | "Biology">("All");
  const [activeSimulation, setActiveSimulation] = useState<ScienceSimulation | null>(null);

  const filteredSims = activeSubject === "All"
    ? SCIENCE_SIMULATIONS
    : SCIENCE_SIMULATIONS.filter((s) => s.subject === activeSubject);

  const handleInsertCardToBoard = (sim: ScienceSimulation) => {
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;

    const simCardObject: CanvasObject = {
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "sticky",
      x: cx - 220,
      y: cy - 140,
      w: 440,
      h: 280,
      text: `🧪 ${sim.title} (${sim.subject})\n\n${sim.description}\n\nLicense & Attribution: ${sim.license}`,
      color: sim.subject === "Physics" ? "#3b82f6" : "#10b981",
    };

    addObject(simCardObject);
    pushHistory();
    toast.success(`Inserted "${sim.title}" simulation card onto the whiteboard!`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !activeSimulation} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
          <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FlaskConical className="h-6 w-6" />
              </span>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  Interactive Science Simulations
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Free, openly licensed PhET simulations. Launch in fullscreen or place onto the board to write over.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>CC-BY 4.0 Open License</span>
            </div>
          </DialogHeader>

          {/* Subject Filter Tabs */}
          <div className="flex items-center gap-2 py-2 border-b">
            {(["All", "Physics", "Chemistry"] as const).map((sub) => (
              <Button
                key={sub}
                size="sm"
                variant={activeSubject === sub ? "default" : "secondary"}
                onClick={() => setActiveSubject(sub)}
                className={`rounded-xl text-xs font-bold ${
                  activeSubject === sub ? "bg-teal-600 hover:bg-teal-500 text-white" : ""
                }`}
              >
                {sub}
              </Button>
            ))}
          </div>

          {/* Simulation Cards Grid */}
          <div className="flex-1 overflow-y-auto py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSims.map((sim) => {
                const Icon = sim.icon;
                return (
                  <div
                    key={sim.id}
                    className="p-4 rounded-2xl border border-border bg-card/60 hover:bg-card hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-sm font-extrabold text-foreground leading-tight">
                              {sim.title}
                            </h4>
                            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                              {sim.subject}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-full">
                          HTML5
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sim.description}
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {sim.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground/80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        onClick={() => setActiveSimulation(sim)}
                        className="flex-1 h-9 rounded-xl font-bold text-xs gap-1.5 bg-teal-600 hover:bg-teal-500 text-white shadow-sm"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Launch Simulation
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertCardToBoard(sim)}
                        className="h-9 px-3 rounded-xl font-semibold text-xs gap-1 border-border hover:bg-muted"
                        title="Add interactive card to whiteboard"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        To Board
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* License attribution disclaimer */}
            <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>
                Simulations provided by <b>PhET Interactive Simulations</b>, University of Colorado Boulder under <b>CC-BY 4.0</b>.
              </span>
              <a
                href="https://phet.colorado.edu/en/licensing"
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                License Details <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Interactive Simulation Viewer with Annotation Overlay */}
      {activeSimulation && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none">
          {/* Header Controls */}
          <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                <FlaskConical className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">
                  {activeSimulation.title}
                </h3>
                <span className="text-[10px] text-slate-400">
                  PhET Interactive Simulation · CC-BY 4.0
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleInsertCardToBoard(activeSimulation);
                  setActiveSimulation(null);
                }}
                className="h-8 gap-1.5 text-xs text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to Whiteboard
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveSimulation(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Embedded PhET Simulation Iframe */}
          <div className="flex-1 w-full h-full bg-slate-900 relative">
            <iframe
              src={activeSimulation.embedUrl}
              title={activeSimulation.title}
              className="w-full h-full border-none"
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
      )}
    </>
  );
}
