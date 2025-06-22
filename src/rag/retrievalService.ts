import { Container, Service } from 'typedi';
import { QdrantService } from '../services/qdrant';
import { EmbeddingService } from './embedding';

@Service()
export class RetrievalService {
  /**
   * Retrieve relevant chunks for a query using Qdrant vector search.
   * @param query The user query string
   * @param chatbotId The Qdrant collection name
   * @param limit Number of results to return (default 5)
   */
  async retrieveRelevantChunks(
    query: string,
    chatbotId: string,
    limit: number = 5
  ): Promise<any[]> {
    const embeddingService = Container.get(EmbeddingService);
    const qdrantService = Container.get(QdrantService);
    // 1. Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbeddingVector(
      query
    );
    // 2. Search Qdrant for similar vectors
    const results = await qdrantService.client.search(chatbotId, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      with_vector: false,
      score_threshold: undefined, // Optionally set a threshold
    });
    // 3. Return all useful fields
    return results.map((res: any) => ({
      chunkId: res.payload?.chunkId,
      documentId: res.payload?.documentId,
      chatbotId: res.payload?.chatbotId,
      chunkIndex: res.payload?.chunkIndex,
      fileName: res.payload?.fileName,
      fileType: res.payload?.fileType,
      totalChunks: res.payload?.totalChunks,
      content: res.payload?.content, // If you store content in payload
      similarity: res.score,
      metadata: res.payload,
    }));
  }
}
