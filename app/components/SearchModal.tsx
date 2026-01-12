import { useState, useEffect, useCallback, useRef } from "react";
import type { Rendition } from "epubjs";
import { searchBook, escapeRegex, type SearchResult } from "~/services/search";
import { SearchIcon, CloseIcon } from "./icons";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (cfi: string, searchTerm: string) => void;
  rendition: Rendition | null;
}

export function SearchModal({
  isOpen,
  onClose,
  onNavigate,
  rendition,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Reset state when closing
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!rendition || !searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(searchQuery.length >= 2);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const searchResults = await searchBook(rendition, searchQuery);
        setResults(searchResults);
      } catch (e) {
        console.error("Search failed:", e);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [rendition]
  );

  // Handle query change with debounce
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newQuery);
      }, 300);
    },
    [performSearch]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.cfi, query);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 search-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col pointer-events-auto search-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search in this book"
              className="flex-1 text-lg outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent text-slate-900 dark:text-slate-100"
            />
            <button
              onClick={onClose}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
              aria-label="Close search"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {/* Loading */}
            {isSearching && (
              <div className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin mb-2" />
                <p className="text-sm">Searching...</p>
              </div>
            )}

            {/* Empty state - no query */}
            {!isSearching && !hasSearched && (
              <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                <p className="text-sm">Type to search in this book</p>
              </div>
            )}

            {/* No results */}
            {!isSearching && hasSearched && results.length === 0 && query.length >= 2 && (
              <div className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No results for "{query}"</p>
              </div>
            )}

            {/* Results list */}
            {!isSearching && results.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800 sticky top-0">
                  {results.length} {results.length === 1 ? "result" : "results"} found
                </div>
                <ul>
                  {results.map((result, index) => (
                    <SearchResultItem
                      key={`${result.cfi}-${index}`}
                      result={result}
                      searchTerm={query}
                      onClick={() => handleResultClick(result)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  searchTerm: string;
  onClick: () => void;
}

function SearchResultItem({ result, searchTerm, onClick }: SearchResultItemProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 cursor-pointer text-left transition-colors"
      >
        <SearchIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
            {result.chapterTitle}
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2">
            <HighlightedText text={result.excerpt} term={searchTerm} />
          </div>
        </div>
      </button>
    </li>
  );
}

function HighlightedText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;

  const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 dark:text-amber-100 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Re-export for convenience
export { SearchIcon } from "./icons";

