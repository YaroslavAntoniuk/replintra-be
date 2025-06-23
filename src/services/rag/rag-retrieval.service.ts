import { Container, Service } from 'typedi';
import { RetrievalService } from '../../rag/retrievalService';

@Service()
export class RagRetrievalService {
  private retrievalService: RetrievalService;

  constructor() {
    this.retrievalService = Container.get(RetrievalService);
  }

  async retrieveRelevantChunks(
    query: string,
    chatbotId: string,
    limit: number = 5
  ): Promise<any[]> {
    return this.retrievalService.retrieveRelevantChunks(
      query,
      chatbotId,
      limit
    );
  }
}
