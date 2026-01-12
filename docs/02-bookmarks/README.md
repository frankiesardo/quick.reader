# Bookmarks

Save and navigate to specific locations in books.

## Data Model

**`bookmarks`** table:
- `id`, `bookId`, `cfi` (position string), `excerpt` (~100 chars), `createdAt`

Add to database schema with index on `bookId` for efficient queries.

## UX Flow

1. Tap bookmark icon in header → toggles bookmark at current location
2. Icon state: outline (not bookmarked) / filled blue (bookmarked)
3. View bookmarks in drawer's "Bookmarks" tab
4. Tap bookmark → navigate to that position
5. Delete button always visible (no hover reveal)

## Key Implementation Details

### Detecting if current page is bookmarked

Compare current CFI to stored bookmarks using `EpubCFI` from epub.js:

```ts
import { EpubCFI } from "epubjs";

function isLocationBookmarked(currentCfi, bookmarks) {
  const current = new EpubCFI(currentCfi);
  return bookmarks.find(b => {
    const bookmark = new EpubCFI(b.cfi);
    return current.spinePos === bookmark.spinePos 
        && current.compare(currentCfi, b.cfi) === 0;
  });
}
```

### Extracting excerpt text

When creating a bookmark, grab surrounding text:

```ts
const range = await rendition.getRange(location);
const excerpt = range.startContainer.textContent?.slice(0, 100);
```

### Sorting bookmarks

Sort by position in book (most advanced first) using CFI comparison.

## Components

### `BookmarkIcon`

SVG icon with `filled` prop for outline/solid variants.

### `BookmarkList`

List items showing excerpt in quotes, relative timestamp ("2h ago"), and delete button.

### `DrawerTabs`

Tab bar with badge counts: `Contents | Bookmarks (3) | Notes (5)`

Active tab has blue text + underline indicator.

## Services

Add to `db.ts`:
- `getBookmarksByBookId(bookId)`
- `createBookmark({ bookId, cfi, excerpt })`
- `deleteBookmark(id)`

Update `deleteBook()` to cascade delete bookmarks.

## Time Formatting

Simple relative time utility:

```ts
function formatTimeAgo(timestamp) {
  const seconds = (Date.now() - timestamp) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  // ... hours, days, then fall back to date
}
```

## Test Cases

- Bookmark button is visible in header
- Tapping bookmark icon saves the current page
- Tapping existing bookmark removes it
- Bookmarks tab shows saved bookmarks
- Clicking bookmark in drawer navigates to that location
- Deleting bookmark from drawer removes it
- Multiple bookmarks are displayed in the correct order
