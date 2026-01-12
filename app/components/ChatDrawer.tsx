import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import type { ChatMessage } from "~/services/db";
import { CloseIcon, TrashIcon, SendIcon, ChatIcon } from "./icons";

const SUGGESTIONS = [
  "What's happened so far?",
  "Explain the themes",
  "Who are the main characters?",
  "Help me understand this passage",
];

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isExtracting: boolean;
  streamingContent: string;
  onSendMessage: (content: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  isInitialized: boolean;
  isConfigured: boolean;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  isLoading,
  isExtracting,
  streamingContent,
  onSendMessage,
  onClearChat,
  isInitialized,
  isConfigured,
}: ChatDrawerProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Scroll instantly to bottom when drawer opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isOpen]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && isInitialized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await onSendMessage(message);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await onSendMessage(suggestion);
  };

  const hasMessages = messages.length > 0;

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
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-[480px] bg-white dark:bg-slate-900 shadow-xl z-40 transform transition-transform duration-150 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="AI Chat"
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Assistant</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearChat}
              disabled={!hasMessages || isLoading}
              className="h-8 px-2.5 flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {!isConfigured ? (
            <NotConfiguredState />
          ) : isExtracting ? (
            <ExtractingState />
          ) : !isInitialized ? (
            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
              Initializing...
            </div>
          ) : !hasMessages ? (
            <EmptyState
              onSuggestionClick={handleSuggestionClick}
              disabled={isLoading}
            />
          ) : (
            <MessageList
              messages={messages}
              streamingContent={streamingContent}
              isLoading={isLoading}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                !isConfigured ? "AI not configured" : isInitialized ? "Ask about the book..." : "Initializing..."
              }
              disabled={!isConfigured || !isInitialized || isLoading}
              className="flex-1 px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isInitialized || !isConfigured}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function NotConfiguredState() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-slate-700 dark:text-slate-200 font-medium mb-2">
        AI Not Configured
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
        To use the AI assistant, configure your API settings.
      </p>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-left w-full max-w-xs">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Set these environment variables:</p>
        <code className="text-xs text-slate-700 dark:text-slate-300 block">
          AI_API_KEY=your-key<br/>
          AI_BASE_URL=api-url<br/>
          AI_MODEL=model-name
        </code>
      </div>
    </div>
  );
}

function ExtractingState() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
      <p className="text-slate-600 dark:text-slate-300 text-sm">Preparing book for chat...</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
        This only happens once per book
      </p>
    </div>
  );
}

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
  disabled: boolean;
}

function EmptyState({ onSuggestionClick, disabled }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <ChatIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-slate-700 dark:text-slate-200 font-medium mb-1">
        Ask me anything about this book
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center">
        I can summarize, explain themes, discuss characters, or help you
        understand specific passages.
      </p>
      <div className="w-full space-y-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={disabled}
            className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
}

function MessageList({
  messages,
  streamingContent,
  isLoading,
}: MessageListProps) {
  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md">
            <div className="text-sm prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-semibold">
              <Markdown>{streamingContent}</Markdown>
            </div>
          </div>
        </div>
      )}
      {isLoading && !streamingContent && <TypingIndicator />}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {/* Location context for user messages */}
        {isUser && message.locationExcerpt && (
          <div className="mb-1 text-xs text-slate-400 dark:text-slate-500 px-1">
            <span 
              className="block text-slate-400 dark:text-slate-500 line-clamp-2 mt-0.5"
              title={message.locationExcerpt}
            >
              "{message.locationExcerpt}"
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-semibold">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-bl-md">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

