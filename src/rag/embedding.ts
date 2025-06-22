import { OpenAIEmbeddings } from '@langchain/openai';
import { Container, Service } from 'typedi';
import { QdrantService } from '../services/qdrant';

/**
 * Service for generating and storing embeddings in Qdrant.
 */
@Service()
export class EmbeddingService {
  /**
   * Generates an embedding for the given text and stores it in Qdrant.
   * @param text The text to embed
   * @param metadata Metadata to store with the vector (e.g., chunkId, chatbotId, etc.)
   * @returns The Qdrant point ID or null on failure
   */
  async generateAndStoreEmbedding(
    text: string,
    metadata: Record<string, any>
  ): Promise<string | null> {
    try {
      // 1. Generate embedding (replace with your embedding provider, e.g., OpenAI, HuggingFace, etc.)
      const vector = await this.generateEmbeddingVector(text);
      // 2. Store in Qdrant
      const qdrant = Container.get(QdrantService).client;
      const collectionName = metadata.chatbotId || 'default';
      const pointId = metadata.chunkId || metadata.id || Date.now().toString();
      await qdrant.upsert(collectionName, {
        points: [
          {
            id: pointId,
            vector,
            payload: metadata,
          },
        ],
      });
      return pointId;
    } catch (error) {
      console.error('Failed to generate/store embedding:', error);
      return null;
    }
  }

  /**
   * Generates an embedding vector for the given text using OpenAI via LangChain.
   */
  async generateEmbeddingVector(text: string): Promise<number[]> {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // or your preferred model
    });
    const vector = await embeddings.embedQuery(text);
    return vector;
  }
}
