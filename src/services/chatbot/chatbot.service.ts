import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { ChatbotRequest, ChatbotResponse } from '../../types/chatbot.types';
import { ChatbotValidationService } from './chatbot-validation.service';
import { ContextService } from './context.service';
import { ConversationLogger } from './conversation-logger.service';
import { OpenAIService } from './openai.service';
import { PromptService } from './prompt.service';

@Service()
export class ChatbotService {
  constructor(
    private openaiService: OpenAIService,
    private conversationLogger: ConversationLogger,
    private chatbotValidationService: ChatbotValidationService,
    private contextService: ContextService,
    private promptService: PromptService
  ) {}

  async processMessage(
    request: ChatbotRequest,
    model: string = 'gpt-3.5-turbo',
    stream: boolean = false
  ): Promise<ChatbotResponse | any> {
    const { chatbotId, message, userId } = request;

    await this.chatbotValidationService.validateChatbot(chatbotId);
    const finalUserId = userId || uuidv4();

    const context = await this.contextService.getContext(message, chatbotId);
    const { prompt, language } = await this.promptService.buildPrompt(
      chatbotId,
      message,
      context,
      model
    );

    const response = stream
      ? await this.openaiService.getStreamingResponse(prompt, message, model)
      : await this.openaiService.getResponse(prompt, message, model);

    if (!stream) {
      await this.logConversationIfEnabled(
        chatbotId,
        finalUserId,
        message,
        response as string
      );
      return { response: response as string, language };
    }

    return response;
  }

  private async logConversationIfEnabled(
    chatbotId: string,
    userId: string,
    message: string,
    response: string
  ): Promise<void> {
    const shouldLog =
      await this.chatbotValidationService.shouldLogConversations(chatbotId);

    if (shouldLog) {
      await this.conversationLogger.logConversation(
        chatbotId,
        userId,
        message,
        response
      );
    }
  }
}
