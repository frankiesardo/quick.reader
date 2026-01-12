# Read — Epub Reader App

A simple, fully offline epub reader built for mobile-first touch interaction.

## Features

1. [Navigation](./01-navigation) — Core epub management with persistent navigation
2. [Bookmarks](./02-bookmarks) — Save and navigate to reading positions
3. [Notes & Highlights](./03-notes-and-highlights) — Text highlighting with color choices and notes
4. [Search](./04-search) — Full-text search within books
5. [AI Chat](./05-chat) — Ask questions about the book with an AI assistant
6. [Settings](./06-settings) — Customize theme, font size, spacing, and line height

## Tech Stack

- Framework: React Router v7 (SPA mode)
- Storage: IndexedDB via `idb` library
- Reader: `react-reader` (wraps epub.js)
- AI: [Vercel AI SDK](https://sdk.vercel.ai) with `@ai-sdk/openai-compatible`
- Styling: Tailwind CSS v4
- Testing: Playwright

## Design Philosophy

### Visual Style: Clean & Minimal

Inspired by Google Play Books and other best-in-class reading apps:

- **Light-weight icons** — 1.5px stroke width for a clean, refined look
- **Generous touch targets** — 40px minimum tap areas with subtle hover backgrounds
- **Minimal chrome** — White backgrounds with subtle borders, not heavy colored bars
- **Consistent spacing** — Balanced gaps between elements for visual breathing room

### Offline-First

Everything runs locally in the browser:

- Books stored as blobs in IndexedDB
- No server required after initial load
- Reading position persists across sessions

### Progressive Web App

The app is installable on mobile and desktop:

- **Add to Home Screen** — Install directly from the browser for an app-like experience
- **Service Worker** — Caches all assets for true offline use (Workbox via vite-plugin-pwa)
- **Automatic Updates** — Toast prompts users when a new version is available
- **iOS Support** — Apple-specific meta tags for proper status bar styling

### Mobile-First

The app is designed for touch devices:

- **No hover states for critical actions** — All interactive elements visible and tappable without hover
- **Touch-friendly targets** — Buttons at least 40px × 40px tap areas
- **Delete buttons always visible** — No "reveal on hover" patterns
- **Dynamic viewport height** — Uses `100dvh` to handle mobile browser chrome correctly
- **Native popup avoidance** — Highlight picker uses top action bar on mobile to avoid conflicting with Android's native selection popup and bottom search bar

### Simple UI Patterns

- **Drawer navigation** — Slide-in panel for TOC, bookmarks, and notes
- **Immediate saves** — Highlights save on creation; no "save" dialogs
- **Minimal confirmations** — Direct actions (delete = gone, no "are you sure?")

### Client-Side Data

Prefer `clientLoader` and `clientAction` for all data operations:

```tsx
// Load data from IndexedDB
export async function clientLoader({ params }) {
  return { book: await getBook(params.bookId) };
}

// Handle mutations (POST, DELETE, etc.)
export async function clientAction({ request }) {
  if (request.method === "DELETE") {
    await deleteBook(params.bookId);
    return redirect("/books");
  }
}
```

This keeps the app fully client-side with no server round-trips.
