# AI Chat

Ask questions about the book you're reading with an AI assistant powered by Vercel AI SDK.

## Data Model

**`chatMessages`** table:
- `id`, `bookId`, `role` (`"user"` | `"assistant"`), `content`
- `locationCfi` (user messages only) — CFI of reading position when sent
- `locationLabel` (user messages only) — Chapter/section name
- `locationExcerpt` (user messages only) — Visible text snippet
- `createdAt`

**`books`** table addition (for cached text extraction):
- `fullText` — Complete book content (optional, populated on first chat)

## Layout

### Drawer Dimensions

- **Mobile**: 85% viewport width, slides from right
- **Desktop**: Capped at 480px max-width
- Full height with flex layout (header, messages, input)

### Drawer Header

Single header bar containing:
```
[AI Assistant]                    [Clear] [✕]
```
- Title left-aligned
- Clear button (trash icon) and close button right-aligned
- Clear button disabled when no messages

## UX Flow

### Empty State

When chat has no messages, show a welcoming empty state:

```
    ╭─────────────────────────────╮
    │         💬                  │
    │                             │
    │   Ask me anything about     │
    │   this book                 │
    │                             │
    │  ┌─────────────────────────┐│
    │  │ What's happened so far? ││
    │  └─────────────────────────┘│
    │  ┌─────────────────────────┐│
    │  │ Explain the themes      ││
    │  └─────────────────────────┘│
    │  ┌─────────────────────────┐│
    │  │ Who are the main        ││
    │  │ characters?             ││
    │  └─────────────────────────┘│
    │  ┌─────────────────────────┐│
    │  │ Help me understand      ││
    │  │ this passage            ││
    │  └─────────────────────────┘│
    │                             │
    ╰─────────────────────────────╯
```

- Stacked full-width buttons with subtle borders
- Tapping sends the prompt as a user message
- Buttons disappear once conversation starts

### Message Display

Each user message shows reading context:

```
                        ┌ "Call me Ishmael. Some years ago
                        │ never having any money in my..."
    ┌───────────────────┴─────────────────┐
    │ Why does the narrator introduce     │
    │ himself this way?                   │
    └─────────────────────────────────────┘
                                      You

┌─────────────────────────────────────────┐
│ The opening line "Call me Ishmael" is   │
│ one of the most famous in literature... │
└─────────────────────────────────────────┘
Assistant
```

- User messages: right-aligned, blue-600 background, white text
- Location context: small slate-400 text above user bubble showing visible text excerpt
- Full excerpt stored in DOM, visually truncated with CSS `line-clamp-2`
- Hover shows full text via `title` attribute
- Assistant messages: left-aligned, slate-100 background, slate-900 text

### Sending Messages

1. User types question in input field
2. On send: capture current CFI + chapter name + visible text excerpt
3. User message appears with location context
4. AI response streams in word-by-word
5. Both messages saved to IndexedDB

## AI Context

### System Prompt Structure

Use XML tags to clearly delineate book content:

```typescript
const systemPrompt = `You are a reading assistant for "${bookTitle}" by ${author}.

<book>
${fullBookText}
</book>

Help the reader understand the book. Answer questions about plot, characters, 
themes, or specific passages. Be concise but thorough.`;
```

### User Message Enhancement

Each user message is enhanced with current reading context before sending to AI:

```typescript
const enhancedMessage = `
<reading_context>
Location: ${chapterLabel}
Currently viewing: "${visibleTextExcerpt}"
</reading_context>

User question: ${userMessage}`;
```

This way the AI knows what the user is looking at without polluting the system prompt (which stays constant across the conversation).

### Model & Configuration

Configure via environment variables:
- `AI_API_KEY` — API key for your AI provider
- `AI_BASE_URL` — API endpoint (default: `https://api.vercel.ai/v1`)
- `AI_MODEL` — Model to use (default: `gpt-4o-mini`)

