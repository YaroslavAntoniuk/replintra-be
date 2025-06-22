import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { getTenantContext } from '../auth/multiTenant';
import { requireRole } from '../auth/roles';

// Setup BullMQ queue (ensure connection options match your Redis setup)
const documentQueue = new Queue('document-processing', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

const prisma = new PrismaClient();

export async function documentRoutes(app: FastifyInstance) {
  // Ingest document metadata (protected, multi-tenant)
  app.post(
    '/documents',
    { preHandler: requireRole('user') },
    async (request, reply) => {
      const tenant = getTenantContext(request);
      const { documentId, b2FileId, fileName, fileType, chatbotId } =
        request.body as any;
      try {
        await documentQueue.add('document-processing', {
          documentId,
          b2FileId,
          fileName,
          fileType,
          chatbotId,
        });
        reply.send({ status: 'queued', documentId, tenant });
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

  // Get document status (protected, multi-tenant)
  app.get(
    '/documents/:id/status',
    { preHandler: requireRole('user') },
    async (request, reply) => {
      const tenant = getTenantContext(request);
      const { id } = request.params as { id: string };
      try {
        const document = await prisma.document.findUnique({ where: { id } });
        if (!document) {
          reply.code(404).send({ error: 'Document not found', tenant });
          return;
        }
        reply.send({
          status: document.status,
          updatedAt: document.updatedAt,
          tenant,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reply
          .code(500)
          .send({
            error: 'Failed to fetch document status',
            details: message,
            tenant,
          });
      }
    }
  );
}
