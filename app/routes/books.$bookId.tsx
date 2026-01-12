import type { Route } from "./+types/books.$bookId";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  deleteBook,
  getBook,
  getEpub,
  getBookmarksByBookId,
  getHighlightsByBookId,
  getSettings,
  updateSettings,
  type Bookmark,
  type Highlight,
  type ReaderSettings,
} from "~/services/db";
import { href, redirect } from "react-router";
import type { NavItem, Rendition, Contents } from "epubjs";
import { AppHeader } from "~/components/AppHeader";
import { CloseIcon, MenuIcon, ChatIcon } from "~/components/icons";
import { BookmarkIcon } from "~/components/icons";
import { DrawerTabs, type TabId } from "~/components/DrawerTabs";
import { BookmarkList } from "~/components/BookmarkList";
import { TocList } from "~/components/TocList";
import { NotesList } from "~/components/NotesList";
import { HighlightPopup } from "~/components/HighlightPopup";
import { SearchModal, SearchIcon } from "~/components/SearchModal";
import { ChatDrawer } from "~/components/ChatDrawer";
import { SettingsPanel } from "~/components/SettingsPanel";
import { EpubReader } from "~/components/EpubReader";
import { getColorValue } from "~/services/highlight";
import { useNavigation } from "~/hooks/useNavigation";
import { useBookmarks } from "~/hooks/useBookmarks";
import { useSearch } from "~/hooks/useSearch";
import { useNotes } from "~/hooks/useNotes";
import { useChat } from "~/hooks/useChat";
import { useSettings } from "~/hooks/useSettings";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData.book.title || "Reading";
  return [
    { title: `${title} — Reader` },
    { name: "description", content: `Reading ${title}` },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const book = await getBook(params.bookId);
  if (!book) {
    throw new Error("Book not found");
  }

  const [arrayBuffer, bookmarks, highlights, settings] = await Promise.all([
    getEpub(params.bookId).then((epub) => epub!.blob.arrayBuffer()),
    getBookmarksByBookId(params.bookId),
    getHighlightsByBookId(params.bookId),
    getSettings(),
  ]);

  return { book, arrayBuffer, bookmarks, highlights, settings };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updateSettings") {
    const data = JSON.parse(formData.get("data") as string);
    return await updateSettings(data);
  }

  if (request.method === "DELETE") {
    await deleteBook(params.bookId);
    return redirect(href("/books"));
  }

  throw new Error("Unknown action");
}