Uses [Vercel AI SDK](https://sdk.vercel.ai) with `@ai-sdk/openai-compatible` for streaming responses. Works with any OpenAI-compatible API.

## Book Text Extraction

### Timing

Extract full text **on first chat open** (lazy loading):
1. User opens chat drawer
2. Check if `book.fullText` exists
3. If not, extract and save to book record

### Extraction Process

```typescript
async function extractFullText(book: Book): Promise<string> {
  const sections: string[] = [];
  
  book.spine.each(async (item) => {
    await item.load(book.load.bind(book));
    const text = item.document.body.textContent?.trim();
    if (text) sections.push(text);
    item.unload();
  });
  
  return sections.join("\n\n---\n\n");
}
```

### Caching

Extracted text stored directly on the book record in IndexedDB:
- Cached per book (as `fullText` field)
- Deleted automatically when book is deleted

## Components

### `ChatDrawer`

```
┌─────────────────────────────────┐
│ AI Assistant      [🗑] [✕]      │  ← Header (fixed)
├─────────────────────────────────┤
│                                 │
│  (messages or empty state)      │  ← Scrollable area
│                                 │
├─────────────────────────────────┤
│ [Type a message...        ] [→] │  ← Input (fixed)
└─────────────────────────────────┘
```

### Message Components

- `ChatMessage` — Single message bubble with optional location context
- `ChatSuggestions` — Empty state with prompt buttons
- `StreamingIndicator` — Pulsing dots while AI responds

## Services

### `db.ts` additions

```typescript
// Added to Book interface
interface Book {
  // ...existing fields
  fullText?: string;
}

interface ChatMessage {
  id: string;
  bookId: string;
  role: "user" | "assistant";
  content: string;
  locationCfi?: string;      // User messages only
  locationLabel?: string;    // User messages only  
  locationExcerpt?: string;  // User messages only
  createdAt: number;
}
```

Functions:
- `getChatMessagesByBookId(bookId)`
- `createChatMessage(data)`
- `deleteChatMessagesByBookId(bookId)`
- `updateBookFullText(bookId, fullText)`

### `ai.ts`

AI service using [Vercel AI SDK](https://sdk.vercel.ai) with `@ai-sdk/openai-compatible`:

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const client = createOpenAICompatible({
  baseURL: AI_BASE_URL,
  name: "openai-compatible",
  headers: { Authorization: `Bearer ${AI_API_KEY}` },
});

// Stream chat response
const result = streamText({
  model: client.chatModel(AI_MODEL),
  messages: coreMessages,
});

for await (const chunk of (await result).textStream) {
  // Handle streaming chunks
}
```

### `epub.ts` (text extraction functions)

- `extractFullText(rendition)` — Get complete book content from all spine items
- `getOrExtractFullText(bookId, rendition)` — Get full text with caching
- `getVisibleText(rendition)` — Get text currently displayed (see below)
- `getCurrentChapterLabel(rendition, toc)` — Get chapter name from TOC

#### Visible Text Extraction

`getVisibleText` uses epub.js's `currentLocation()` and `book.getRange()` APIs:

```typescript
const location = rendition.currentLocation();
const startCfi = location.start.cfi;
const endCfi = location.end.cfi;

// Get DOM range from CFI and extract text
const range = await book.getRange(startCfi);
const endRange = await book.getRange(endCfi);
range.setEnd(endRange.endContainer, endRange.endOffset);
return range.toString();
```

**Important**: In spread view (side-by-side pages), `currentLocation()` returns CFIs spanning both pages. This means the extracted text may include content from adjacent chapters. The UI uses CSS `line-clamp` for visual truncation while storing full text for reliable test assertions.

## Styling

```css
@keyframes chat-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.chat-drawer {
  animation: chat-slide-in 150ms ease-out;
}
```

## Test Cases

- Chat icon visible in reader header
- Clicking chat icon opens right drawer (85% width on mobile)
- Empty chat shows welcoming message and suggestion buttons
- Tapping suggestion sends it as message with current location
- Can type and send custom messages
- User messages show visible text excerpt from current reading position
- AI responses stream in progressively
- Messages persist after closing drawer
- Clear button removes all messages and shows empty state
- Chat is isolated per book
- Book text extracted once and cached on book record
- Deleting book clears its chat history

