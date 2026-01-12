# Settings

Customize your reading experience with adjustable display settings that persist across sessions.

## Data Model

**`settings`** store (singleton key: `"global"`):
- `id` — Always `"global"` (single settings record)
- `theme` — `"light"` | `"dark"` | `"auto"`
- `fontSize` — `"xs"` | `"s"` | `"m"` | `"l"` | `"xl"`
- `spacing` — `"compact"` | `"normal"` | `"relaxed"`
- `lineHeight` — `"tight"` | `"normal"` | `"loose"`
- `updatedAt` — Timestamp of last change

## Default Values

```typescript
const defaultSettings: ReaderSettings = {
  id: "global",
  theme: "auto",
  fontSize: "m",
  spacing: "normal",
  lineHeight: "normal",
  updatedAt: Date.now(),
};
```

## Layout

### Settings Tab in Navigation Drawer

Settings appears as a fourth tab in the existing navigation drawer:

```
┌──────────────────────────────────┐
│ Navigation                   [x] │
├───────────────────────────────── ┤
│ Contents │ Bookmarks │ Notes │ ⚙ │
├───────────────────────────────── ┤
│                                  │
│  Settings Panel Content          │
│                                  │
└──────────────────────────────────┘
```

### Settings Panel

```
┌─────────────────────────────────┐
│  Display Settings               │
│                                 │
│  Theme                          │
│  ┌─────┬──────┬──────┐          │
│  │Light│ Dark │ Auto │          │
│  └─────┴──────┴──────┘          │
│                                 │
│  Font Size                      │
│  ┌───┬───┬───┬───┬────┐         │
│  │XS │ S │ M │ L │ XL │         │
│  └───┴───┴───┴───┴────┘         │
│                                 │
│  Spacing                        │
│  ┌────────┬────────┬─────────┐  │
│  │Compact │ Normal │ Relaxed │  │
│  └────────┴────────┴─────────┘  │
│                                 │
│  Line Height                    │
│  ┌───────┬────────┬───────┐     │
│  │ Tight │ Normal │ Loose │     │
│  └───────┴────────┴───────┘     │
│                                 │
└─────────────────────────────────┘
```

## Setting Values

### Theme

- **Light**: White background, dark text
- **Dark**: Dark background, light text  
- **Auto**: Follows system preference via `prefers-color-scheme`

Applied via CSS variables and class on document root.

### Font Size

| Value | Size | Use Case |
|-------|------|----------|
| `xs`  | 14px | Dense reading, reference |
| `s`   | 16px | Compact |
| `m`   | 18px | Default, comfortable |
| `l`   | 20px | Relaxed |
| `xl`  | 24px | Large print |

### Spacing (Paragraph Spacing)

| Value | Multiplier | Description |
|-------|------------|-------------|
| `compact` | 0.5em | Minimal gaps |
| `normal` | 1em | Default paragraph spacing |
| `relaxed` | 1.5em | Generous spacing |

### Line Height

| Value | Height | Description |
|-------|--------|-------------|
| `tight` | 1.4 | Compact lines |
| `normal` | 1.6 | Comfortable default |
| `loose` | 2.0 | Maximum readability |

## UX Flow

### Changing Settings

1. Open navigation drawer (menu icon)
2. Tap Settings tab (gear icon)
3. Tap any option to apply immediately
4. Changes saved to IndexedDB via clientAction
5. Reader view updates in real-time (optimistic update)

### Persistence

Settings use React Router's data patterns for consistent architecture:

- **Reading**: Settings loaded in `clientLoader` alongside book data
- **Writing**: Updates submitted via `clientAction` with `useFetcher`
- **Optimistic UI**: Local state updates immediately, persists in background
- Settings persist across browser sessions via IndexedDB
- Single global settings record (not per-book)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Route: books.$bookId                     │
├─────────────────────────────────────────────────────────────┤
│  clientLoader                                               │
│    ├── getBook()                                            │
│    ├── getEpub()                                            │
│    ├── getBookmarks()                                       │
│    ├── getHighlights()                                      │
│    └── getSettings()  ────────► loaderData.settings         │
├─────────────────────────────────────────────────────────────┤
│  clientAction                                               │
│    └── intent: "updateSettings"  ────► updateSettings(data) │
├─────────────────────────────────────────────────────────────┤
│  Component                                                  │
│    └── useSettings({ initialSettings, renditionRef })       │
│          ├── Optimistic state update                        │
│          ├── fetcher.submit() to clientAction               │
│          └── Apply styles to rendition                      │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Applying to Reader

Settings are applied to the epub.js rendition:

```typescript
rendition.themes.fontSize(`${fontSizeMap[fontSize]}px`);

rendition.themes.override("color", textColor);
rendition.themes.override("background", bgColor);
rendition.themes.override("line-height", lineHeightMap[lineHeight]);
```

### Theme Application

```typescript
// Apply theme to document
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = theme === "dark" || (theme === "auto" && prefersDark);

if (isDark) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}
```

## Components

### `SettingsPanel`

Displays all settings controls with segmented button groups.

### `useSettings` hook

```typescript
const {
  settings,           // Current settings object
  updateSettings,     // Partial update function (uses fetcher)
  applyReaderStyles,  // For manual re-application on rendition events
} = useSettings({ initialSettings, renditionRef });
```

**Required options:**
- `initialSettings` — Settings loaded from `clientLoader`
- `renditionRef` — Reference to epub.js rendition for applying styles

## Services

### `db.ts` additions

```typescript
export interface ReaderSettings {
  id: string;  // Always "global"
  theme: "light" | "dark" | "auto";
  fontSize: "xs" | "s" | "m" | "l" | "xl";
  spacing: "compact" | "normal" | "relaxed";
  lineHeight: "tight" | "normal" | "loose";
  updatedAt: number;
}

// Functions
getSettings(): Promise<ReaderSettings>
updateSettings(data: Partial<ReaderSettings>): Promise<ReaderSettings>
```

## Test Cases

- Settings tab visible in navigation drawer
- Default settings applied on first load
- Changing theme updates reader appearance
- Changing font size updates reader text
- Changing spacing updates paragraph gaps
- Changing line height updates text density
- Settings persist after closing/reopening app
- Settings persist after browser refresh
- Auto theme follows system preference
- All controls have visual feedback for selected state
