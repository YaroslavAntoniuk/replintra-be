import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken';

const prisma = new PrismaClient();

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question using only the information from the provided document context. If the answer is not in the context, say you don't know.";

@Service()
export class PromptBuilderService {
  /**
   * Build a prompt for the LLM using system prompt, retrieved chunks, and user message.
   * @param chatbotId Chatbot id (for fetching system prompt)
   * @param userMessage User's question/message
   * @param chunks Array of string chunks (retrieved context)
   * @param model OpenAI model name (for token counting)
   * @param maxTokens Max token limit for the prompt
   */
  async buildPrompt({
    chatbotId,
    userMessage,
    chunks,
    model = 'gpt-3.5-turbo',
    maxTokens = 4096,
  }: {
    chatbotId: string;
    userMessage: string;
    chunks: string[];
    model?: string;
    maxTokens?: number;
  }): Promise<{ prompt: string; language: string }> {
    // 1. Fetch system prompt from DB (ChatbotSettings)
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: { settings: true },
    });
    let systemPrompt = chatbot?.settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // 2. Detect language from user message (fallback to English)
    let language = chatbot?.settings?.responseLanguage || 'en';
    const safeString = (val: any) => (typeof val === 'string' ? val : String(val ?? ''));

    // 3. Prepare prompt template
    // Always keep systemPrompt and userMessage, trim context if needed
    const enc = encoding_for_model(model as TiktokenModel);
    let context = '';
    let contextChunks: string[] = [];
    let basePrompt = `${systemPrompt}\n\nContext:\n{context}\n\nUser:\n{question}`;
    // Calculate tokens for systemPrompt and userMessage
    const sysTokens = enc.encode(safeString(systemPrompt)).length;
    const userTokens = enc.encode(safeString(userMessage)).length;
    let available = maxTokens - sysTokens - userTokens - 20; // buffer for formatting
    // Add as many chunks as fit
    for (const chunk of chunks) {
      const chunkTokens = enc.encode(safeString(chunk)).length;
      if (available - chunkTokens < 0) break;
      contextChunks.push(chunk);
      available -= chunkTokens;
    }
    context = contextChunks.join(' ');
    // Final prompt
    const prompt = basePrompt
      .replace('{context}', context)
      .replace('{question}', safeString(userMessage));
    enc.free();
    return { prompt, language };
  }
}
