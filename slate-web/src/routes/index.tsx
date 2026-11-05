import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { TemplateKey } from "@/lib/whiteboard/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  FolderOpen,
  Sparkles,
  ArrowRight,
  Clock,
  Star,
  FileText,
  GraduationCap,
  Menu,
  X,
  BookOpen,
  Folder,
  FolderPlus,
  Search,
  Check,
  Tag,
  Cloud,
  LogIn,
  User,
  Bell,
  SlidersHorizontal,
  Home,
  LayoutGrid,
  Settings,
  Library as LibraryIcon,
  Presentation,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FeatureTourDialog } from "@/components/whiteboard/FeatureTourDialog";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth, getUserAvatarUrl, getUserDisplayName } from "@/lib/supabase/authStore";
import { useAISheetStore } from "@/lib/ai/aiSheetStore";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { DocumentImportDialog } from "@/components/whiteboard/smartboard/DocumentImportDialog";
import { AILessonBuilderDialog } from "@/components/whiteboard/smartboard/AILessonBuilderDialog";
import { TeacherAccountDialog } from "@/components/whiteboard/smartboard/TeacherAccountDialog";
import { importLessonFile } from "@/lib/whiteboard/lessonFiles";
import type { Page } from "@/lib/whiteboard/types";

const SUBJECT_TEMPLATES: {
  category: "Maths" | "Science" | "Language" | "Geography" | "Arts & Music";
  templates: { key: TemplateKey; label: string; icon: string; desc: string }[];
}[] = [
  {
    category: "Maths",
    templates: [
      { key: "graph", label: "Math Graph", icon: "📈", desc: "Cartesian grid with axes" },
      { key: "drafting-3d", label: "3D Drafting", icon: "📐", desc: "Isometric grid with 3D axes" },
      { key: "millimeter-graph", label: "Precision Grid", icon: "📊", desc: "1mm engineering graph paper" },
      { key: "number-line", label: "Number Line", icon: "➖", desc: "Linear scale for math" },
    ],
  },
  {
    category: "Science",
    templates: [
      { key: "lab-report", label: "Lab Report", icon: "🧪", desc: "Hypothesis, apparatus, method & results" },
      { key: "mindmap", label: "Science Mind Map", icon: "🧠", desc: "Hypothesis, experiments & notes" },
      { key: "dot", label: "Dot Matrix", icon: "📓", desc: "Molecule & chemical layout" },
    ],
  },
  {
    category: "Language",
    templates: [
      { key: "four-line", label: "4-Line Writing", icon: "✍️", desc: "Handwriting ruling for languages" },
      { key: "cornell", label: "Cornell Notes", icon: "🗂️", desc: "Cues, notes, and summary" },
      { key: "kwl", label: "KWL Chart", icon: "📚", desc: "Know · Want to know · Learned" },
      { key: "lined", label: "Ruled Notes", icon: "📝", desc: "Composition & essay ruling" },
    ],
  },
  {
    category: "Geography",
    templates: [
      { key: "world-map", label: "World Map", icon: "🗺️", desc: "Continents, oceans & climate zones" },
      { key: "india-map", label: "India Map", icon: "🇮🇳", desc: "State boundaries & physical map" },
      { key: "grid", label: "Topographic Grid", icon: "🌐", desc: "Latitude & longitude mapping" },
    ],
  },
  {
    category: "Arts & Music",
    templates: [
      { key: "music-staves", label: "Music Staves", icon: "🎼", desc: "5-line notation & staves" },
      { key: "blank", label: "Art Sketchpad", icon: "🎨", desc: "Clean unruled drawing canvas" },
    ],
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slate — SNANS TECH" },
      { name: "description", content: "Smart whiteboard, notes, and study hub by SNANS TECH." },
    ],
  }),
  component: Dashboard,
});

