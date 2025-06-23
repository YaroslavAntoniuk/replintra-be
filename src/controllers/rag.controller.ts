import { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { RagService } from '../services/rag/rag.service';
import { RagProcessRequest, RagRetrieveRequest } from '../types/rag.types';

@Service()
export class RagController {
  constructor(private ragService: RagService) {}

  async processDocument(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as RagProcessRequest;

      const documentId = await this.ragService.processDocument(id, body);

      reply.send({
        status: 'queued',
        documentId,
      });
    } catch (error) {
      this.handleError(error, reply, 'Failed to queue document processing');
    }
  }

  async retrieveChunks(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const body = request.body as RagRetrieveRequest;

      const results = await this.ragService.retrieveChunks(body);

      reply.send({ results });
    } catch (error) {
      this.handleError(error, reply, 'Failed to retrieve relevant chunks');
    }
  }

  private handleError(error: any, reply: FastifyReply, message: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    reply.code(500).send({
      error: message,
      details: errorMessage,
    });
  }
}
