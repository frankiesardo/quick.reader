import { useState, useCallback, useMemo, type RefObject } from "react";
import type { Rendition } from "epubjs";
import {
  createBookmark,
  deleteBookmark,
  type Bookmark,
} from "~/services/db";
import {
  isLocationBookmarked,
  sortBookmarksByPosition,
} from "~/services/cfi";

interface UseBookmarksOptions {
  bookId: string;
  location: string | null;
  initialBookmarks: Bookmark[];
  renditionRef: RefObject<Rendition | null>;
}

export function useBookmarks({
  bookId,
  location,
  initialBookmarks,
  renditionRef,
}: UseBookmarksOptions) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);

  const currentBookmark = isLocationBookmarked(location, bookmarks);
  const isCurrentPageBookmarked = currentBookmark !== null;
  const sortedBookmarks = useMemo(
    () => sortBookmarksByPosition(bookmarks),
    [bookmarks]
  );

  const handleToggleBookmark = useCallback(async () => {
    if (!location) return;

    const existing = isLocationBookmarked(location, bookmarks);

    if (existing) {
      await deleteBookmark(existing.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
    } else {
      // Extract text at current location
      let excerpt = "";
      try {
        if (renditionRef.current) {
          const range = renditionRef.current.getRange(location);
          if (range) {
            const textContent = range.startContainer.textContent || "";
            excerpt = textContent.slice(0, 100).trim();
          }
        }
      } catch (e) {
        // Excerpt extraction failed, continue without it
        console.warn("Could not extract excerpt:", e);
      }

      const bookmark = await createBookmark({
        bookId,
        cfi: location,
        excerpt,
      });
      setBookmarks((prev) => [...prev, bookmark]);
    }
  }, [location, bookmarks, bookId, renditionRef]);

  const handleDeleteBookmark = useCallback(async (id: string) => {
    await deleteBookmark(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return {
    bookmarks,
    sortedBookmarks,
    isCurrentPageBookmarked,
    handleToggleBookmark,
    handleDeleteBookmark,
  };
}

