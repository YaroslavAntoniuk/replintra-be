import { Service } from 'typedi';
import { DatabaseService } from '../db.service';
import { MessageRole } from '@prisma/client';

@Service()
export class ConversationLogger {
  constructor(private databaseService: DatabaseService) {}

  async logConversation(
    chatbotId: string,
    userId: string,
    message: string,
    response: string
  ): Promise<void> {
    const conversation = await this.findOrCreateConversation(
      chatbotId,
      userId,
      message
    );

    await Promise.all([
      this.createMessage(conversation.id, 'USER', message),
      this.createMessage(conversation.id, 'ASSISTANT', response),
    ]);
  }

  private async findOrCreateConversation(
    chatbotId: string,
    userId: string,
    message: string
  ) {
    const prisma = this.databaseService.client;

    let conversation = await prisma.conversation.findFirst({
      where: {
        chatbotId,
        userId,
        messages: { some: { content: message, role: 'USER' } },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          title: this.generateTitle(message),
          userId,
        },
      });
    }

    return conversation;
  }

  private async createMessage(
    conversationId: string,
    role: MessageRole,
    content: string
  ) {
    const prisma = this.databaseService.client;
    return prisma.message.create({
      data: { conversationId, role, content },
    });
  }

  private generateTitle(message: string): string {
    return message.slice(0, 50);
  }
}
