import { Container, Service } from 'typedi';
import { RetrievalService } from '../../rag/retrievalService';

@Service()
export class ContextService {
  private retrievalService: RetrievalService;

  constructor() {
    this.retrievalService = Container.get(RetrievalService);
  }

  async getContext(message: string, chatbotId: string): Promise<string[]> {
    const chunks = await this.retrievalService.retrieveRelevantChunks(
      message,
      chatbotId
    );
    return chunks.map((c: any) => c.content);
  }
}
