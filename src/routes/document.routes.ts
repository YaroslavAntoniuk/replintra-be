import { FastifyInstance } from 'fastify';
import { Container } from 'typedi';
import { DocumentController } from '../controllers/document.controller';
import { createRoleMiddleware } from '../middleware/auth.middleware';

export async function documentRoutes(app: FastifyInstance) {
  const documentController = Container.get(DocumentController);
  const requireUserRole = createRoleMiddleware('user');

  // Ingest document metadata (protected, multi-tenant)
  app.post(
    '/',
    {
      preHandler: requireUserRole,
    },
    documentController.ingestDocument.bind(documentController)
  );

  // Get document status (protected, multi-tenant)
  app.get(
    '/:id/status',
    {
      preHandler: requireUserRole,
    },
    documentController.getDocumentStatus.bind(documentController)
  );
}
