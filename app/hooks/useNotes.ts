import { useState, useCallback, useMemo, useRef, useEffect, type RefObject } from "react";
import type { Rendition, Contents } from "epubjs";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
  type Highlight,
  type HighlightColor,
} from "~/services/db";
import { sortHighlightsByPosition } from "~/services/cfi";
import { getColorValue, DEFAULT_HIGHLIGHT_COLOR } from "~/services/highlight";

export interface HighlightPopupState {
  position: { x: number; y: number };
  isNew: boolean;
  // Stage of the popup: color-picker (just colors, no focus steal) or editing (full UI)
  stage: "color-picker" | "editing";
  // For existing highlights
  highlightId?: string;
  // Common data (draft for new, current values for existing)
  cfiRange: string;
  text: string;
  color: HighlightColor;
  note: string | null;
}

interface UseNotesOptions {
  bookId: string;
  initialHighlights: Highlight[];
  renditionRef: RefObject<Rendition | null>;
  onCloseDrawer: () => void;
}

export function useNotes({
  bookId,
  initialHighlights,
  renditionRef,
  onCloseDrawer,
}: UseNotesOptions) {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const [highlightPopup, setHighlightPopup] = useState<HighlightPopupState | null>(null);

  // Ref needed for epub.js click handlers that capture stale closures
  const highlightsRef = useRef<Highlight[]>(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  const sortedHighlights = useMemo(
    () => sortHighlightsByPosition(highlights),
    [highlights]
  );

  // Helper to find iframe offset from an element inside it
  const getIframeOffset = useCallback((targetInIframe: Node) => {
    // Find which iframe contains the target element
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument?.contains(targetInIframe)) {
          const rect = iframe.getBoundingClientRect();
          return { x: rect.left, y: rect.top };
        }
      } catch {
        // Cross-origin iframe, skip
      }
    }
    // Fallback to first iframe
    const firstIframe = document.querySelector('iframe');
    if (firstIframe) {
      const rect = firstIframe.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return { x: 0, y: 0 };
  }, []);

  // Highlight click handler (for existing highlights - goes straight to editing stage)
  const handleHighlightClick = useCallback(
    (cfiRange: string, e: MouseEvent) => {
      const highlight = highlightsRef.current.find(
        (h) => h.cfiRange === cfiRange
      );
      if (!highlight) return;

      // epub.js click events have coordinates already in main window space
      // Use clientX/clientY directly - no offset needed
      setHighlightPopup({
        position: { x: e.clientX, y: e.clientY },
        isNew: false,
        stage: "editing", // Existing highlights go straight to editing
        highlightId: highlight.id,
        cfiRange: highlight.cfiRange,
        text: highlight.text,
        color: highlight.color,
        note: highlight.note,
      });
    },
    []
  );

  // Restore highlights to the rendition
  const restoreHighlights = useCallback(
    (rendition: Rendition) => {
      highlightsRef.current.forEach((h) => {
        try {
          rendition.annotations.add(
            "highlight",
            h.cfiRange,
            {},
            (e: MouseEvent) => handleHighlightClick(h.cfiRange, e),
            h.note ? "hl-has-note" : "",
            { fill: getColorValue(h.color), "fill-opacity": "0.4" }
          );
        } catch {
          // CFI might not exist in this chapter
        }
      });
    },
    [handleHighlightClick]
  );

  // Handle text selection to show color picker popup (stage 1)
  // No focus steal - user can still CMD+C to copy
  const handleSelection = useCallback(
    (cfiRange: string, contents: Contents) => {
      if (!renditionRef.current) return;

      const range = renditionRef.current.getRange(cfiRange);
      const text = range.toString();
      if (!text.trim()) return;

      // Get position for popup (keep native selection visible - don't clear it)
      const rect = range.getBoundingClientRect();
      
      // Adjust for iframe offset - use the range's container to find the right iframe
      const offset = getIframeOffset(range.startContainer);
      const x = rect.left + rect.width / 2 + offset.x;
      const y = rect.top + offset.y;

      // Show color picker popup (stage 1) - no form elements, no focus steal
      // Native browser selection remains visible and CMD+C works
      setHighlightPopup({
        position: { x, y },
        isNew: true,
        stage: "color-picker",
        cfiRange,
        text: text.slice(0, 500),
        color: DEFAULT_HIGHLIGHT_COLOR,
        note: null,
      });
    },
    [renditionRef, getIframeOffset]
  );

  // Handle highlight color change in editing stage (just updates popup state)
  const handleHighlightColorChange = useCallback(
    (color: HighlightColor) => {
      setHighlightPopup((prev) => (prev ? { ...prev, color } : null));
    },
    []
  );

  // Handle color selection in stage 1 (color-picker):
  // Creates the highlight immediately and transitions to editing stage
  const handleColorSelect = useCallback(
    async (color: HighlightColor) => {
      if (!highlightPopup || !renditionRef.current) return;
      
      // Only applies to new highlights in color-picker stage
      if (!highlightPopup.isNew || highlightPopup.stage !== "color-picker") {
        // For existing highlights or already in editing, just update color
        setHighlightPopup((prev) => (prev ? { ...prev, color } : null));
        return;
      }

      const { cfiRange, text } = highlightPopup;

      // Create the highlight in DB immediately with selected color (no note yet)
      const highlight = await createHighlight({
        bookId,
        cfiRange,
        text,
        color,
        note: null,
      });

      // Add visual annotation with click handler
      renditionRef.current.annotations.add(
        "highlight",
        cfiRange,
        {},
        (e: MouseEvent) => handleHighlightClick(cfiRange, e),
        "", // No note class yet
        { fill: getColorValue(color), "fill-opacity": "0.4" }
      );

      // Clear browser selection now that we have a permanent highlight
      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.getSelection()?.removeAllRanges();
      }

      // Update highlights state
      setHighlights((prev) => [...prev, highlight]);

      // Transition to editing stage (now it's an existing highlight)
      setHighlightPopup({
        ...highlightPopup,
        isNew: false,
        stage: "editing",
        highlightId: highlight.id,
        color,
        note: null,
      });
    },
    [highlightPopup, bookId, handleHighlightClick, renditionRef]
  );

  // Handle saving highlight (updates existing - new highlights are created in handleColorSelect)
  const handleHighlightSave = useCallback(
    async (note: string | null) => {
      if (!highlightPopup || !renditionRef.current) return;

      const { cfiRange, color, highlightId } = highlightPopup;

      if (!highlightId) return; // Should always have an ID at this point

      // Update existing highlight
      const updated = await updateHighlight(highlightId, {
        color,
        note,
      });

      setHighlights((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h))
      );

      // Update visual annotation
      try {
        renditionRef.current.annotations.remove(cfiRange, "highlight");
        renditionRef.current.annotations.add(
          "highlight",
          cfiRange,
          {},
          (e: MouseEvent) => handleHighlightClick(cfiRange, e),
          note ? "hl-has-note" : "",
          { fill: getColorValue(color), "fill-opacity": "0.4" }
        );
      } catch {
        // Ignore annotation errors
      }

      setHighlightPopup(null);
    },
    [highlightPopup, handleHighlightClick, renditionRef]
  );

  // Handle cancel (closes popup)
  // Only clears browser selection if still in color-picker stage (highlight not yet created)
  const handleCancelHighlight = useCallback(() => {
    setHighlightPopup((current) => {
      // Only clear browser selection if still in color-picker stage
      // (highlight hasn't been created yet)
      if (current?.stage === "color-picker") {
        const iframe = document.querySelector('iframe');
        iframe?.contentWindow?.getSelection()?.removeAllRanges();
      }
      return null;
    });
  }, []);

  // Handle delete highlight (works for both popup and list)
  // Optional cfiRange param is used when deleting from popup (more reliable than state lookup)
  const handleDeleteHighlight = useCallback(
    async (id: string, cfiRangeFromPopup?: string) => {
      // Get cfiRange from popup if provided, otherwise look up from state
      let cfiRange = cfiRangeFromPopup;
      
      setHighlights((prev) => {
        // If no cfiRange provided, look it up from state
        if (!cfiRange) {
          const highlight = prev.find((h) => h.id === id);
          cfiRange = highlight?.cfiRange;
        }
        return prev.filter((h) => h.id !== id);
      });

      await deleteHighlight(id);

      // Remove visual annotation if rendition is available
      if (cfiRange && renditionRef.current) {
        try {
          renditionRef.current.annotations.remove(cfiRange, "highlight");
        } catch {
          // Ignore annotation errors
        }
      }

      setHighlightPopup(null);
    },
    [renditionRef]
  );

  // Handle navigation to highlight from notes list (just navigates, doesn't open popup)
  const handleNavigateToHighlight = useCallback(
    (cfiRange: string) => {
      onCloseDrawer();
      renditionRef.current?.display(cfiRange);
    },
    [onCloseDrawer, renditionRef]
  );

  return {
    highlights,
    sortedHighlights,
    highlightPopup,
    restoreHighlights,
    handleSelection,
    handleColorSelect,
    handleHighlightColorChange,
    handleHighlightSave,
    handleCancelHighlight,
    handleDeleteHighlight,
    handleNavigateToHighlight,
  };
}

