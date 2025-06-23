import { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { DocumentService } from '../services/document/document.service';
import { DocumentIngestRequest } from '../types/document.types';

@Service()
export class DocumentController {
  constructor(
    private documentService: DocumentService,
    private authMiddleware: AuthMiddleware
  ) {}

  async ingestDocument(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const tenantContext = this.authMiddleware.getTenantContext(request);
      const body = request.body as DocumentIngestRequest;

      const documentId = await this.documentService.ingestDocument(body);

      reply.send({
        status: 'queued',
        documentId,
        tenant: tenantContext,
      });
    } catch (error) {
      this.handleError(error, reply, 'Failed to queue document processing');
    }
  }

  async getDocumentStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const tenantContext = this.authMiddleware.getTenantContext(request);
      const { id } = request.params as { id: string };

      const documentStatus = await this.documentService.getDocumentStatus(id);

      reply.send({
        ...documentStatus,
        tenant: tenantContext,
      });
    } catch (error) {
      const tenantContext = this.authMiddleware.getTenantContext(request);
      this.handleError(
        error,
        reply,
        'Failed to fetch document status',
        tenantContext
      );
    }
  }

  private handleError(
    error: any,
    reply: FastifyReply,
    message: string,
    tenant?: any
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (error.name === 'NotFoundError') {
      reply.code(404).send({
        error: error.message,
        tenant,
      });
    } else {
      reply.code(500).send({
        error: message,
        details: errorMessage,
        tenant,
      });
    }
  }
}
