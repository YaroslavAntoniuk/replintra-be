/**
 * Fastify API routes for RAG pipeline: document processing and retrieval.
 * - POST /rag/process/:id: Enqueue document processing job
 * - POST /rag/retrieve: Retrieve relevant chunks for a query
 */
import { Queue } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { Container } from 'typedi';
import { requireRole } from '../auth/roles';
import { RetrievalService } from '../rag/retrievalService';

// Setup BullMQ queue (ensure connection options match your Redis setup)
const documentQueue = new Queue('document-processing', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

export async function ragRoutes(app: FastifyInstance) {
  // Trigger document processing pipeline (enqueue job)
  app.post(
    '/rag/process/:id',
    { preHandler: requireRole(['ADMIN', 'USER']) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { b2FileId, fileName, fileType, chatbotId } = request.body as any;
      try {
        await documentQueue.add('document-processing', {
          documentId: id,
          b2FileId,
          fileName,
          fileType,
          chatbotId,
        });
        reply.send({ status: 'queued', documentId: id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reply
          .code(500)
          .send({
            error: 'Failed to queue document processing',
            details: message,
          });
      }
    }
  );

  // Retrieve relevant chunks for a query
  app.post(
    '/rag/retrieve',
    { preHandler: requireRole(['ADMIN', 'USER']) },
    async (request, reply) => {
      const { query, chatbotId, limit } = request.body as {
        query: string;
        chatbotId: string;
        limit?: number;
      };
      const retrievalService = Container.get(RetrievalService);
      try {
        const results = await retrievalService.retrieveRelevantChunks(
          query,
          chatbotId,
          limit || 5
        );
        reply.send({ results });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reply
          .code(500)
          .send({
            error: 'Failed to retrieve relevant chunks',
            details: message,
          });
      }
    }
  );
}
