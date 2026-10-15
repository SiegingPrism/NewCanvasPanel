import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Globe, Languages, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SUPPORTED_LANGUAGES,
  findLanguage,
  useInk,
  type LanguageOption,
} from "@/lib/ink/recognizer";

export function HandwritingLanguageDialog({
  open,
  onOpenChange,
  mode = "write",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "write": the language you write in. "translate": the language to translate into. */
  mode?: "write" | "translate";
}) {
  const { language: writeLanguage, setLanguage, translateTo, chooseTranslateLanguage, translatePickerForSelection } = useInk();
  const isTranslate = mode === "translate";
  const language = isTranslate ? translateTo : writeLanguage;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "indian" | "international">("all");
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now();
    }
  }, [open]);

  const current = findLanguage(language);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SUPPORTED_LANGUAGES.filter((item) => {
      if (activeTab !== "all" && item.category !== activeTab) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.nativeName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });
  }, [search, activeTab]);

  const selectLanguage = async (item: LanguageOption) => {
    if (isTranslate) {
      const changedLive = chooseTranslateLanguage(item.code);
      if (changedLive) {
        toast.success(`Slate Translate set to ${item.name} (${item.nativeName}) — Ready!`);
      }
      onOpenChange(false);
      return;
    }
    setLanguage(item.code);
    toast.success(`Language set to ${item.name} (${item.nativeName}) — Ready!`);
    onOpenChange(false);
    useInk.getState().setLangPickerOpen(false);
  };

  const indianCount = SUPPORTED_LANGUAGES.filter((l) => l.category === "indian").length;
  const internationalCount = SUPPORTED_LANGUAGES.filter((l) => l.category === "international").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (Date.now() - openedAtRef.current < 450) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (Date.now() - openedAtRef.current < 450) {
            e.preventDefault();
          }
        }}
        className="max-w-md w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[100] pointer-events-auto"
      >
        <DialogHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isTranslate ? "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400" : "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"}`}>
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isTranslate
                  ? (translatePickerForSelection ? "Translate Selection — Choose Language" : "Slate Translate — Translate into")
                  : "Handwriting Language"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isTranslate
                  ? (translatePickerForSelection
                      ? "Translate the selected handwriting or text into this language"
                      : "Write in any language — text is converted into this language in proper handwriting")
                  : "All 22 constitutional Indian languages + world languages"}
              </DialogDescription>
            </div>
          </div>

          {/* Search box */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by English or native script..."
              className="pl-8 pr-8 h-9 text-xs rounded-xl"
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              All ({SUPPORTED_LANGUAGES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("indian")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "indian"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Indian ({indianCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("international")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "international"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
              }`}
            >
              <Globe className="h-3 w-3" />
              World ({internationalCount})
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable list */}
        <div className="overflow-y-auto max-h-[52vh] p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No languages match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = item.code === current.code;

              return (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => selectLanguage(item)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30 font-medium"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        item.category === "indian"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                      }`}
                    >
                      {item.code.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{item.nativeName}</span>
                        {item.category === "indian" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-normal">
                            Indic
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{item.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-xs">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            {isTranslate ? "Translating into" : "Active"}:{" "}
            <strong className="text-foreground">{current.name} ({current.nativeName})</strong>
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">● Online AI Ready</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
