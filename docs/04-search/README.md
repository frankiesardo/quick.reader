# Search

Full-text search within books with a modal interface.

## UX Flow

1. Tap search icon in reader header
2. Modal appears, input auto-focused
3. Type query → results appear (debounced 300ms)
4. Results show chapter title + excerpt with highlighted matches
5. Tap result → modal closes, reader navigates, text flashes briefly

## Key Implementation Details

### Searching the book

Iterate through spine items (chapters) using epub.js:

```ts
async function searchBook(rendition, query) {
  const results = [];
  
  book.spine.each(item => spineItems.push(item));
  
  for (const item of spineItems) {
    await item.load(book.load.bind(book));
    const matches = await item.find(query);  // epub.js built-in
    
    // Get chapter title from TOC
    const chapter = toc.find(t => item.href.includes(t.href));
    
    matches.forEach(m => results.push({
      cfi: m.cfi,
      excerpt: m.excerpt,
      chapterTitle: chapter?.label || item.href
    }));
    
    item.unload();
  }
  
  return results;
}
```

### Highlighting matches in results

Split text on search term, wrap matches in `<mark>`:

```tsx
function HighlightedText({ text, term }) {
  const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}
```

### Flash highlight after navigation

Temporarily highlight the found text:

```tsx
// After navigation completes
rendition.annotations.add("highlight", cfi, {}, null, "search-flash-highlight", { fill: "#fef08a" });

// Remove after 2 seconds
setTimeout(() => rendition.annotations.remove(cfi, "highlight"), 2000);
```

With CSS animation for fade-out:

```css
.search-flash-highlight {
  animation: flash-fade 2s ease-out forwards;
}
@keyframes flash-fade {
  0%, 60% { fill-opacity: 0.7; }
  100% { fill-opacity: 0; }
}
```

## Components

### `SearchModal`

Full-screen overlay with:
- Search input + close button
- Result count header
- Scrollable result list
- Loading/empty/no-results states

### `SearchResultItem`

Row with search icon, chapter title (blue), and excerpt with highlighted matches.

## Services

Add `search.ts` with:
- `searchBook(rendition, query)` → `SearchResult[]`
- `escapeRegex(string)` for safe highlighting

## Edge Cases

- Large books: Search can be slow, show loading spinner
- No TOC: Fall back to spine item href as chapter title
- Rapid typing: Debounce prevents excessive searches

## Test Cases

- Search button is visible in header
- Tapping search button opens the modal
- Search input is auto-focused when modal opens
- Pressing Escape closes the modal
- Typing a query updates the search input
- Clearing input resets the search
- Search shows results for valid query
- Clicking search result navigates to that location
- Search results show chapter context
- Shows no results message for unknown term
