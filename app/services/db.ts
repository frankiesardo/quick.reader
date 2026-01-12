import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: Blob | null;
  createdAt: number;
  updatedAt: number;
  location: string | null;
  fullText?: string;
}

export interface Epub {
  id: string;
  blob: Blob;
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi: string;
  excerpt: string;
  createdAt: number;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";

export interface Highlight {
  id: string;
  bookId: string;
  cfiRange: string;
  text: string;
  color: HighlightColor;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  bookId: string;
  role: "user" | "assistant";
  content: string;
  locationCfi?: string;
  locationLabel?: string;
  locationExcerpt?: string;
  createdAt: number;
}

export type Theme = "light" | "dark" | "auto";
export type FontSize = "xs" | "s" | "m" | "l" | "xl";
export type Spacing = "compact" | "normal" | "relaxed";
export type LineHeight = "tight" | "normal" | "loose";

export interface ReaderSettings {
  id: string; // Always "global"
  theme: Theme;
  fontSize: FontSize;
  spacing: Spacing;
  lineHeight: LineHeight;
  updatedAt: number;
}

export const defaultSettings: ReaderSettings = {
  id: "global",
  theme: "auto",
  fontSize: "m",
  spacing: "normal",
  lineHeight: "normal",
  updatedAt: Date.now(),
};

interface ReaderDB extends DBSchema {
  books: {
    key: string;
    value: Book;
  };
  epubs: {
    key: string;
    value: Epub;
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { bookId: string };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: { bookId: string };
  };
  chatMessages: {
    key: string;
    value: ChatMessage;
    indexes: { bookId: string };
  };
  settings: {
    key: string;
    value: ReaderSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>("quick-reader", 1, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("books", { keyPath: "id" });
          db.createObjectStore("epubs", { keyPath: "id" });

          const bookmarkStore = db.createObjectStore("bookmarks", {
            keyPath: "id",
          });
          bookmarkStore.createIndex("bookId", "bookId");

          const highlightStore = db.createObjectStore("highlights", {
            keyPath: "id",
          });
          highlightStore.createIndex("bookId", "bookId");

          const chatMessageStore = db.createObjectStore("chatMessages", {
            keyPath: "id",
          });
          chatMessageStore.createIndex("bookId", "bookId");
      
          db.createObjectStore("settings", { keyPath: "id" });
        }
      }
    });
  }
  return dbPromise;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  const books = await db.getAll("books");
  return books.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createBook(
  bookData: Omit<Book, "id" | "createdAt" | "updatedAt" | "location">,
  epubBlob: Blob
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const book: Book = {
    ...bookData,
    id,
    createdAt: now,
    updatedAt: now,
    location: null,
  };

  const epub: Epub = {
    id,
    blob: epubBlob,
  };

  const tx = db.transaction(["books", "epubs"], "readwrite");
  await Promise.all([
    tx.objectStore("books").add(book),
    tx.objectStore("epubs").add(epub),
    tx.done,
  ]);

  return id;
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await getDB();
  const book = await db.get("books", id);
  return book ?? null;
}

export async function getEpub(id: string): Promise<Epub | null> {
  const db = await getDB();
  const epub = await db.get("epubs", id);
  return epub ?? null;
}

export async function updateBookLocation(
  id: string,
  location: string
): Promise<void> {
  const db = await getDB();
  const book = await db.get("books", id);
  if (!book) throw new Error("Book not found");

  book.location = location;
  book.updatedAt = Date.now();
  await db.put("books", book);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  const bookmarks = await db.getAllFromIndex("bookmarks", "bookId", id);
  const highlights = await db.getAllFromIndex("highlights", "bookId", id);
  const chatMessages = await db.getAllFromIndex("chatMessages", "bookId", id);

  const tx = db.transaction(
    ["books", "epubs", "bookmarks", "highlights", "chatMessages"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("books").delete(id),
    tx.objectStore("epubs").delete(id),
    ...bookmarks.map((b) => tx.objectStore("bookmarks").delete(b.id)),
    ...highlights.map((h) => tx.objectStore("highlights").delete(h.id)),
    ...chatMessages.map((m) => tx.objectStore("chatMessages").delete(m.id)),
    tx.done,
  ]);
}

// Bookmark functions
export async function getBookmarksByBookId(
  bookId: string
): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAllFromIndex("bookmarks", "bookId", bookId);
}

export async function createBookmark(
  data: Omit<Bookmark, "id" | "createdAt">
): Promise<Bookmark> {
  const db = await getDB();
  const bookmark: Bookmark = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.add("bookmarks", bookmark);
  return bookmark;
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("bookmarks", id);
}

// Highlight functions
export async function getHighlightsByBookId(
  bookId: string
): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex("highlights", "bookId", bookId);
}

export async function createHighlight(
  data: Omit<Highlight, "id" | "createdAt" | "updatedAt">
): Promise<Highlight> {
  const db = await getDB();
  const now = Date.now();
  const highlight: Highlight = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add("highlights", highlight);
  return highlight;
}

export async function updateHighlight(
  id: string,
  data: Partial<Pick<Highlight, "color" | "note">>
): Promise<Highlight> {
  const db = await getDB();
  const highlight = await db.get("highlights", id);
  if (!highlight) throw new Error("Highlight not found");

  const updated: Highlight = {
    ...highlight,
    ...data,
    updatedAt: Date.now(),
  };
  await db.put("highlights", updated);
  return updated;
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("highlights", id);
}

// Chat message functions
export async function getChatMessagesByBookId(
  bookId: string
): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("chatMessages", "bookId", bookId);
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function createChatMessage(
  data: Omit<ChatMessage, "id" | "createdAt">
): Promise<ChatMessage> {
  const db = await getDB();
  const message: ChatMessage = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.add("chatMessages", message);
  return message;
}

export async function deleteChatMessagesByBookId(
  bookId: string
): Promise<void> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("chatMessages", "bookId", bookId);
  const tx = db.transaction("chatMessages", "readwrite");
  await Promise.all([
    ...messages.map((m) => tx.objectStore("chatMessages").delete(m.id)),
    tx.done,
  ]);
}

// Book full text functions (cached extraction for AI chat)
export async function updateBookFullText(
  id: string,
  fullText: string
): Promise<void> {
  const db = await getDB();
  const book = await db.get("books", id);
  if (!book) throw new Error("Book not found");

  book.fullText = fullText;
  await db.put("books", book);
}

// Settings functions
export async function getSettings(): Promise<ReaderSettings> {
  try {
    const db = await getDB();
    const settings = await db.get("settings", "global");
    return settings ?? defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return defaultSettings;
  }
}

export async function updateSettings(
  data: Partial<Omit<ReaderSettings, "id" | "updatedAt">>
): Promise<ReaderSettings> {
  const db = await getDB();
  const current = await getSettings();
  const updated: ReaderSettings = {
    ...current,
    ...data,
    id: "global",
    updatedAt: Date.now(),
  };
  await db.put("settings", updated);
  return updated;
}
