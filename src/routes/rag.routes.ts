import { FastifyInstance } from 'fastify';
import { Container } from 'typedi';
import { RagController } from '../controllers/rag.controller';
import { createRoleMiddleware } from '../middleware/auth.middleware';

export async function ragRoutes(app: FastifyInstance) {
  const ragController = Container.get(RagController);
  const requireAdminOrUser = createRoleMiddleware(['ADMIN', 'USER']);

  // Trigger document processing pipeline (enqueue job)
  app.post(
    '/rag/process/:id',
    {
      preHandler: requireAdminOrUser,
    },
    ragController.processDocument.bind(ragController)
  );

  // Retrieve relevant chunks for a query
  app.post(
    '/rag/retrieve',
    {
      preHandler: requireAdminOrUser,
    },
    ragController.retrieveChunks.bind(ragController)
  );
}
