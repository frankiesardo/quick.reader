# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server at http://localhost:5173
npm run build         # Build for production
npm run typecheck     # Generate types and run TypeScript check
npm run test          # Run Playwright tests (starts dev server on port 3000)
npm run test:ui       # Run tests with Playwright UI
npm run test:headed   # Run tests in headed browser
npm run test:debug    # Run tests in debug mode
```

## Architecture

This is an offline-first EPUB reader PWA built with React Router v7 (SPA mode) and Tailwind CSS v4. Books and all user data are stored client-side in IndexedDB. The app uses vite-plugin-pwa with Workbox for service worker generation and asset caching.

### Route Structure

- `/books` - Library view showing all uploaded books
- `/books/:bookId` - Reader view for a specific book

Both routes use `clientLoader`/`clientAction` for client-side data operations (no server loaders).

### Key Layers

**Services (`app/services/`):**
- `db.ts` - IndexedDB operations via `idb` library. Stores books, epubs, bookmarks, highlights, chat messages, and settings. Database name: `quick-reader`
- `ai.ts` - AI chat service using Vercel AI SDK with OpenAI-compatible adapter
- `epub.ts` - EPUB file parsing and metadata extraction
- `search.ts` - Full-text search within loaded books

**Hooks (`app/hooks/`):**
- `useNavigation.ts` - TOC, location tracking, drawer state
- `useBookmarks.ts` - Bookmark CRUD with CFI-based deduplication
- `useNotes.ts` - Highlights and notes with color-coded annotations
- `useChat.ts` - AI chat via Vercel AI SDK with streaming responses
- `useSettings.ts` - Reader preferences (theme, font size, spacing, line height)
- `useSearch.ts` - In-book search with flash highlighting

**Components (`app/components/`):**
- `ChatDrawer.tsx` - AI assistant sidebar with streaming responses
- `HighlightPopup.tsx` - Color picker and note editor for text selections
- `SearchModal.tsx` - Full-text search interface

### EPUB Rendering

Uses `react-reader` (wraps epub.js). The `Rendition` ref is passed to hooks for programmatic control. Highlights are rendered as SVG overlays within epub.js iframes.

### Data Flow

1. User uploads EPUB → parsed by `epub.ts` → stored in IndexedDB (`books` + `epubs` tables)
2. Reader loads book → `clientLoader` fetches from IDB → renders via `ReactReader`
3. User interactions (bookmarks, highlights, chat) → hooks call `db.ts` functions → IDB persisted

### AI Integration

The app uses [Vercel AI SDK](https://sdk.vercel.ai) with `@ai-sdk/openai-compatible`:
- Configure via environment variables: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`
- Supports any OpenAI-compatible API endpoint
- Full book text is extracted and cached in IDB for AI context
