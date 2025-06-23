import { Service } from 'typedi';
import { DocumentIngestRequest } from '../../types/document.types';
import { NotFoundError } from '../../utils/error-handler';
import { DatabaseService } from '../db.service';
import { DocumentQueueService } from './document-queue.service';

@Service()
export class DocumentService {
  constructor(
    private databaseService: DatabaseService,
    private documentQueueService: DocumentQueueService
  ) {}

  async ingestDocument(request: DocumentIngestRequest): Promise<string> {
    const { documentId, b2FileId, fileName, fileType, chatbotId } = request;

    await this.documentQueueService.queueDocumentProcessing(
      documentId,
      b2FileId,
      fileName,
      fileType,
      chatbotId
    );

    return documentId;
  }

  async getDocumentStatus(documentId: string) {
    const document = await this.databaseService.client.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return {
      status: document.status,
      updatedAt: document.updatedAt,
    };
  }
}
