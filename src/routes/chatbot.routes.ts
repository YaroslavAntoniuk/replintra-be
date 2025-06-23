import { FastifyInstance } from 'fastify';
import { Container } from 'typedi';
import { ChatbotController } from '../controllers/chatbot.controller';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export async function chatbotRoutes(app: FastifyInstance) {
  const chatbotController = Container.get(ChatbotController);
  const authMiddleware = createAuthMiddleware();

  app.post(
    '/ask',
    {
      preHandler: authMiddleware,
    },
    chatbotController.askChatbot.bind(chatbotController)
  );
}
