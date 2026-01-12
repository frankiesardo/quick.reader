import type { Rendition, NavItem } from "epubjs";
import { EpubCFI } from "epubjs";
import type Section from "epubjs/types/section";

// epub.js Section.find() returns this shape but types are incomplete
interface EpubSearchMatch {
  cfi: string;
  excerpt: string;
}

export interface SearchResult {
  cfi: string;
  excerpt: string;
  chapterTitle: string;
}

// Chapter with its CFI position for comparison
interface ChapterPosition {
  label: string;
  cfi: string | null;
}

/**
 * Get all TOC entries (including nested subitems) that match a spine item's href
 */
function getMatchingTocEntries(toc: NavItem[], spineHref: string): NavItem[] {
  const matches: NavItem[] = [];

  function traverse(items: NavItem[]) {
    for (const item of items) {
      const tocHref = item.href.split("#")[0];
      if (spineHref.includes(tocHref) || spineHref.endsWith(tocHref)) {
        matches.push(item);
      }
      if (item.subitems?.length) {
        traverse(item.subitems);
      }
    }
  }

  traverse(toc);
  return matches;
}

/**
 * Get chapter positions with their CFIs for a spine item
 */
function getChapterPositions(
  item: Section,
  matchingChapters: NavItem[]
): ChapterPosition[] {
  const positions: ChapterPosition[] = [];

  for (const chapter of matchingChapters) {
    const anchor = chapter.href.split("#")[1];
    let cfi: string | null = null;

    if (anchor && item.document) {
      const element = item.document.getElementById(anchor);
      if (element) {
        try {
          cfi = item.cfiFromElement(element);
        } catch {
          // Failed to get CFI, will use null
        }
      }
    }

    positions.push({
      label: chapter.label.trim(),
      cfi,
    });
  }

  return positions;
}

/**
 * Find the correct chapter for a search match by comparing CFI positions
 */
function findChapterForMatch(
  matchCfi: string,
  chapters: ChapterPosition[],
  fallbackLabel: string
): string {
  // If only one chapter or no chapters with CFIs, use first/fallback
  const chaptersWithCfi = chapters.filter((c) => c.cfi !== null);

  if (chapters.length === 0) {
    return fallbackLabel;
  }

  if (chapters.length === 1 || chaptersWithCfi.length === 0) {
    return chapters[0].label;
  }

  // Sort chapters by CFI position (ascending - earliest in book first)
  const sortedChapters = [...chaptersWithCfi].sort((a, b) => {
    const cfiA = new EpubCFI(a.cfi!);
    return cfiA.compare(a.cfi!, b.cfi!);
  });

  // Find the last chapter whose CFI comes before or at the match position
  const matchEpubCfi = new EpubCFI(matchCfi);
  let bestMatch = sortedChapters[0];

  for (const chapter of sortedChapters) {
    const comparison = matchEpubCfi.compare(chapter.cfi!, matchCfi);
    // comparison <= 0 means chapter.cfi is before or at matchCfi
    if (comparison <= 0) {
      bestMatch = chapter;
    } else {
      // We've passed the match position, stop
      break;
    }
  }

  return bestMatch.label;
}

/**
 * Search through the entire book for matching text
 */
export async function searchBook(
  rendition: Rendition,
  query: string
): Promise<SearchResult[]> {
  if (!query.trim() || query.length < 2) return [];

  const book = rendition.book;
  const results: SearchResult[] = [];

  // Get TOC for chapter names
  const toc = book.navigation?.toc || [];

  // Get spine items - use the spine's each method to iterate
  const spineItems: Section[] = [];
  book.spine.each((item: Section) => {
    spineItems.push(item);
  });

  // Search each spine item
  for (const item of spineItems) {
    try {
      await item.load(book.load.bind(book));

      // Find ALL matching chapters from TOC (not just the first)
      const matchingChapters = getMatchingTocEntries(toc, item.href);

      // Get chapter positions with CFIs
      const chapterPositions = getChapterPositions(item, matchingChapters);

      // Use epubjs find method (cast needed - types are incomplete)
      const matches = (await item.find(query)) as unknown as EpubSearchMatch[];

      for (const match of matches) {
        // Find the correct chapter for this match
        const chapterTitle = findChapterForMatch(
          match.cfi,
          chapterPositions,
          item.href
        );

        results.push({
          cfi: match.cfi,
          excerpt: match.excerpt,
          chapterTitle,
        });
      }
    } catch (e) {
      console.warn(`Failed to search spine item: ${item.href}`, e);
    } finally {
      item.unload();
    }
  }

  return results;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
