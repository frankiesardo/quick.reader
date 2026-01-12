import { useEffect, useRef, useCallback, useState } from "react";
import ePub, { type Book, type Rendition, type NavItem } from "epubjs";

interface EpubReaderProps {
  url: ArrayBuffer;
  location: string | null;
  locationChanged: (location: string) => void;
  tocChanged: (toc: NavItem[]) => void;
  getRendition: (rendition: Rendition) => void;
  isDarkMode: boolean;
}

export function EpubReader({
  url,
  location,
  locationChanged,
  tocChanged,
  getRendition,
  isDarkMode,
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  // Track the current location internally to avoid redundant navigation
  const currentLocationRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize book and rendition
  useEffect(() => {
    if (!containerRef.current) return;

    setIsReady(false);
    const book = ePub(url);
    bookRef.current = book;

    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: "paginated",
    });
    renditionRef.current = rendition;

    // Expose rendition to parent
    getRendition(rendition);

    // Load navigation/TOC
    book.loaded.navigation.then((nav) => {
      tocChanged(nav.toc);
    });

    // Track location changes
    rendition.on("relocated", (loc: { start: { cfi: string } }) => {
      currentLocationRef.current = loc.start.cfi;
      locationChanged(loc.start.cfi);
    });

    // Display initial location or start, then mark as ready
    const displayPromise = location ? rendition.display(location) : rendition.display();
    displayPromise.then(() => {
      setIsReady(true);
    });

    return () => {
      rendition.destroy();
      book.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      currentLocationRef.current = null;
      setIsReady(false);
    };
  }, [url]); // Only re-init when url changes

  // Handle external location changes (e.g., TOC navigation)
  useEffect(() => {
    if (!isReady || !renditionRef.current || !location) return;

    // Check if we're already at this location to avoid infinite loops
    if (currentLocationRef.current !== location) {
      renditionRef.current.display(location);
    }
  }, [location, isReady]);

  // Apply dark mode theme
  useEffect(() => {
    if (!renditionRef.current) return;

    const bgColor = isDarkMode ? "#1e293b" : "#ffffff";
    const textColor = isDarkMode ? "#f1f5f9" : "#1e293b";

    renditionRef.current.themes.override("color", textColor);
    renditionRef.current.themes.override("background", bgColor);
  }, [isDarkMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!renditionRef.current) return;

      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "ArrowRight") {
        renditionRef.current.next();
      } else if (e.key === "ArrowLeft") {
        renditionRef.current.prev();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* EPUB container */}
      <div ref={containerRef} className="w-full h-full px-8" />

      {/* Navigation arrows */}
      <button
        onClick={handlePrev}
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-6 h-[60vh] flex items-center justify-center transition-colors ${
          isDarkMode
            ? "text-white hover:text-slate-400"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Previous page"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={handleNext}
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-[60vh] flex items-center justify-center transition-colors ${
          isDarkMode
            ? "text-white hover:text-slate-400"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Next page"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
