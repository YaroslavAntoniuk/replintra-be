import { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { ChatbotService } from '../services/chatbot/chatbot.service';
import { RequestLoggerService } from '../services/request-logger.service';
import { ChatbotQuery, ChatbotRequest } from '../types/chatbot.types';
import { ChatbotError } from '../utils/error-handler';

@Service()
export class ChatbotController {
  constructor(
    private chatbotService: ChatbotService,
    private requestLogger: RequestLoggerService
  ) {}

  async askChatbot(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const body = request.body as ChatbotRequest;
      const query = request.query as ChatbotQuery;

      const stream = query.stream === 'true';
      const model = query.model || 'gpt-3.5-turbo';

      this.requestLogger.logRequest(request, reply.log);

      if (stream) {
        await this.handleStreamingResponse(body, model, reply);
      } else {
        await this.handleRegularResponse(body, model, reply);
      }
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private async handleStreamingResponse(
    body: ChatbotRequest,
    model: string,
    reply: FastifyReply
  ): Promise<void> {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const completion = await this.chatbotService.processMessage(
      body,
      model,
      true
    );

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      reply.raw.write(`data: ${content}\n\n`);
    }

    reply.raw.end();
  }

  private async handleRegularResponse(
    body: ChatbotRequest,
    model: string,
    reply: FastifyReply
  ): Promise<void> {
    const response = await this.chatbotService.processMessage(
      body,
      model,
      false
    );
    reply.send(response);
  }

  private handleError(error: any, reply: FastifyReply): void {
    reply.log.error(error, 'Chatbot ask error');

    if (error instanceof ChatbotError) {
      reply.code(error.statusCode).send({ error: error.message });
    } else {
      reply.code(503).send({ error: 'Chatbot temporarily unavailable' });
    }
  }
}
