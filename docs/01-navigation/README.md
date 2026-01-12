# Navigation

Core epub management with persistent navigation.

## Data Model

**`books`** — Book metadata
- `id`, `title`, `author`, `cover` (Blob), `createdAt`, `updatedAt`, `location` (CFI string)

**`epubs`** — File storage (separate for performance)
- `id` (same as book), `blob` (full epub file)

## Routes

### Library (`/books`)

Grid of book covers sorted by `updatedAt`. Each card shows cover, title, author, and a three-dot menu with delete.

**Add book flow**: Hidden file input inside styled label. On change, `form.requestSubmit()` triggers the action.

```tsx
<label className="cursor-pointer ...">
  Add Book
  <input type="file" accept=".epub" className="hidden"
    onChange={(e) => e.target.form?.requestSubmit()} />
</label>
```

**clientAction**: Parses epub with `epubjs`, extracts metadata/cover, stores in IndexedDB.

### Reader (`/books/:bookId`)

Full-screen epub reader using `react-reader`.

**clientLoader**: Fetches book metadata + epub blob, converts blob to ArrayBuffer.

```tsx
const epub = await getEpub(params.bookId);
const arrayBuffer = await epub.blob.arrayBuffer();
return { book, arrayBuffer };
```

**Key react-reader props**:
- `url` — ArrayBuffer (not blob!)
- `location` / `locationChanged` — Persist reading position
- `showToc={false}` — We use a custom drawer instead
- `getRendition` — Store ref for programmatic navigation

## Components

### `AppHeader`

Clean, minimal header with generous spacing and light-weight icons.

```
Library:  [📚] Library           [Upload book ➕]
Reader:   [<📚] [≡] Book Title...       [🔍] [🔖]
```

- The subtle back chevron appears to the *left* of the 📚 icon (absolute positioned)
- 40px touch targets for all icon buttons
- Consistent icon weight (1.5px stroke)

### `TocList`

Recursive component for nested chapter navigation. Indentation via `paddingLeft` based on depth.

### Navigation Drawer

Slides in from left with backdrop overlay. Contains tabbed navigation (Contents, Bookmarks, Notes).

```tsx
<aside className={`fixed left-0 h-full w-80 transform transition-transform ${
  isOpen ? "translate-x-0" : "-translate-x-full"
}`}>
  <DrawerTabs ... />
  {activeTab === "contents" && <TocList ... />}
  {/* other tabs */}
</aside>
```

## Services

### `db.ts`

IndexedDB operations via `idb` library:

```ts
const db = await openDB("reader-db", 1, {
  upgrade(db) {
    db.createObjectStore("books", { keyPath: "id" });
    db.createObjectStore("epubs", { keyPath: "id" });
  }
});
```

Key functions: `getAllBooks()`, `createBook()`, `getBook()`, `getEpub()`, `updateBookLocation()`, `deleteBook()`

### `epub.ts`

Extracts title, author, cover from epub using `epubjs`:

```ts
const book = ePub(arrayBuffer);
await book.ready;
const { title, creator } = await book.loaded.metadata;
const coverUrl = await book.coverUrl();
// fetch cover, convert to blob...
```

## Test Cases

- Uploading a book extracts and displays the title
- Books are sorted by most recently opened
- Opening a book displays its title in the header
- Table of contents button opens the navigation drawer
- Drawer displays chapter titles from the table of contents
- Clicking a chapter in TOC navigates to that chapter
- Next/previous navigation buttons work
- Reading position persists after page refresh
