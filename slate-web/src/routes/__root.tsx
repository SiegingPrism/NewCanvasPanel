import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { SplashScreen } from "../components/ui/SplashScreen";
import { AISheet } from "../components/whiteboard/AISheet";
import { useAISheetStore } from "../lib/ai/aiSheetStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Slate — Smart Whiteboard" },
      {
        name: "description",
        content:
          "A fast, tactile whiteboard for mobile and tablet with smart pens, widgets, and an AI teaching assistant.",
      },
      { property: "og:title", content: "Slate — Smart Whiteboard" },
      { property: "og:description", content: "Draw, teach, and collaborate on any device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AndroidBackHandler() {
  const router = useRouter();
  const location = useLocation();
  const navigate = useNavigate();

  // Track the history stack of visited paths in memory
  const historyStackRef = useRef<string[]>([location.pathname]);

  useEffect(() => {
    const current = location.pathname;
    const stack = historyStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== current) {
      stack.push(current);
    }
  }, [location.pathname]);

  useEffect(() => {
    (window as any).__handleAndroidBack = () => {
      // 1. Check if any open modal, dialog, sheet, or popover is open
      const openModal = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-portal] [data-state="open"]'
      );
      if (openModal) {
        // Dispatch Escape key
        const escEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escEvent);
        const closeBtn = openModal.querySelector<HTMLElement>(
          'button[aria-label="Close"], button.close, [data-state="open"] button'
        );
        if (closeBtn) {
          closeBtn.click();
        }
        return true;
      }

      // 2. If stack has previous pages, navigate to the most recent page
      const stack = historyStackRef.current;
      if (stack.length > 1) {
        stack.pop(); // remove current page
        const previousPath = stack[stack.length - 1];
        if (previousPath && previousPath !== location.pathname) {
          navigate({ to: previousPath as any });
          return true;
        }
      }

      // 3. Fallback: If not on home page "/", always go to "/"
      if (location.pathname !== "/") {
        navigate({ to: "/" });
        return true;
      }

      // 4. On home page with no modal or history to pop
      return false;
    };

    return () => {
      delete (window as any).__handleAndroidBack;
    };
  }, [location.pathname, navigate]);

  return null;
}

function AndroidInsetsHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent) || Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (!isMobile) return;

    const apply = () => {
      const root = document.documentElement;
      const currentSab = root.style.getPropertyValue("--sab");
      if (!currentSab || currentSab === "0px") {
        root.style.setProperty("--sab", "56px");
      }
      const currentSat = root.style.getPropertyValue("--sat");
      if (!currentSat || currentSat === "0px") {
        root.style.setProperty("--sat", "24px");
      }
    };
    apply();
    const timer = setInterval(apply, 1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}

function GlobalAISheet() {
  const isOpen = useAISheetStore((s) => s.isOpen);
  const setOpen = useAISheetStore((s) => s.setOpen);
  const boardId = useAISheetStore((s) => s.boardId);
  const contextText = useAISheetStore((s) => s.contextText);
  const initialPrompt = useAISheetStore((s) => s.initialPrompt);
  const initialSnapshot = useAISheetStore((s) => s.initialSnapshot);

  return (
    <AISheet
      open={isOpen}
      onOpenChange={setOpen}
      boardId={boardId}
      contextText={contextText}
      initialPrompt={initialPrompt}
      initialSnapshot={initialSnapshot}
    />
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <AndroidInsetsHandler />
      <AndroidBackHandler />
      <SplashScreen />
      <GlobalAISheet />
      <Toaster richColors position="top-center" offset="68px" />
    </QueryClientProvider>
  );
}
