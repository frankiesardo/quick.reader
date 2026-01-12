import { useState, useCallback, useEffect, type RefObject } from "react";
import type { Rendition } from "epubjs";

interface UseSearchOptions {
  renditionRef: RefObject<Rendition | null>;
}

export function useSearch({ renditionRef }: UseSearchOptions) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [flashHighlight, setFlashHighlight] = useState<{
    cfi: string;
    searchTerm: string;
  } | null>(null);

  const handleSearchNavigate = useCallback(
    (cfi: string, searchTerm: string) => {
      setIsSearchOpen(false);
      renditionRef.current?.display(cfi);
      setFlashHighlight({ cfi, searchTerm });
    },
    [renditionRef]
  );

  // Flash highlight effect for search results
  useEffect(() => {
    if (!flashHighlight || !renditionRef.current) return;

    const { cfi } = flashHighlight;
    const rendition = renditionRef.current;

    // Wait for navigation to complete
    const timeout = setTimeout(() => {
      try {
        // Add temporary highlight annotation
        rendition.annotations.add(
          "highlight",
          cfi,
          {},
          undefined,
          "search-flash-highlight",
          { fill: "#fef08a", "fill-opacity": "0.7" }
        );

        // Remove after 2 seconds
        setTimeout(() => {
          try {
            rendition.annotations.remove(cfi, "highlight");
          } catch {
            // Ignore if already removed
          }
          setFlashHighlight(null);
        }, 2000);
      } catch (e) {
        console.error("Failed to flash highlight:", e);
        setFlashHighlight(null);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [flashHighlight, renditionRef]);

  return {
    isSearchOpen,
    setIsSearchOpen,
    handleSearchNavigate,
  };
}

