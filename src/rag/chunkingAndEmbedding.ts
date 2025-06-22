import { PrismaClient } from '@prisma/client';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Container, Service } from 'typedi';
import { QdrantService } from '../services/qdrant';
import { getValidQdrantId } from '../utils/uuid';
import { EmbeddingService } from './embedding';

const prisma = new PrismaClient();

@Service()
export class ChunkingAndEmbeddingService {
  /**
   * Loads raw content, chunks it, saves chunk metadata to Postgres, generates embeddings, and stores in Qdrant.
   */
  async processAndEmbedChunks(
    documentId: string,
    chatbotId: string,
    fileName: string
  ): Promise<void> {
    // 1. Load raw content from Postgres
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || !document.rawContent)
      throw new Error('Document not found or has no content');
    const text = document.rawContent;

    // 2. Chunk the content
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '.', '!', '?', ';', ',', ' ', ''],
    });
    const chunks = await splitter.splitText(text);
    console.log('[Chunking] Chunks created:', chunks.length);
    // 3. Save chunk metadata to Postgres
    const chunkRecords = await prisma.$transaction(
      chunks.map((content, index) =>
        prisma.documentChunk.create({
          data: {
            documentId,
            content: content.trim(),
            chunkIndex: index,
            metadata: {
              fileName,
              chatbotId,
              chunkIndex: index,
              fileType: document.fileType,
              totalChunks: chunks.length,
            },
            // Optionally estimate token count
            tokenCount: Math.ceil(content.length / 4),
          },
        })
      )
    );

    // 4. Generate embeddings and store in Qdrant
    const embeddingService = Container.get(EmbeddingService);
    const qdrantService = Container.get(QdrantService);

    // Ensure Qdrant collection exists (vector size 1536, cosine distance)
    try {
      await qdrantService.client.getCollection(chatbotId);
    } catch (err) {
      console.log(`[Qdrant] Collection '${chatbotId}' not found, creating...`);
      await qdrantService.client.createCollection(chatbotId, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Collection '${chatbotId}' created.`);
    }

    for (const chunk of chunkRecords) {
      console.log('[Embedding] Embedding generated for chunk', chunk.id);
      const vector = await embeddingService.generateEmbeddingVector(
        chunk.content
      );

      const pointId = getValidQdrantId(chunk.id);
      const upsertPayload = {
        points: [
          {
            id: pointId,
            vector,
            payload: {
              chunkId: chunk.id,
              documentId,
              chatbotId,
              chunkIndex: chunk.chunkIndex,
              fileName,
              fileType: document.fileType,
              totalChunks: chunks.length,
            },
          },
        ],
      };
      console.log(
        '[Qdrant] Upsert payload:',
        JSON.stringify(upsertPayload, null, 2)
      );
      try {
        await qdrantService.client.upsert(chatbotId, upsertPayload);
        console.log('[Qdrant] Upserted vector for chunk', chunk.id);
      } catch (err) {
        console.error('[Qdrant] Upsert error:', err);
        throw err;
      }
    }
  }
}
