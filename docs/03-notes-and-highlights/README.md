# Notes & Highlights

Text highlighting with color choices and optional attached notes.

## Data Model

**`highlights`** table:
- `id`, `bookId`, `cfiRange` (selection range), `text` (max 500 chars)
- `color`: `"yellow"` | `"green"` | `"blue"` | `"pink"` | `"purple"`
- `note` (optional), `createdAt`, `updatedAt`

## Highlight Colors

| Name | Hex |
|------|-----|
| Yellow | `#fef08a` |
| Green | `#86efac` |
| Blue | `#7dd3fc` |
| Pink | `#f9a8d4` |
| Purple | `#d8b4fe` |

Store as CSS variables for use in notes list border colors.

## UX Flow

### Creating (Two-Stage)

**Stage 1: Color Selection**
1. Select text in epub
2. Color picker appears (bottom bar on mobile, floating on desktop)
3. Native selection remains visible — user can still copy text
4. Tap a color to create highlight and proceed to stage 2
5. Tap outside to cancel (no highlight created)

**Stage 2: Note Editing**
1. Highlight is now saved to database
2. Full popup appears with color palette + note textarea
3. Color changes save instantly
4. Note changes require "Save" button
5. "Delete" removes the highlight
6. Tap outside or "Cancel" closes popup (highlight persists)

### Editing

1. Tap existing highlight in book
2. Opens directly to stage 2 (editing popup)
3. Same behavior: color saves instantly, note requires "Save"

## Key Implementation Details

### Selection handling

Listen for epub.js `selected` event. Note the two-stage approach:

```tsx
// Stage 1: Show color picker (don't clear selection yet)
rendition.on("selected", (cfiRange, contents) => {
  const text = rendition.getRange(cfiRange).toString();
  // Keep native selection visible for copy functionality
  
  // Show color picker popup (stage 1)
  setHighlightPopup({ 
    position, 
    cfiRange, 
    text,
    stage: "color-picker",
    isNew: true 
  });
});

// Stage 2: On color select, create highlight and show editor
const handleColorSelect = async (color) => {
  // Now clear native selection
  iframe.contentWindow.getSelection()?.removeAllRanges();
  
  // Create highlight in DB
  const highlight = await createHighlight({ bookId, cfiRange, text, color });
  
  // Add visual annotation
  rendition.annotations.add("highlight", cfiRange, {}, onClick, "", { fill, "fill-opacity": "0.4" });
  
  // Transition to editing stage
  setHighlightPopup({ ...popup, stage: "editing", highlightId: highlight.id });
};
```

### Restoring highlights on chapter change

Re-apply annotations when navigating:

```tsx
rendition.on("rendered", () => {
  highlights.forEach(h => {
    rendition.annotations.add("highlight", h.cfiRange, ...);
  });
});
```

### Visual indicator for notes

Highlights with notes get a subtle stroke:

```css
.hl-has-note {
  stroke: currentColor;
  stroke-width: 1.5px;
  stroke-opacity: 0.6;
}
```

## Components

### `HighlightPopup`

Two-stage popup that adapts to device type:

**Stage 1: Color Picker**
- Shows immediately after text selection
- Desktop: Floating popup near selection
- Mobile: Fixed top action bar (avoids conflict with Android's native selection popup AND bottom search bar)

**Stage 2: Editing**
- Shown after color is selected, or when tapping existing highlight
- Desktop: Floating popup with color palette, note input, save/cancel/delete
- Mobile: Centered modal with backdrop for better touch interaction

Position adjusts to stay in viewport on desktop.

### `ColorDot`

Circular button with `selected` ring state. Three sizes:
- `sm` — 12px, for list indicators
- `md` — 32px, default for desktop palette
- `lg` — 40px, for mobile touch targets

### `NotesList`

List in drawer's Notes tab showing:
- Color dot + quoted excerpt
- Note text with colored left border
- Timestamp + delete button

## Services

Add to `db.ts`:
- `getHighlightsByBookId(bookId)`
- `createHighlight({ bookId, cfiRange, text, color, note })`
- `updateHighlight(id, { color?, note? })`
- `deleteHighlight(id)`

Add `highlight.ts` for color constants and `getColorValue()` helper.

Update `deleteBook()` to cascade delete highlights.

## Test Cases

- Notes tab is visible in the drawer
- Empty notes list shows message
- Selecting text creates a highlight with popup
- Highlight is saved and appears in notes list
- Can change highlight color and edit note
- Deleting highlight removes it from the list
