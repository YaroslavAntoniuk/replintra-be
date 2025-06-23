import { Service } from 'typedi';
import { smartWorker } from '../../jobs/documentProcessor';

@Service()
export class RagProcessingService {
  async processDocument(
    documentId: string,
    b2FileId: string,
    fileName: string,
    fileType: string,
    chatbotId: string
  ): Promise<string> {
    await smartWorker.queue.add('document-processing', {
      documentId,
      b2FileId,
      fileName,
      fileType,
      chatbotId,
    });

    return documentId;
  }
}
