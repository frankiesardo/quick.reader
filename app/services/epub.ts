import ePub from "epubjs";
import type { Rendition, NavItem, Location } from "epubjs";
import type Section from "epubjs/types/section";
import { getBook, updateBookFullText } from "./db";

interface Parsed {
  title: string;
  author: string;
  cover: Blob | null;
}

export async function parseEpub(file: File): Promise<Parsed> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  await book.ready;

  const metadata = await book.loaded.metadata;
  const title = metadata.title || file.name.replace(/\.epub$/i, "");
  const author = metadata.creator || "Unknown Author";

  let cover: Blob | null = null;
  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      const response = await fetch(coverUrl);
      cover = await response.blob();
    }
  } catch {
    // Cover extraction failed, leave as null
  }

  book.destroy();

  return { title, author, cover };
}

/**
 * Extract full text from an epub book.
 * Loads each spine item, extracts text content, and joins with separators.
 */
export async function extractFullText(rendition: Rendition): Promise<string> {
  const book = rendition.book;
  const sections: string[] = [];

  // Get spine items
  const spineItems: Section[] = [];
  book.spine.each((item: Section) => {
    spineItems.push(item);
  });

  for (const item of spineItems) {
    try {
      await item.load(book.load.bind(book));
      const text = item.document?.body?.textContent?.trim();
      if (text) {
        sections.push(text);
      }
    } catch (e) {
      console.warn(`Failed to extract text from spine item: ${item.href}`, e);
    } finally {
      item.unload();
    }
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Get the full book text, using cache if available.
 * Extracts and caches on first call.
 */
export async function getOrExtractFullText(
  bookId: string,
  rendition: Rendition
): Promise<string> {
  // Check cache first (stored on book record)
  const book = await getBook(bookId);
  if (book?.fullText) {
    return book.fullText;
  }

  // Extract and cache
  const fullText = await extractFullText(rendition);
  await updateBookFullText(bookId, fullText);
  return fullText;
}

/**
 * Get the text content currently visible in the rendition.
 * Uses currentLocation() to get start/end CFIs and book.getRange() to extract text.
 * 
 * Note: In spread view, this returns text from all visible pages. The full text
 * is stored and CSS line-clamp is used for visual truncation in the UI.
 */
export async function getVisibleText(rendition: Rendition): Promise<string> {
  try {
    const location = rendition.currentLocation() as unknown as Location | undefined;
    if (!location?.start?.cfi || !location?.end?.cfi) {
      return "";
    }

    const startCfi = location.start.cfi;
    const endCfi = location.end.cfi;
    const book = rendition.book;
    
    // Get DOM range from start CFI
    const range = await book.getRange(startCfi);
    
    if (range) {
      // Extend range to end location to capture full visible text
      const endRange = await book.getRange(endCfi);
      if (endRange) {
        range.setEnd(endRange.endContainer, endRange.endOffset);
      }
      
      return range.toString().trim();
    }
    
    return "";
  } catch (error) {
    console.error("[getVisibleText] Error:", error);
    return "";
  }
}

/**
 * Get the current chapter/section label based on the current location.
 */
export function getCurrentChapterLabel(
  rendition: Rendition,
  toc: NavItem[]
): string {
  try {
    const location = rendition.currentLocation() as unknown as Location | undefined;
    if (!location) return "Unknown location";

    // Get the current href
    const start = location.start;
    if (!start) return "Unknown location";

    const currentHref = start.href;

    // Find matching TOC entry
    const findInToc = (items: NavItem[]): string | null => {
      for (const item of items) {
        // Check if href matches (ignoring anchor)
        const itemHref = item.href.split("#")[0];
        const currentBase = currentHref.split("#")[0];

        if (itemHref === currentBase || currentBase.endsWith(itemHref)) {
          return item.label.trim();
        }

        // Check subitems
        if (item.subitems && item.subitems.length > 0) {
          const found = findInToc(item.subitems);
          if (found) return found;
        }
      }
      return null;
    };

    const label = findInToc(toc);
    return label || "Unknown chapter";
  } catch {
    return "Unknown location";
  }
}
