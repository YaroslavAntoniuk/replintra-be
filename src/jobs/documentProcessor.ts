import { DocumentStatusRAG, PrismaClient } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import 'reflect-metadata';
import { Container } from 'typedi';
import { ChunkingAndEmbeddingService } from '../rag/chunkingAndEmbedding';
import { DocumentExtractionService } from '../rag/documentExtraction';
import redis from '../redis';

const prisma = new PrismaClient();

class SmartDocumentWorker {
  private worker: Worker;
  private queue: Queue;
  private idleTimeout: NodeJS.Timeout | null = null;
  private isIdle = false;
  private readonly IDLE_DELAY = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.queue = new Queue('document-processing', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    });

    this.worker = new Worker(
      'document-processing',
      this.processJob.bind(this),
      {
        connection: redis,
        stalledInterval: 300000, // 5 minutes
        lockDuration: 600000, // 10 minutes
        maxStalledCount: 2,
        runRetryDelay: 120000, // 2 minutes
        drainDelay: 2000, // 2 seconds
        concurrency: 2,
      }
    );

    this.setupEventHandlers();
    this.startIdleMonitoring();
  }

  private async processJob(job: Job) {
    console.log(`[Worker] Processing job ${job.id}: ${job.data.fileName}`);
    this.resetIdleTimer();
    const { documentId, b2FileId, fileName, fileType, chatbotId } = job.data;
    try {
      await job.updateProgress(10);
      const extractionService = Container.get(DocumentExtractionService);
      await extractionService.extractAndSaveRawContent(
        documentId,
        b2FileId,
        fileName,
        fileType
      );
      await job.updateProgress(50);
      const chunkingService = Container.get(ChunkingAndEmbeddingService);
      await chunkingService.processAndEmbedChunks(
        documentId,
        chatbotId,
        fileName
      );
      await job.updateProgress(90);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatusRAG.EMBEDDED },
      });
      await job.updateProgress(100);
      console.log(`[Worker] Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatusRAG.FAILED },
      });
      throw error;
    }
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed`);
      this.checkForIdleState();
    });
    this.worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err.message);
      this.checkForIdleState();
    });
    this.worker.on('error', (err) => {
      console.error('[Worker] Worker error:', err);
    });
    this.worker.on('stalled', (jobId) => {
      console.warn(`[Worker] Job ${jobId} stalled`);
    });
    this.queue.on('waiting', () => {
      console.log('[Queue] New job added, resuming worker');
      this.resumeFromIdle();
    });
  }

  private startIdleMonitoring() {
    setInterval(() => {
      this.checkForIdleState();
    }, 120000); // Check every 2 minutes
  }

  private async checkForIdleState() {
    if (this.isIdle) return;
    const counts = await this.queue.getJobCounts();
    const hasJobs =
      counts.waiting > 0 || counts.active > 0 || counts.delayed > 0;
    if (!hasJobs) {
      this.scheduleIdleMode();
    } else {
      this.resetIdleTimer();
    }
  }

  private scheduleIdleMode() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    this.idleTimeout = setTimeout(async () => {
      console.log('[Worker] Entering idle mode - pausing worker');
      await this.worker.pause();
      this.isIdle = true;
    }, this.IDLE_DELAY);
  }

  private async resumeFromIdle() {
    if (!this.isIdle) return;
    console.log('[Worker] Resuming from idle mode');
    this.resetIdleTimer();
    await this.worker.resume();
    this.isIdle = false;
  }

  private resetIdleTimer() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  async close() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    await this.worker.close();
    await this.queue.close();
  }

  async wakeUp() {
    await this.resumeFromIdle();
  }
}

export const smartWorker = new SmartDocumentWorker();

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down gracefully...');
  await smartWorker.close();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down gracefully...');
  await smartWorker.close();
  await redis.disconnect();
  process.exit(0);
});
