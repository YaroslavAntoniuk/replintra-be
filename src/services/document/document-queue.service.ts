import { Service } from 'typedi';
import { smartWorker } from '../../jobs/documentProcessor';

@Service()
export class DocumentQueueService {
  async queueDocumentProcessing(
    documentId: string,
    b2FileId: string,
    fileName: string,
    fileType: string,
    chatbotId: string
  ): Promise<void> {
    await smartWorker.queue.add('document-processing', {
      documentId,
      b2FileId,
      fileName,
      fileType,
      chatbotId,
    });
  }
}
