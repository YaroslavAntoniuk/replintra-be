import { FastifyRequest } from "fastify";

// types/chatbot.types.ts
export interface ChatbotRequest {
  chatbotId: string;
  message: string;
  userId?: string;
}

export interface ChatbotResponse {
  response: string;
  language?: string;
}

export interface ChatbotQuery {
  stream?: string;
  model?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  chatbot: any;
}