export default function BookReader({ loaderData }: Route.ComponentProps) {
  const {
    book,
    arrayBuffer,
    bookmarks: initialBookmarks,
    highlights: initialHighlights,
    settings: initialSettings,
  } = loaderData;
  const renditionRef = useRef<Rendition>(null);

  // Navigation hook - handles TOC, location, drawer state
  const navigation = useNavigation({
    bookId: book.id,
    initialLocation: book.location,
    renditionRef,
  });

  // Bookmarks hook - handles bookmark CRUD and derived state
  const bookmarkState = useBookmarks({
    bookId: book.id,
    location: navigation.location,
    initialBookmarks,
    renditionRef,
  });

  // Search hook - handles search modal and flash highlight
  const search = useSearch({ renditionRef });

  // Notes hook - handles highlights/notes CRUD and popup
  const notes = useNotes({
    bookId: book.id,
    initialHighlights,
    renditionRef,
    onCloseDrawer: () => navigation.setIsDrawerOpen(false),
  });

  // Settings hook - handles reader settings with IDB persistence
  const settingsState = useSettings({ initialSettings, renditionRef });

  // Chat state and hook
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chat = useChat({
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    renditionRef,
    toc: navigation.toc,
  });

  // Initialize chat when drawer opens
  useEffect(() => {
    if (isChatOpen) {
      chat.initializeChat();
    }
  }, [isChatOpen, chat.initializeChat]);

  // Compute effective dark mode state
  const isDarkMode =
    settingsState.settings.theme === "dark" ||
    (settingsState.settings.theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Handle rendition initialization - set up event handlers
  const handleGetRendition = useCallback(
    (rendition: Rendition) => {
      renditionRef.current = rendition;

      // Handle text selection
      rendition.on("selected", notes.handleSelection);

      // Restore highlights and re-apply settings on chapter change
      rendition.on("rendered", () => {
        notes.restoreHighlights(rendition);
        settingsState.applyReaderStyles(settingsState.settings);
      });

      // Inject custom highlight styles and click handler
      rendition.hooks.content.register((contents: Contents) => {
        const doc = contents.window.document;
        const style = doc.createElement("style");
        style.textContent = `
          .epubjs-hl {
            fill-opacity: 0.4;
            mix-blend-mode: multiply;
            cursor: pointer;
          }
          .hl-has-note {
            stroke: currentColor;
            stroke-width: 1.5px;
            stroke-opacity: 0.6;
          }
          .search-flash-highlight {
            fill: #fef08a;
            fill-opacity: 0.7;
            animation: search-flash-fade 2s ease-out forwards;
          }
          @keyframes search-flash-fade {
            0%, 60% { fill-opacity: 0.7; }
            100% { fill-opacity: 0; }
          }
        `;
        doc.head.appendChild(style);

        // Close popup when clicking in epub content (not on a highlight)
        doc.addEventListener("mousedown", (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          // Don't close if clicking on a highlight annotation
          if (!target.closest(".epubjs-hl")) {
            notes.handleCancelHighlight();
          }
        });
      });

      // Initial restore of highlights
      notes.restoreHighlights(rendition);
      // Apply settings styles immediately when rendition is ready
      settingsState.applyReaderStyles(settingsState.settings);
    },
    [notes, settingsState]
  );

  return (
    <div className="h-app w-screen flex flex-col bg-white dark:bg-slate-900">
      <AppHeader
        title={book.title}
        showBack
        menuButton={
          <button
            onClick={() => navigation.setIsDrawerOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Open table of contents"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        }
        rightContent={
          <div className="flex items-center gap-1">
            <button
              onClick={() => search.setIsSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Search in book"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
            <button
              onClick={bookmarkState.handleToggleBookmark}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                bookmarkState.isCurrentPageBookmarked
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              aria-label={bookmarkState.isCurrentPageBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <BookmarkIcon filled={bookmarkState.isCurrentPageBookmarked} className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Open AI chat"
            >
              <ChatIcon className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Reader */}
      <div className={`flex-1 relative ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
        <EpubReader
          url={arrayBuffer}
          location={navigation.location}
          locationChanged={navigation.handleLocationChange}
          tocChanged={navigation.handleTocChange}
          isDarkMode={isDarkMode}
          getRendition={handleGetRendition}
        />

        {/* Highlight Popup */}
        {notes.highlightPopup && (
          <HighlightPopup
            position={notes.highlightPopup.position}
            stage={notes.highlightPopup.stage}
            color={notes.highlightPopup.color}
            note={notes.highlightPopup.note}
            onColorSelect={notes.handleColorSelect}
            onColorChange={notes.handleHighlightColorChange}
            onSave={notes.handleHighlightSave}
            onCancel={notes.handleCancelHighlight}
            onDelete={() => notes.highlightPopup?.highlightId && notes.handleDeleteHighlight(notes.highlightPopup.highlightId, notes.highlightPopup.cfiRange)}
          />
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={search.isSearchOpen}
        onClose={() => search.setIsSearchOpen(false)}
        onNavigate={search.handleSearchNavigate}
        rendition={renditionRef.current}
      />

      {/* Navigation Drawer (left) */}
      <NavigationDrawer
        isOpen={navigation.isDrawerOpen}
        onClose={() => navigation.setIsDrawerOpen(false)}
        activeTab={navigation.activeTab}
        onTabChange={navigation.setActiveTab}
        toc={navigation.toc}
        bookmarks={bookmarkState.sortedBookmarks}
        highlights={notes.sortedHighlights}
        onNavigate={navigation.navigate}
        onDeleteBookmark={bookmarkState.handleDeleteBookmark}
        onNavigateToHighlight={notes.handleNavigateToHighlight}
        onDeleteHighlight={notes.handleDeleteHighlight}
        settings={settingsState.settings}
        onUpdateSettings={settingsState.updateSettings}
      />

      {/* Chat Drawer (right) */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chat.messages}
        isLoading={chat.isLoading}
        isExtracting={chat.isExtracting}
        streamingContent={chat.streamingContent}
        onSendMessage={chat.sendMessage}
        onClearChat={chat.clearChat}
        isInitialized={chat.isInitialized}
        isConfigured={chat.isConfigured}
      />
    </div>
  );
}

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  toc: NavItem[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onNavigate: (location: string) => void;
  onDeleteBookmark: (id: string) => void;
  onNavigateToHighlight: (cfiRange: string) => void;
  onDeleteHighlight: (id: string) => void;
  settings: ReaderSettings;
  onUpdateSettings: (data: Partial<Omit<ReaderSettings, "id" | "updatedAt">>) => void;
}

function NavigationDrawer({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  toc,
  bookmarks,
  highlights,
  onNavigate,
  onDeleteBookmark,
  onNavigateToHighlight,
  onDeleteHighlight,
  settings,
  onUpdateSettings,
}: NavigationDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-30 transition-opacity duration-150 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl z-40 transform transition-transform duration-150 ease-out flex flex-col overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation"
      >
        {/* Drawer Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {activeTab === "settings" ? "Settings" : "Navigation"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            aria-label="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <DrawerTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          bookmarkCount={bookmarks.length}
          noteCount={highlights.length}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "contents" && (
            <TocList items={toc} onNavigate={onNavigate} />
          )}

          {activeTab === "bookmarks" && (
            <BookmarkList
              bookmarks={bookmarks}
              onNavigate={onNavigate}
              onDelete={onDeleteBookmark}
            />
          )}

          {activeTab === "notes" && (
            <NotesList
              highlights={highlights}
              onNavigate={onNavigateToHighlight}
              onDelete={onDeleteHighlight}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel
              settings={settings}
              onUpdate={onUpdateSettings}
            />
          )}
        </div>
      </aside>
    </>
  );
}
