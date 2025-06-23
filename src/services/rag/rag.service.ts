import { Service } from 'typedi';
import { RagProcessRequest, RagRetrieveRequest } from '../../types/rag.types';
import { RagProcessingService } from './rag-processing.service';
import { RagRetrievalService } from './rag-retrieval.service';

@Service()
export class RagService {
  constructor(
    private ragProcessingService: RagProcessingService,
    private ragRetrievalService: RagRetrievalService
  ) {}

  async processDocument(
    documentId: string,
    request: RagProcessRequest
  ): Promise<string> {
    const { b2FileId, fileName, fileType, chatbotId } = request;

    return this.ragProcessingService.processDocument(
      documentId,
      b2FileId,
      fileName,
      fileType,
      chatbotId
    );
  }

  async retrieveChunks(request: RagRetrieveRequest): Promise<any[]> {
    const { query, chatbotId, limit = 5 } = request;

    return this.ragRetrievalService.retrieveRelevantChunks(
      query,
      chatbotId,
      limit
    );
  }
}
