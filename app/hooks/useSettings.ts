import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "react-router";
import {
  type ReaderSettings,
  type Theme,
  type FontSize,
  type Spacing,
  type LineHeight,
} from "~/services/db";
import type { Rendition } from "epubjs";

// Font size mapping in pixels
export const fontSizeMap: Record<FontSize, number> = {
  xs: 14,
  s: 16,
  m: 18,
  l: 20,
  xl: 24,
};

// Line height mapping
export const lineHeightMap: Record<LineHeight, string> = {
  tight: "1.4",
  normal: "1.6",
  loose: "2.0",
};

// Paragraph spacing mapping
export const spacingMap: Record<Spacing, string> = {
  compact: "0.5em",
  normal: "1em",
  relaxed: "1.5em",
};

interface UseSettingsOptions {
  initialSettings: ReaderSettings;
  renditionRef?: React.RefObject<Rendition | null>;
}

export function useSettings({ initialSettings, renditionRef }: UseSettingsOptions) {
  const [settings, setSettings] = useState<ReaderSettings>(initialSettings);
  const fetcher = useFetcher();
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  // Apply theme to document (class-based for app UI)
  const applyTheme = useCallback((theme: Theme) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "auto" && prefersDark);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Apply reader styles to rendition
  const applyReaderStyles = useCallback((currentSettings: ReaderSettings) => {
    if (!renditionRef?.current) return;

    const rendition = renditionRef.current;
    
    // Determine theme colors
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = currentSettings.theme === "dark" || 
                   (currentSettings.theme === "auto" && prefersDark);
    
    const bgColor = isDark ? "#1e293b" : "#ffffff";
    const textColor = isDark ? "#f1f5f9" : "#1e293b";

    // Apply font size using the dedicated API
    rendition.themes.fontSize(`${fontSizeMap[currentSettings.fontSize]}px`);

    // Register a custom theme and apply it
    // Use override() instead of default() to avoid breaking existing styles
    rendition.themes.override("color", textColor);
    rendition.themes.override("background", bgColor);
    rendition.themes.override("line-height", lineHeightMap[currentSettings.lineHeight]);
  }, [renditionRef]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings.theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryRef.current = mediaQuery;

      const handler = () => {
        applyTheme("auto");
        applyReaderStyles(settings);
      };
      mediaQuery.addEventListener("change", handler);

      return () => {
        mediaQuery.removeEventListener("change", handler);
      };
    }
  }, [settings, applyTheme, applyReaderStyles]);

  // Apply theme to document when settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme, applyTheme]);

  // Apply reader styles when settings change
  useEffect(() => {
    applyReaderStyles(settings);
  }, [settings, applyReaderStyles]);

  // Update settings via clientAction with optimistic update
  const updateSettings = useCallback(
    (data: Partial<Omit<ReaderSettings, "id" | "updatedAt">>) => {
      // Optimistic update - immediately update local state
      setSettings((prev) => ({ ...prev, ...data, updatedAt: Date.now() }));
      
      // Persist via clientAction
      fetcher.submit(
        { intent: "updateSettings", data: JSON.stringify(data) },
        { method: "POST" }
      );
    },
    [fetcher]
  );

  return {
    settings,
    updateSettings,
    applyReaderStyles,
  };
}
