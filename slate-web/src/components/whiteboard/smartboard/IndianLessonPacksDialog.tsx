import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Map, Dna, Hash, BookOpen, Plus, Check } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toast } from "sonner";
import type { CanvasObject, Page } from "@/lib/whiteboard/types";

interface IndianLessonPacksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function textObj(
  x: number,
  y: number,
  text: string,
  fontSize = 20,
  color = "#0f172a",
  w = 600,
  h = 40,
): CanvasObject {
  return {
    id: uid(),
    kind: "text",
    x,
    y,
    w,
    h,
    text,
    fontSize,
    color,
  };
}

export function IndianLessonPacksDialog({ open, onOpenChange }: IndianLessonPacksDialogProps) {
  const { addPage, setActivePage, activePageId, pages, setPages } = useWhiteboard();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"geography" | "science" | "math" | "devanagari">("geography");

  const handleInsertPack = (title: string, objects: CanvasObject[], asNewPage = true) => {
    if (asNewPage) {
      const newPage: Page = {
        id: uid(),
        objects,
        background: "white",
      };
      setPages([...pages, newPage]);
      setActivePage(newPage.id);
      toast.success(`Loaded "${title}" on a new page`);
    } else {
      // Append to active page
      setPages(
        pages.map((p) =>
          p.id === activePageId
            ? { ...p, objects: [...p.objects, ...objects] }
            : p,
        ),
      );
      toast.success(`Inserted "${title}" onto current board`);
    }
    onOpenChange(false);
  };

  // --- 1. Geography Packs ---
  const indiaMapPack: CanvasObject[] = [
    textObj(100, 40, "भारत का मानचित्र / Map of India (States & Capitals)", 26, "#0f172a", 700, 45),
    textObj(100, 85, "CBSE & State Board Geography — Mark northern borders, coastal states & major river basins.", 16, "#64748b", 800, 35),
    {
      id: uid(),
      kind: "shape",
      shape: "rect",
      x: 120,
      y: 130,
      w: 800,
      h: 560,
      color: "#2563eb",
      size: 2,
    },
    textObj(360, 200, "[INDIA POLITICAL OUTLINE MAP]", 22, "#1e3a8a", 400, 40),
    {
      id: uid(),
      kind: "sticky",
      x: 140,
      y: 260,
      w: 220,
      h: 160,
      text: "Key Regions:\n• Northern Himalayas (J&K, Ladakh, HP, UK)\n• Indo-Gangetic Plains\n• Deccan Plateau\n• Coastal Plains (Konkan, Malabar, Coromandel)",
      color: "#fef08a",
    },
    {
      id: uid(),
      kind: "sticky",
      x: 680,
      y: 260,
      w: 200,
      h: 160,
      text: "Major Rivers:\n1. गंगा (Ganga)\n2. यमुना (Yamuna)\n3. ब्रह्मपुत्र (Brahmaputra)\n4. गोदावरी (Godavari)\n5. कृष्णा (Krishna)",
      color: "#bae6fd",
    },
  ];

  const riverSystemsPack: CanvasObject[] = [
    textObj(100, 40, "Indian River Drainage System (Himalayan & Peninsular)", 26, "#0284c7", 750, 45),
    textObj(100, 85, "Himalayan Rivers: Perennial, snow-fed | Peninsular Rivers: Rain-fed, seasonal", 16, "#475569", 800, 35),
    {
      id: uid(),
      kind: "sticky",
      x: 120,
      y: 140,
      w: 260,
      h: 220,
      text: "Himalayan Rivers:\n• Indus River System (Jhelum, Chenab, Ravi, Beas, Satluj)\n• Ganga System (Yamuna, Ghaghara, Gandak, Kosi)\n• Brahmaputra System (Tsangpo, Dihang, Lohit)",
      color: "#e0f2fe",
    },
    {
      id: uid(),
      kind: "sticky",
      x: 420,
      y: 140,
      w: 260,
      h: 220,
      text: "Peninsular Rivers:\n• East Flowing (Bay of Bengal):\n  - Mahanadi\n  - Godavari (Dakshin Ganga)\n  - Krishna\n  - Kaveri\n• West Flowing (Arabian Sea):\n  - Narmada\n  - Tapi",
      color: "#fef3c7",
    },
  ];

  // --- 2. Science Diagrams ---
  const plantCellPack: CanvasObject[] = [
    textObj(100, 40, "पादप कोशिका / Plant Cell Structure (NCERT Class 8 & 9)", 26, "#15803d", 750, 45),
    {
      id: uid(),
      kind: "shape",
      shape: "rect",
      x: 160,
      y: 120,
      w: 600,
      h: 440,
      color: "#16a34a",
      size: 4,
    },
    {
      id: uid(),
      kind: "shape",
      shape: "ellipse",
      x: 400,
      y: 240,
      w: 120,
      h: 120,
      color: "#7c3aed",
      size: 3,
    },
    textObj(410, 290, "Nucleus (केन्द्रक)", 16, "#5b21b6", 180, 30),
    {
      id: uid(),
      kind: "shape",
      shape: "ellipse",
      x: 220,
      y: 200,
      w: 150,
      h: 240,
      color: "#0284c7",
      size: 2,
    },
    textObj(230, 310, "Large Vacuole (रसधानी)", 16, "#0369a1", 180, 30),
    textObj(770, 130, "← Cell Wall (कोशिका भित्ति)", 16, "#15803d", 250, 30),
    textObj(770, 220, "← Chloroplast (हरितलवक)", 16, "#16a34a", 250, 30),
    textObj(770, 320, "← Mitochondria (माइटोकॉन्ड्रिया)", 16, "#ea580c", 280, 30),
  ];

  const electricCircuitPack: CanvasObject[] = [
    textObj(100, 40, "विद्युत परिपथ / Simple Electric Circuit (NCERT Class 7 & 10)", 26, "#b45309", 750, 45),
    {
      id: uid(),
      kind: "shape",
      shape: "rect",
      x: 200,
      y: 150,
      w: 500,
      h: 300,
      color: "#334155",
      size: 3,
    },
    textObj(350, 125, "Switch / Key (कुंजी) [—•/ •—]", 16, "#0f172a", 240, 30),
    textObj(340, 460, "Electric Cell / Battery (+ || -)", 16, "#b91c1c", 250, 30),
    textObj(720, 280, "💡 Electric Bulb (बल्ब)", 18, "#eab308", 220, 35),
    textObj(50, 280, "Ammeter (A) [Current I in Amperes]", 15, "#2563eb", 240, 30),
  ];

  // --- 3. Math Packs ---
  const numberLinePack: CanvasObject[] = [
    textObj(100, 40, "Number Line / संख्या रेखा (-10 to +10 Integers)", 26, "#4338ca", 650, 45),
    {
      id: uid(),
      kind: "shape",
      shape: "line",
      x: 100,
      y: 220,
      w: 800,
      h: 0,
      color: "#1e1b4b",
      size: 4,
    },
    textObj(110, 240, "< -10   -8   -6   -4   -2    0    +2   +4   +6   +8   +10 >", 22, "#312e81", 800, 40),
    {
      id: uid(),
      kind: "sticky",
      x: 160,
      y: 310,
      w: 240,
      h: 120,
      text: "ऋणात्मक पूर्णांक (Negative Integers)\nNumbers to the left of 0 decrease in value.",
      color: "#fee2e2",
    },
    {
      id: uid(),
      kind: "sticky",
      x: 540,
      y: 310,
      w: 240,
      h: 120,
      text: "धनात्मक पूर्णांक (Positive Integers)\nNumbers to the right of 0 increase in value.",
      color: "#dcfce7",
    },
  ];

  // --- 4. Devanagari Writing Practice Packs ---
  const devanagariPracticePack: CanvasObject[] = [
    textObj(100, 40, "देवनागरी वर्णमाला अभ्यास / Devanagari Handwriting Practice", 26, "#7e22ce", 750, 45),
    textObj(100, 85, "स्वर (Vowels) व व्यंजन (Consonants) लेखन अभ्यास", 16, "#6b21a8", 600, 35),
    textObj(100, 150, "स्वर:   अ    आ    इ    ई    उ    ऊ    ऋ    ए    ऐ    ओ    औ    अं    अः", 28, "#0f172a", 850, 45),
    textObj(100, 230, "क-वर्ग:  क    ख    ग    घ    ङ", 28, "#1e293b", 600, 45),
    textObj(100, 300, "च-वर्ग:  च    छ    ज    झ    ञ", 28, "#1e293b", 600, 45),
    textObj(100, 370, "ट-वर्ग:  ट    ठ    ड    ढ    ण", 28, "#1e293b", 600, 45),
    textObj(100, 440, "त-वर्ग:  त    थ    द    ध    न", 28, "#1e293b", 600, 45),
    textObj(100, 510, "प-वर्ग:  प    फ    ब    भ    म", 28, "#1e293b", 600, 45),
    textObj(100, 580, "अंक:    १    २    ३    ४    ५    ६    ७    ८    ९    ०", 28, "#0369a1", 600, 45),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              🇮🇳
            </span>
            <span>Indian School Lesson Packs (CBSE & State Boards)</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Curriculum-ready offline templates, maps, science diagrams, and Devanagari writing practice.
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col min-h-0 mt-2"
        >
          <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="geography" className="flex items-center gap-2 rounded-lg text-xs font-semibold">
              <Map className="h-4 w-4" /> Geography
            </TabsTrigger>
            <TabsTrigger value="science" className="flex items-center gap-2 rounded-lg text-xs font-semibold">
              <Dna className="h-4 w-4" /> Science
            </TabsTrigger>
            <TabsTrigger value="math" className="flex items-center gap-2 rounded-lg text-xs font-semibold">
              <Hash className="h-4 w-4" /> Mathematics
            </TabsTrigger>
            <TabsTrigger value="devanagari" className="flex items-center gap-2 rounded-lg text-xs font-semibold">
              <BookOpen className="h-4 w-4" /> Languages
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1">
            {/* Geography Tab */}
            <TabsContent value="geography" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    🗺️ Map of India — States & Capitals
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Political outline map with 28 states, union territories, and geographical regions.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                    NCERT Class 6–10
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Map of India", indiaMapPack)}
                  className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>

              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    🌊 Indian River Drainage Systems
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Himalayan (Indus, Ganga, Brahmaputra) vs Peninsular (Godavari, Krishna, Narmada) rivers.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">
                    NCERT Class 9 & 10
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Indian River Drainage Systems", riverSystemsPack)}
                  className="gap-2 shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>
            </TabsContent>

            {/* Science Tab */}
            <TabsContent value="science" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    🌿 Plant Cell Structure
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cell wall, vacuole, chloroplast, nucleus, and mitochondria with diagram labels.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    NCERT Class 8 & 9 Biology
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Plant Cell Structure", plantCellPack)}
                  className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>

              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    ⚡ Simple Electric Circuit
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Battery, switch, bulb, and ammeter with circuit diagram conventions and Ohm's Law.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                    NCERT Class 7 & 10 Physics
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Electric Circuit", electricCircuitPack)}
                  className="gap-2 shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>
            </TabsContent>

            {/* Math Tab */}
            <TabsContent value="math" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    🔢 Number Line (-10 to +10 Integers)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zero center with positive and negative integer direction rules for student problem solving.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
                    NCERT Class 6 & 7 Math
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Number Line", numberLinePack)}
                  className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>
            </TabsContent>

            {/* Devanagari Tab */}
            <TabsContent value="devanagari" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border bg-card hover:border-primary/40 transition flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    ✍️ Devanagari Script & Numerals (Hindi & Marathi)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vowels, consonants, and Devanagari numerals (1 to 0) handwriting practice.
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
                    CBSE & State Board Primary
                  </span>
                </div>
                <Button
                  onClick={() => handleInsertPack("Devanagari Varnamala", devanagariPracticePack)}
                  className="gap-2 shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  <Plus className="h-4 w-4" /> Open Template
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
