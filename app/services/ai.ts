/**
 * AI service using Vercel AI SDK with OpenAI-compatible adapter
 * @see https://sdk.vercel.ai
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type CoreMessage } from "ai";

// AI configuration - can be customized via environment variables
const AI_BASE_URL = import.meta.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_API_KEY = import.meta.env.AI_API_KEY || "";
const AI_MODEL = import.meta.env.AI_MODEL || "gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Create an OpenAI-compatible client
 */
function createAIClient() {
  return createOpenAICompatible({
    baseURL: AI_BASE_URL,
    name: "openai-compatible",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
    },
  });
}

/**
 * Stream a chat response using the Vercel AI SDK
 */
export async function chatStream(
  messages: ChatMessage[],
  onChunk: (chunk: string, fullContent: string) => void,
  options?: ChatStreamOptions
): Promise<void> {
  const client = createAIClient();
  const modelId = options?.model || AI_MODEL;

  const coreMessages: CoreMessage[] = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const result = streamText({
    model: client.chatModel(modelId),
    messages: coreMessages,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
  });

  let fullContent = "";

  for await (const chunk of (await result).textStream) {
    fullContent += chunk;
    onChunk(chunk, fullContent);
  }
}

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
  return Boolean(AI_API_KEY);
}