function relTime(t: number) {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Dashboard() {
  const navigate = useNavigate();
  const {
    boards,
    boardOrder,
    folders,
    recentAI,
    createBoard,
    toggleFavorite,
    setBoardFolder,
    createFolder,
    syncWithCloud,
  } = useWhiteboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const { user } = useAuth();
  const avatarUrl = getUserAvatarUrl(user);
  const displayName = getUserDisplayName(user);
  const [authOpen, setAuthOpen] = useState(false);
  const openAI = useAISheetStore((s) => s.openAI);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [boardSearch, setBoardSearch] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [aiLessonBuilderOpen, setAiLessonBuilderOpen] = useState(false);
  const [teacherAccountOpen, setTeacherAccountOpen] = useState(false);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<"Maths" | "Science" | "Language" | "Geography" | "Arts & Music">("Maths");

  function openNewLessonWithPages(pages: Page[], topic: string) {
    const id = createBoard({
      title: topic,
      pages,
    });
    navigate({ to: "/board/$boardId", params: { boardId: id } });
  }

  async function handleImportSlateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bundle = await importLessonFile(file);
      const newBoardId = createBoard({
        title: bundle.title || file.name.replace(/\.slate$/i, ""),
      });
      useWhiteboard.setState((prev) => ({
        ...prev,
        boards: {
          ...prev.boards,
          [newBoardId]: {
            ...prev.boards[newBoardId],
            title: bundle.title || file.name.replace(/\.slate$/i, ""),
            pages: bundle.pages,
          },
        },
      }));
      toast.success(`Loaded lesson: ${bundle.title}`);
      navigate({ to: "/board/$boardId", params: { boardId: newBoardId } });
    } catch (err) {
      console.error(err);
      toast.error("Failed to read .slate lesson file.");
    }
  }

  const allBoards = useMemo(
    () =>
      boardOrder
        .map((id) => boards[id])
        .filter((b) => b && !b.archived)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [boards, boardOrder],
  );
  const continueBoard = allBoards[0];
  const starredBoards = useMemo(() => allBoards.filter((b) => b.favorite), [allBoards]);

  const filteredBoards = useMemo(() => {
    let list = allBoards;
    if (activeFolderId === "starred") {
      list = list.filter((b) => b.favorite);
    } else if (activeFolderId !== "all") {
      list = list.filter((b) => b.folderId === activeFolderId);
    }
    if (boardSearch.trim()) {
      const q = boardSearch.toLowerCase().trim();
      list = list.filter(
        (b) => b.title.toLowerCase().includes(q) || b.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allBoards, activeFolderId, boardSearch]);

  function openNew(templateKey?: TemplateKey, folderId?: string | null) {
    const id = createBoard({
      templateKey,
      folderId: folderId ?? (activeFolderId !== "all" && activeFolderId !== "starred" ? activeFolderId : null),
    });
    navigate({ to: "/board/$boardId", params: { boardId: id } });
  }

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const fId = createFolder(newFolderName.trim());
    setNewFolderName("");
    setNewFolderOpen(false);
    setActiveFolderId(fId);
  }

  return (
    <div className="min-h-dvh w-full bg-background touch-pan-y pb-[max(7rem,calc(var(--sab,env(safe-area-inset-bottom,0px))+6rem))]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur pt-[max(0.75rem,var(--sat,env(safe-area-inset-top,0px)))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Logo & Company Name */}
          <Link to="/" className="flex items-center gap-2.5 font-semibold group">
            <img
              src="/sti-logo.png"
              alt="STI Logo"
              className="h-9 w-9 rounded-xl object-contain shadow-xs transition group-hover:scale-105"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-foreground tracking-tight text-lg">Slate</span>
              <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase -mt-0.5">
                SNANS TECH
              </span>
            </div>
          </Link>

          {/* Header Action Buttons (Notification Bell, Menu Drawer, User Avatar) */}
          <div className="flex items-center gap-2">
            {/* Teacher Cloud Account Button */}
            <button
              type="button"
              onClick={() => setTeacherAccountOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-border bg-card text-foreground shadow-2xs hover:bg-accent active:scale-95 transition text-xs font-semibold"
              title={user ? `Signed in as ${user.email} (Manage Cloud Lessons)` : "Teacher Cloud Account"}
            >
              <Cloud className={cn("h-4 w-4", user ? "text-emerald-500" : "text-sky-500")} />
              <span className="hidden sm:inline">{user ? "Cloud Active" : "Teacher Sign In"}</span>
            </button>

            {/* Notification Bell */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-2xs hover:bg-accent active:scale-95 transition"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3.5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="font-semibold text-xs tracking-tight text-foreground">Notifications</h4>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    2 New
                  </span>
                </div>
                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="font-semibold text-foreground">Welcome to Slate by SNANS TECH</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Your smart whiteboard, tactile gestures, and Gemini AI assistant are ready.
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2.5">
                    <p className="font-semibold text-foreground">Cloud Sync & Storage</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Sign in to synchronize your boards and block notes across devices seamlessly.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-2xs hover:bg-accent active:scale-95 transition"
              aria-label="Navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {/* User Profile Avatar */}
            <Link
              to="/profile"
              className="relative h-10 w-10 rounded-full overflow-hidden border border-border bg-card shadow-2xs hover:ring-2 hover:ring-primary/40 active:scale-95 transition flex items-center justify-center shrink-0"
              title={user ? `Signed in as ${user.email} — Profile` : "Profile & Account"}
              aria-label="User Profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || "User avatar"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : user ? (
                <div className="grid h-full w-full place-items-center bg-primary/15 text-primary font-bold text-sm">
                  {displayName ? displayName.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />)}
                </div>
              ) : (
                <div className="relative h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Slide-down Drawer Menu */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-[max(4.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-30 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 z-40 border-b border-border bg-card p-4 shadow-xl space-y-3 animate-in slide-in-from-top duration-200">
              <div className="space-y-1">
                <Link
                  to="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Library</div>
                    <div className="text-xs text-muted-foreground">All your boards and archives</div>
                  </div>
                </Link>
                <Link
                  to="/notes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Notes</div>
                    <div className="text-xs text-muted-foreground">AI-assisted block notes</div>
                  </div>
                </Link>
                <Link
                  to="/learn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Learning Hub</div>
                    <div className="text-xs text-muted-foreground">Flashcards and smart quizzes</div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTourOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Feature Guide & Tutorial</div>
                    <div className="text-xs text-muted-foreground">Inks, widgets, snap & AI overview</div>
                  </div>
                </button>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg overflow-hidden shrink-0",
                      user ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500",
                    )}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : user ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {user ? displayName || "Profile & Account" : "Sign In / Profile"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user ? user.email : "Sync boards & manage profile"}
                    </div>
                  </div>
                </Link>
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  className="w-full justify-center gap-2 py-2"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openNew();
                  }}
                >
                  <Plus className="h-4 w-4" /> Create New Board
                </Button>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="mx-auto max-w-2xl sm:max-w-4xl space-y-6 px-4 py-5 sm:px-6">
        {/* Universal Search Bar with Filter/Tune Button */}
        <section className="flex items-center gap-2.5">
          <div className="relative flex-1 flex items-center rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-2xs focus-within:border-primary/60 transition">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search boards, notes, and libraries..."
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              className="w-full bg-transparent px-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {boardSearch && (
              <button
                type="button"
                onClick={() => setBoardSearch("")}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("boards-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate({ to: "/library" });
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-2xs hover:bg-accent active:scale-95 transition shrink-0"
            title="Filter boards & folders"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </section>

        {/* Hero Welcome Greeting */}
        <section className="pt-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back{user && displayName ? `, ${displayName.split(" ")[0]}` : ""},
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Pick up where you left off, or start something new.
          </p>
        </section>

        {/* CONTINUE WORKING Section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Clock className="h-4 w-4 text-foreground" />
              CONTINUE WORKING
            </h2>
            <Link
              to="/library"
              className="flex items-center gap-1 text-xs font-bold text-foreground hover:text-primary transition"
            >
              View library <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Continue Working Card */}
          <div
            onClick={() => {
              if (continueBoard) {
                navigate({ to: "/board/$boardId", params: { boardId: continueBoard.id } });
              } else {
                openNew("blank");
              }
            }}
            className="group relative rounded-3xl border border-border/90 bg-card overflow-hidden shadow-xs hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
          >
            {/* Top Left Title Chip Badge */}
            <div className="absolute top-3.5 left-3.5 z-10 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 shadow-sm border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100">
              {continueBoard ? continueBoard.title : "Untitled board"}
            </div>

            {/* Rich Whiteboard Diagram Canvas Preview */}
            <WhiteboardPreviewCanvas />

            {/* Bottom Bar: Overlapping Avatars & Open Button */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              {/* Overlapping User Avatars */}
              <div className="flex -space-x-2 items-center pointer-events-auto">
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500/20 text-amber-700 font-bold text-xs grid place-items-center shadow-xs overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
                    alt="User"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span>JD</span>
                </div>
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500/20 text-blue-700 font-bold text-xs grid place-items-center shadow-xs overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces"
                    alt="User"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span>AK</span>
                </div>
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500/20 text-emerald-700 font-bold text-xs grid place-items-center shadow-xs overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=faces"
                    alt="User"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span>ST</span>
                </div>
              </div>

              {/* Open Pill Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (continueBoard) {
                    navigate({ to: "/board/$boardId", params: { boardId: continueBoard.id } });
                  } else {
                    openNew("blank");
                  }
                }}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS 2x2 Grid */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">QUICK ACTIONS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Blank Board */}
            <button
              type="button"
              onClick={() => openNew("blank")}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-left shadow-2xs hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E89271]/25 text-[#C85D38] transition group-hover:scale-105">
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-bold text-foreground">Blank board</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Start with a clean canvas</div>
              </div>
            </button>

            {/* AI Lesson Builder */}
            <button
              type="button"
              onClick={() => setAiLessonBuilderOpen(true)}
              className="group relative flex flex-col justify-between rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 p-3 sm:p-3.5 text-left shadow-2xs hover:border-indigo-500/80 transition cursor-pointer active:scale-[0.99]"
            >
              <span className="absolute top-3 right-3 rounded bg-indigo-600 text-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">
                5-8 Pages
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400 transition group-hover:scale-105">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-bold text-foreground">AI Lesson Builder</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Type a topic to get ready whiteboard pages</div>
              </div>
            </button>

            {/* AI-Assisted */}
            <button
              type="button"
              onClick={() => openAI({ boardId: continueBoard?.id })}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-left shadow-2xs hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
            >
              <span className="absolute top-3 right-3 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide">
                AI
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#7EA885]/25 text-[#3F6B43] transition group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-bold text-foreground">AI Copilot</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Chat with AI teaching assistant</div>
              </div>
            </button>

            {/* Open Library */}
            <button
              type="button"
              onClick={() => navigate({ to: "/library" })}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-left shadow-2xs hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#64748B]/20 text-[#475569] dark:text-slate-300 transition group-hover:scale-105">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-bold text-foreground">Open library</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Browse, sort, and organize</div>
              </div>
            </button>

            {/* New Note */}
            <button
              type="button"
              onClick={() => navigate({ to: "/notes" })}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-left shadow-2xs hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
            >
              <span className="absolute top-3 right-3 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide">
                NEW
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8A57F]/25 text-[#B85827] transition group-hover:scale-105">
                <FileText className="h-5 w-5" />
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-bold text-foreground">New note</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Block-based notes with AI actions</div>
              </div>
            </button>
          </div>
        </section>

        {/* LESSON LIBRARY & SUBJECT TEMPLATES */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              LESSON LIBRARY & TEMPLATES
            </h2>
            <div className="flex items-center gap-2">
              {/* Open .slate lesson file */}
              <label
                title="Open Lesson (.slate)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer active:scale-95 transition shadow-2xs"
              >
                <input
                  type="file"
                  accept=".slate,application/json"
                  onChange={handleImportSlateFile}
                  className="hidden"
                />
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Open .slate</span>
              </label>

              {/* Import PowerPoint / PDF */}
              <button
                type="button"
                onClick={() => setDocImportOpen(true)}
                title="Import PowerPoint (.pptx) or PDF"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer active:scale-95 transition shadow-2xs"
              >
                <Presentation className="h-3.5 w-3.5 text-orange-500" />
                <span>Import Slides</span>
              </button>
            </div>
          </div>

          {/* Subject Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto scrollbar-none">
            {(["Maths", "Science", "Language", "Geography", "Arts & Music"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedSubjectTab(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                  selectedSubjectTab === cat
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Subject Template Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {SUBJECT_TEMPLATES.find((s) => s.category === selectedSubjectTab)?.templates.map((tmpl) => (
              <button
                key={tmpl.key}
                type="button"
                onClick={() => openNew(tmpl.key)}
                className="group flex flex-col justify-between p-3 rounded-2xl border border-border bg-card text-left hover:border-primary/50 transition active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{tmpl.icon}</div>
                <div>
                  <div className="text-xs font-bold text-foreground truncate">{tmpl.label}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{tmpl.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Learning Hub Card (Full Width with Circular Progress Ring) */}
        <section>
          <button
            type="button"
            onClick={() => navigate({ to: "/learn" })}
            className="w-full rounded-2xl border border-border bg-card p-4 shadow-2xs flex items-center justify-between hover:border-primary/50 transition cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F172A] text-white shrink-0 shadow-xs">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-foreground">Learning Hub</div>
                <div className="text-xs text-muted-foreground mt-0.5">Study flashcards & take quizzes</div>
              </div>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="4"
                  strokeDasharray="113.1"
                  strokeDashoffset="28.27"
                  strokeLinecap="round"
                  className="dark:stroke-white"
                />
              </svg>
              <span className="absolute text-xs font-bold text-foreground">75%</span>
            </div>
          </button>
        </section>

        {/* My Boards & Folders (Scrollable beneath Quick Actions) */}
        <section id="boards-section" className="isolate space-y-4 pt-4 border-t border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <SectionHeader title="My Boards & Folders" icon={<Folder className="h-4 w-4 text-primary" />} />
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {filteredBoards.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* New Folder Popover */}
              <Popover open={newFolderOpen} onOpenChange={setNewFolderOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl">
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New Folder</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <form onSubmit={handleCreateFolder} className="space-y-2">
                    <div className="text-xs font-semibold text-foreground">Create Folder</div>
                    <Input
                      placeholder="Folder name (e.g. Physics)"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewFolderOpen(false)}
                        className="h-7 text-xs px-2"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="h-7 text-xs px-2.5">
                        Create
                      </Button>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>

              <Button size="sm" onClick={() => openNew()} className="h-8 gap-1.5 text-xs rounded-xl shadow-xs">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Board</span>
              </Button>
            </div>
          </div>

          {/* Folder Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFolderId("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFolderId === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>All ({allBoards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFolderId("starred")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFolderId === "starred"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-card border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star
                className={`h-3.5 w-3.5 ${activeFolderId === "starred" ? "fill-white" : "fill-amber-400 text-amber-400"}`}
              />
              <span>Starred ({starredBoards.length})</span>
            </button>

            {folders.map((f) => {
              const count = allBoards.filter((b) => b.folderId === f.id).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolderId(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeFolderId === f.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span>
                    {f.name} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Boards Grid */}
          {filteredBoards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
              <p className="text-sm font-semibold text-foreground">No boards found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeFolderId === "starred"
                  ? "Star your favorite boards to access them quickly here."
                  : "Create a new board in this folder to get started."}
              </p>
              <Button size="sm" variant="outline" onClick={() => openNew()} className="mt-3 gap-1.5 text-xs rounded-xl">
                <Plus className="h-3.5 w-3.5" /> Create Board
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredBoards.map((b) => {
                    const folderObj = folders.find((f) => f.id === b.folderId);
                    return (
                      <div
                        key={b.id}
                        className="group relative flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-2xs transition hover:border-primary/60 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to="/board/$boardId"
                              params={{ boardId: b.id }}
                              className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                            >
                              {b.title}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(b.id);
                              }}
                              className="shrink-0 p-1 rounded-lg hover:bg-muted text-muted-foreground transition active:scale-90"
                              title={b.favorite ? "Unstar board" : "Star board"}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  b.favorite
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/60 hover:text-foreground"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition"
                                >
                                  <Folder className="h-3 w-3" />
                                  <span className="truncate max-w-[90px]">
                                    {folderObj ? folderObj.name : "No folder"}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-48 p-2">
                                <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                                  Assign to folder:
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBoardFolder(b.id, null)}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-accent text-left ${
                                    !b.folderId ? "font-bold text-primary" : ""
                                  }`}
                                >
                                  <span>None</span>
                                  {!b.folderId && <Check className="h-3.5 w-3.5" />}
                                </button>
                                {folders.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setBoardFolder(b.id, f.id)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-accent text-left ${
                                      b.folderId === f.id ? "font-bold text-primary" : ""
                                    }`}
                                  >
                                    <span className="truncate">{f.name}</span>
                                    {b.folderId === f.id && <Check className="h-3.5 w-3.5" />}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>

                            {b.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                          <span>{relTime(b.updatedAt)}</span>
                          <Link
                            to="/board/$boardId"
                            params={{ boardId: b.id }}
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            Open <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Recent AI Activity */}
        <section className="isolate space-y-2 pt-2 border-t border-border/60">
          <SectionHeader title="Recent AI Activity" icon={<Sparkles className="h-4 w-4 text-primary" />} />
          {recentAI.length === 0 ? (
            <p className="text-xs text-muted-foreground">No AI questions yet. Open a board and ask anything.</p>
          ) : (
            <div className="max-h-[190px] overflow-y-auto space-y-2 pr-1 scrollbar-thin rounded-xl">
              {recentAI.slice(0, 2).map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-3.5 transition hover:border-primary/50 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">{r.prompt}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        {r.response}
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] text-muted-foreground">{relTime(r.createdAt)}</div>
                  </div>
                  {r.boardId && boards[r.boardId] && (
                    <Link
                      to="/board/$boardId"
                      params={{ boardId: r.boardId }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      Open {boards[r.boardId].title} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Docked Bottom Navigation Bar */}
      <BottomNavBar
        activeTab="home"
        onOpenAI={() => openAI({ boardId: continueBoard?.id })}
        boardId={continueBoard?.id}
      />

      <FeatureTourDialog open={tourOpen} onOpenChange={setTourOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <DocumentImportDialog open={docImportOpen} onOpenChange={setDocImportOpen} />
      <AILessonBuilderDialog
        open={aiLessonBuilderOpen}
        onOpenChange={setAiLessonBuilderOpen}
        onLessonGenerated={(pages, topic) => openNewLessonWithPages(pages, topic)}
      />
      <TeacherAccountDialog
        open={teacherAccountOpen}
        onOpenChange={setTeacherAccountOpen}
        onOpenCloudBoard={(targetBoardId) =>
          navigate({ to: "/board/$boardId", params: { boardId: targetBoardId } })
        }
      />
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

function WhiteboardPreviewCanvas() {
  return (
    <div className="relative w-full h-[175px] sm:h-[195px] bg-[#F8FAFC] dark:bg-slate-900/60 overflow-hidden select-none">
      {/* Canvas Dot Grid Background */}
      <svg className="absolute inset-0 h-full w-full opacity-40" width="100%" height="100%">
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#94A3B8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Mini Whiteboard Top Bar */}
      <div className="absolute top-2.5 right-3 flex items-center gap-2 opacity-80 z-5">
        <div className="flex -space-x-1">
          <div className="h-4 w-4 rounded-full bg-blue-500 border border-white" />
          <div className="h-4 w-4 rounded-full bg-emerald-500 border border-white" />
          <div className="h-4 w-4 rounded-full bg-amber-500 border border-white" />
        </div>
        <div className="rounded-md bg-blue-600 px-2 py-0.5 text-[8px] font-bold text-white shadow-2xs">Share</div>
      </div>

      {/* Mini Left Tools Strip */}
      <div className="absolute left-2.5 top-12 flex flex-col gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90 p-1 shadow-xs opacity-75 z-5">
        <div className="h-3 w-3 rounded-xs bg-slate-300 dark:bg-slate-700" />
        <div className="h-3 w-3 rounded-xs bg-blue-500/30" />
        <div className="h-3 w-3 rounded-xs bg-amber-500/30" />
        <div className="h-3 w-3 rounded-xs bg-slate-300 dark:bg-slate-700" />
        <div className="h-3 w-3 rounded-xs bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* SVG Curved Connectors */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none z-1">
        <defs>
          <marker
            id="wb-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
          </marker>
        </defs>
        <path
          d="M 95 65 C 135 65, 160 48, 225 50"
          fill="none"
          stroke="#64748B"
          strokeWidth="1.5"
          markerEnd="url(#wb-arrow)"
        />
        <path
          d="M 165 95 C 185 95, 200 80, 235 80"
          fill="none"
          stroke="#64748B"
          strokeWidth="1.5"
          markerEnd="url(#wb-arrow)"
        />
      </svg>

      {/* Blue Sticky Note */}
      <div className="absolute left-14 top-10 w-24 sm:w-28 rounded-lg bg-[#CBE4FC] p-2 shadow-xs border border-blue-200/60 transform -rotate-1 text-[9px] text-slate-800 leading-tight font-medium z-2">
        <div className="h-1.5 w-6 rounded-full bg-blue-400 mb-1" />
        Whiteboard gestures, pinch zoom & pan
      </div>

      {/* Purple Flow Tag */}
      <div className="absolute left-40 sm:left-44 top-7 rounded-md bg-[#818CF8] px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs z-2">
        Flow
      </div>

      {/* Yellow Sticky Note */}
      <div className="absolute left-36 sm:left-40 top-15 w-24 rounded-lg bg-[#FEF08A] p-2 shadow-xs border border-yellow-300/60 text-[9px] text-slate-800 leading-tight font-medium z-2">
        Sync between devices & web
      </div>

      {/* Pink/Coral Sticky Note */}
      <div className="absolute left-16 top-24 w-24 sm:w-26 rounded-lg bg-[#FBCFE8] p-2 shadow-xs border border-pink-200/60 transform rotate-1 text-[9px] text-slate-800 leading-tight font-medium z-2">
        AI teaching & smart widgets
      </div>

      {/* Wireframe Box */}
      <div className="absolute right-3 sm:right-6 top-8 w-44 sm:w-56 rounded-xl border border-slate-300/80 bg-white dark:border-slate-700 dark:bg-slate-900 p-2 shadow-sm z-2">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">Wireframe</span>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-12 rounded-md border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[7px] text-slate-400 font-medium">Header</span>
          </div>
          <div className="h-12 rounded-md border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[7px] text-slate-400 font-medium">Canvas</span>
          </div>
          <div className="h-12 rounded-md border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[7px] text-slate-400 font-medium">Widgets</span>
          </div>
        </div>
        <div className="mt-1.5 flex gap-1">
          <div className="h-2 w-12 rounded-sm bg-slate-200 dark:bg-slate-700" />
          <div className="h-2 w-8 rounded-sm bg-blue-200 dark:bg-blue-900" />
        </div>
      </div>
    </div>
  );
}
