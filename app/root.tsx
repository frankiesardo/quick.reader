import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect, useCallback, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import type { Route } from "./+types/root";
import { getSettings, type Theme } from "~/services/db";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.svg" },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:ital,wght@0,300..900;1,300..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Quick Reader" />
        <meta name="mobile-web-app-capable" content="yes" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Hook to apply theme based on user settings (from IndexedDB) with system fallback
function useGlobalTheme() {
  const [userTheme, setUserTheme] = useState<Theme>("auto");

  // Load user theme preference from IndexedDB
  useEffect(() => {
    getSettings().then((settings) => {
      setUserTheme(settings.theme);
    });
  }, []);

  // Apply theme based on user preference + system
  useEffect(() => {
    const applyTheme = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = userTheme === "dark" || (userTheme === "auto" && prefersDark);

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // Update mobile browser bar color
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", isDark ? "#0f172a" : "#ffffff");
      }
    };

    applyTheme();

    // Listen for system theme changes (relevant when userTheme is "auto")
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [userTheme]);
}

// PWA Update Toast Component
function PWAUpdateToast({
  needRefresh,
  onRefresh,
  onClose,
}: {
  needRefresh: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium text-sm">Update available</p>
        <p className="text-xs text-slate-300">A new version is ready to install.</p>
      </div>
      <button
        onClick={onRefresh}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Update
      </button>
      <button
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  useGlobalTheme();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  const handleRefresh = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleClose = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return (
    <>
      <Outlet />
      <PWAUpdateToast needRefresh={needRefresh} onRefresh={handleRefresh} onClose={handleClose} />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-serif text-slate-800 dark:text-slate-100 mb-4">{message}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">{details}</p>
      {stack && (
        <pre className="w-full max-w-2xl p-4 overflow-x-auto bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
