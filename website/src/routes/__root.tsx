import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav } from "../components/site/Nav";
import { MaintenancePage } from "../components/site/MaintenancePage";
import logoImage from "../assets/logo.png";
import { Footer } from "../components/site/Footer";
import { useState } from "react";

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="flex min-h-[70vh] items-center justify-center px-4 pt-24">
        <div className="max-w-md text-center">
          <div className="eyebrow justify-center">Error 404</div>
          <h1 className="mt-4 text-6xl md:text-7xl">Page not found.</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-primary"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl">Something went wrong.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again or return to the home page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-primary"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent"
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TechFocal Enterprises LLP — Precision Engineering & Manufacturing" },
      {
        name: "description",
        content:
          "TechFocal Enterprises LLP delivers precision machining, turning, boring, and custom manufacturing with quality, reliability, and on-time delivery.",
      },
      { name: "author", content: "TechFocal Enterprises LLP" },
      { property: "og:title", content: "TechFocal Enterprises LLP — Precision Engineering" },
      {
        property: "og:description",
        content:
          "Precision machining, manufacturing, and engineering solutions built for modern industries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [isInitializing, setIsInitializing] = useState(true);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; data: any } | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Check if user has a preview token
    const token = localStorage.getItem("techfocal_preview_token");
    if (token) {
      setIsVerified(true);
    }

    // Fetch maintenance status
    const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    fetch(`${apiUrl}/api/maintenance/status`)
      .then((res) => res.json())
      .then((data) => {
        setMaintenance({ enabled: data.enabled === true, data });
      })
      .catch((err) => {
        console.error("Failed to check maintenance status", err);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-white shadow-lift border border-border">
            {/* Pulsing indicator */}
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-primary" />
            <img src={logoImage} alt="TechFocal" className="w-10 h-10 object-contain relative z-10" />
          </div>
          <div className="h-1 w-32 bg-secondary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary/40 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (maintenance?.enabled && !isVerified) {
    return (
      <QueryClientProvider client={queryClient}>
        <MaintenancePage 
          data={maintenance.data} 
          onVerified={() => setIsVerified(true)} 
        />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Nav />
      <main className="pt-18">
        <Outlet />
      </main>
      <Footer />
    </QueryClientProvider>
  );
}
