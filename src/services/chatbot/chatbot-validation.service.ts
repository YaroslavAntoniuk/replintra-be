import { Service } from 'typedi';
import { NotFoundError } from '../../utils/error-handler';
import { DatabaseService } from '../db.service';

@Service()
export class ChatbotValidationService {
  constructor(private databaseService: DatabaseService) {}

  async validateChatbot(chatbotId: string): Promise<void> {
    const chatbotSettings =
      await this.databaseService.client.chatbotSettings.findUnique({
        where: { chatbotId },
      });

    if (!chatbotSettings) {
      throw new NotFoundError('Chatbot not found');
    }
  }

  async shouldLogConversations(chatbotId: string): Promise<boolean> {
    const chatbotSettings =
      await this.databaseService.client.chatbotSettings.findUnique({
        where: { chatbotId },
      });

    return chatbotSettings?.logConversations ?? false;
  }
}
