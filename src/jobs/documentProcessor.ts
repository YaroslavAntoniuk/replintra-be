import { DocumentStatusRAG, PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import 'reflect-metadata';
import { Container } from 'typedi';
import { ChunkingAndEmbeddingService } from '../rag/chunkingAndEmbedding';
import { DocumentExtractionService } from '../rag/documentExtraction';

const prisma = new PrismaClient();

export const documentWorker = new Worker(
  'document-processing',
  async (job: Job) => {
    console.log('[Worker] Listening for connections....');
    const { documentId, b2FileId, fileName, fileType, chatbotId } = job.data;
    try {
      // 1. Extract and save raw content
      const extractionService = Container.get(DocumentExtractionService);
      await extractionService.extractAndSaveRawContent(
        documentId,
        b2FileId,
        fileName,
        fileType
      );

      // 2. Chunk and embed
      const chunkingService = Container.get(ChunkingAndEmbeddingService);
      await chunkingService.processAndEmbedChunks(
        documentId,
        chatbotId,
        fileName
      );

      // 3. Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatusRAG.EMBEDDED },
      });
    } catch (error) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatusRAG.FAILED },
      });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USERNAME,
    },
  }
);
