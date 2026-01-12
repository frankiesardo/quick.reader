import { useState, useEffect, useRef } from "react";
import type { HighlightColor } from "~/services/db";
import { ColorDot } from "./ColorDot";
import { HIGHLIGHT_COLOR_NAMES } from "~/services/highlight";
import { TrashIcon } from "./icons";

// Detect if device is likely touch/mobile (for avoiding native selection popup conflict)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check for touch capability and narrow viewport
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isNarrowViewport = window.innerWidth < 768;
      setIsMobile(hasTouchScreen && isNarrowViewport);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface HighlightPopupProps {
  position: { x: number; y: number };
  stage: "color-picker" | "editing";
  color: HighlightColor;
  note: string | null;
  onColorSelect: (color: HighlightColor) => void; // For stage 1: creates highlight
  onColorChange: (color: HighlightColor) => void; // For editing stage: just updates color
  onSave: (note: string | null) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function HighlightPopup({
  position,
  stage,
  color,
  note: initialNote,
  onColorSelect,
  onColorChange,
  onSave,
  onCancel,
  onDelete,
}: HighlightPopupProps) {
  const [noteValue, setNoteValue] = useState(initialNote || "");
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Position calculation (only used for desktop floating popup)
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Auto-focus textarea when in editing stage (but not in color-picker stage)
  useEffect(() => {
    if (stage !== "editing") return;
    
    // Small delay to ensure popup is positioned
    const timer = setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        // Place cursor at the end of existing text
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (popupRef.current) {
      const popup = popupRef.current;
      const rect = popup.getBoundingClientRect();
      const padding = 16;

      let x = position.x - rect.width / 2;
      let y = position.y - rect.height - 12;

      // Adjust horizontal position
      if (x < padding) x = padding;
      if (x + rect.width > window.innerWidth - padding) {
        x = window.innerWidth - rect.width - padding;
      }

      // If popup would be above viewport, show below
      if (y < padding) {
        y = position.y + 24;
      }

      // Ensure not below viewport
      if (y + rect.height > window.innerHeight - padding) {
        y = window.innerHeight - rect.height - padding;
      }

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  // Close on click outside (cancel)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel]);

  const handleSave = () => {
    onSave(noteValue.trim() || null);
  };

  // Handle color click - behavior depends on stage
  const handleColorClick = (selectedColor: HighlightColor) => {
    if (stage === "color-picker") {
      // Stage 1: Create highlight and transition to editing
      onColorSelect(selectedColor);
    } else {
      // Editing stage: Just update the color
      if (selectedColor !== color) {
        onColorChange(selectedColor);
      }
    }
  };

  // Color-picker stage: minimal UI with just color dots
  // On mobile: fixed TOP bar to avoid conflict with Android's native selection popup AND bottom search bar
  // On desktop: floating popup near the selection
  if (stage === "color-picker") {
    if (isMobile) {
      // Mobile: Fixed top action bar (below app header area)
      return (
        <div
          ref={popupRef}
          className="fixed top-14 left-0 right-0 z-50 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border-b border-slate-200 dark:border-slate-700 px-4 py-3 highlight-popup-mobile-top"
        >
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">Highlight:</span>
            {HIGHLIGHT_COLOR_NAMES.map((c) => (
              <ColorDot
                key={c}
                color={c}
                selected={false}
                onClick={() => handleColorClick(c)}
                size="lg"
              />
            ))}
          </div>
        </div>
      );
    }

    // Desktop: Floating popup near selection
    return (
      <div
        ref={popupRef}
        className="fixed z-50 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 highlight-popup"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        <div className="flex items-center gap-2">
          {HIGHLIGHT_COLOR_NAMES.map((c) => (
            <ColorDot
              key={c}
              color={c}
              selected={false}
              onClick={() => handleColorClick(c)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Editing stage: full UI with textarea and actions
  // On mobile: centered modal with backdrop
  // On desktop: floating popup near selection
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onCancel}
        />
        <div
          ref={popupRef}
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-[90vw] max-w-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 highlight-popup"
        >
          {/* Color Palette */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {HIGHLIGHT_COLOR_NAMES.map((c) => (
              <ColorDot
                key={c}
                color={c}
                selected={c === color}
                onClick={() => handleColorClick(c)}
                size="lg"
              />
            ))}
          </div>

          {/* Note Input */}
          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add a note..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-base border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {noteValue.length > 400 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                {noteValue.length}/500
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 active:text-red-600 transition-colors rounded"
              aria-label="Delete highlight"
            >
              <TrashIcon className="w-5 h-5" />
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop: floating popup near selection
  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 w-64 max-w-[85vw] highlight-popup"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Color Palette */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Color:</span>
        {HIGHLIGHT_COLOR_NAMES.map((c) => (
          <ColorDot
            key={c}
            color={c}
            selected={c === color}
            onClick={() => handleColorClick(c)}
          />
        ))}
      </div>

      {/* Note Input */}
      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          placeholder="Add a note..."
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {noteValue.length > 400 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
            {noteValue.length}/500
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors rounded"
          aria-label="Delete highlight"
        >
          <TrashIcon className="w-4 h-4" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
