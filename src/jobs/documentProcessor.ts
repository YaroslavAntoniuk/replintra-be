import { DocumentStatusRAG, PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import 'reflect-metadata';
import { Container } from 'typedi';
import { ChunkingAndEmbeddingService } from '../rag/chunkingAndEmbedding';
import { DocumentExtractionService } from '../rag/documentExtraction';
import redis from '../redis';

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
    connection: redis,
    stalledInterval: 120000, // check for stalled jobs every 2min (default 30s)
    lockDuration: 180000,    // lock jobs for 3min (default 30s)
    maxStalledCount: 1,      // fail jobs quickly if stalled
    runRetryDelay: 120000,   // delay before retrying a failed job (default 5s)
    drainDelay: 1000,        // wait 1s before draining next job batch
    concurrency: 1,          // process one job at a time (dev safe)
    // You can further tune: skipStalledCheck: true, skipLockRenewal: true (not recommended for prod)
  },
);
