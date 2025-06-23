import { FastifyRequest } from 'fastify';
import { Service } from 'typedi';

@Service()
export class RequestLoggerService {
  logRequest(request: FastifyRequest, logger: any): void {
    const origin =
      request.headers['origin'] || request.headers['referer'] || '';
    logger.info({ origin }, 'Chatbot ask origin');
  }
}
