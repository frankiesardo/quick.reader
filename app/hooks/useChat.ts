import { useState, useCallback, useEffect, useRef, type RefObject } from "react";
import type { Rendition, NavItem, Location } from "epubjs";
import {
  getChatMessagesByBookId,
  createChatMessage,
  deleteChatMessagesByBookId,
  type ChatMessage,
} from "~/services/db";
import {
  getOrExtractFullText,
  getVisibleText,
  getCurrentChapterLabel,
} from "~/services/epub";
import { chatStream, isAIConfigured, type ChatMessage as AIChatMessage } from "~/services/ai";

interface UseChatOptions {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  renditionRef: RefObject<Rendition | null>;
  toc: NavItem[];
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isExtracting: boolean;
  streamingContent: string;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;
  initializeChat: () => Promise<void>;
  isInitialized: boolean;
  isConfigured: boolean;
}

export function useChat({
  bookId,
  bookTitle,
  bookAuthor,
  renditionRef,
  toc,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const fullTextRef = useRef<string | null>(null);

  // Check if AI is configured
  const isConfigured = isAIConfigured();

  // Load existing messages from IndexedDB
  useEffect(() => {
    getChatMessagesByBookId(bookId).then(setMessages).catch(console.error);
  }, [bookId]);

  // Initialize chat - extract book text on first open
  const initializeChat = useCallback(async () => {
    if (isInitialized || !renditionRef.current) return;

    setIsExtracting(true);
    try {
      fullTextRef.current = await getOrExtractFullText(
        bookId,
        renditionRef.current
      );
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to extract book text:", error);
    } finally {
      setIsExtracting(false);
    }
  }, [bookId, renditionRef, isInitialized]);

  // Build system prompt with book content
  const buildSystemPrompt = useCallback((): string => {
    const bookText = fullTextRef.current || "";
    return `You are a reading assistant for "${bookTitle}" by ${bookAuthor}.

Help the reader understand the book. Answer questions about plot, characters, themes, or specific passages. Be concise but thorough. When referencing the text, quote relevant passages to support your answers.

<book>
${bookText}
</book>
`;
  }, [bookTitle, bookAuthor]);

  // Enhance user message with current reading context
  const enhanceUserMessage = useCallback(
    async (userMessage: string): Promise<string> => {
      if (!renditionRef.current) return userMessage;

      const chapterLabel = getCurrentChapterLabel(renditionRef.current, toc);
      const visibleText = await getVisibleText(renditionRef.current);

      return `<reading_context>
Location: ${chapterLabel}
Currently viewing: "${visibleText}"
</reading_context>

<user_question> 
${userMessage}
</user_question>`;
    },
    [renditionRef, toc]
  );

  // Get current location info for storing with message
  const getCurrentLocationInfo = useCallback(async (): Promise<{
    locationCfi?: string;
    locationLabel?: string;
    locationExcerpt?: string;
  }> => {
    if (!renditionRef.current) return {};

    try {
      const location = renditionRef.current.currentLocation() as unknown as Location | undefined;
      const locationCfi = location?.start?.cfi;
      const locationLabel = getCurrentChapterLabel(renditionRef.current, toc);
      const visibleText = await getVisibleText(renditionRef.current);
      // Truncate to ~100 chars for display
      const locationExcerpt = visibleText.length > 100 
        ? visibleText.slice(0, 100).trim() + "…" 
        : visibleText;

      return { locationCfi, locationLabel, locationExcerpt };
    } catch {
      return {};
    }
  }, [renditionRef, toc]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !isInitialized || !isConfigured) return;

      const locationInfo = await getCurrentLocationInfo();

      // Create and save user message
      const userMessage = await createChatMessage({
        bookId,
        role: "user",
        content: content.trim(),
        ...locationInfo,
      });
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setStreamingContent("");

      try {
        // Build messages for API
        const systemPrompt = buildSystemPrompt();
        const apiMessages: AIChatMessage[] = [
          { role: "system", content: systemPrompt },
        ];

        // Add conversation history (without location metadata, just content)
        for (const msg of messages) {
          apiMessages.push({ role: msg.role, content: msg.content });
        }

        // Add current message with enhanced context
        const enhancedContent = await enhanceUserMessage(content.trim());
        apiMessages.push({ role: "user", content: enhancedContent });

        // Stream response using Vercel AI SDK
        let fullResponse = "";
        await chatStream(
          apiMessages,
          (_chunk, full) => {
            fullResponse = full;
            setStreamingContent(full);
          }
        );

        // Save assistant message
        const assistantMessage = await createChatMessage({
          bookId,
          role: "assistant",
          content: fullResponse,
        });
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } catch (error) {
        console.error("Failed to send message:", error);
        // Could add error message to chat here
      } finally {
        setIsLoading(false);
      }
    },
    [
      bookId,
      isLoading,
      isInitialized,
      isConfigured,
      messages,
      buildSystemPrompt,
      enhanceUserMessage,
      getCurrentLocationInfo,
    ]
  );

  // Clear all messages
  const clearChat = useCallback(async () => {
    try {
      await deleteChatMessagesByBookId(bookId);
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  }, [bookId]);

  return {
    messages,
    isLoading,
    isExtracting,
    streamingContent,
    sendMessage,
    clearChat,
    initializeChat,
    isInitialized,
    isConfigured,
  };
}
