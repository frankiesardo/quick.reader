import type { Bookmark, Highlight } from "~/services/db";
import { EpubCFI } from "epubjs";

/**
 * Sort items by CFI position (descending - most advanced in book first)
 */
function sortByCfi<T>(items: T[], getCfi: (item: T) => string): T[] {
  const withCfi = items.map((item) => ({ item, cfi: new EpubCFI(getCfi(item)) }));
  withCfi.sort((a, b) => -a.cfi.compare(a.cfi.toString(), b.cfi.toString()));
  return withCfi.map(({ item }) => item);
}

export function sortBookmarksByPosition(bookmarks: Bookmark[]): Bookmark[] {
  return sortByCfi(bookmarks, (b) => b.cfi);
}

export function sortHighlightsByPosition(highlights: Highlight[]): Highlight[] {
  return sortByCfi(highlights, (h) => h.cfiRange);
}

export function isLocationBookmarked(
  currentCfi: string | null,
  bookmarks: Bookmark[]
): Bookmark | null {
  if (!currentCfi) return null;

  const currentEpubCfi = new EpubCFI(currentCfi);

  for (const bookmark of bookmarks) {
    const bookmarkCfi = new EpubCFI(bookmark.cfi);
    // Check if CFIs point to same chapter/section
    if (currentEpubCfi.spinePos === bookmarkCfi.spinePos) {
      // Compare positions - exact match
      const comparison = currentEpubCfi.compare(currentCfi, bookmark.cfi);
      if (comparison === 0) {
        return bookmark;
      }
    }
  }
  return null;
}

