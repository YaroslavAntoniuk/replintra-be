import { Queue } from 'bullmq';
import { Service } from 'typedi';
import { RedisService } from './redis';

@Service()
export class BullMQService {
  public docQueue: Queue;

  constructor(redisService: RedisService) {
    this.docQueue = new Queue('documents', {
      connection: redisService.client,
      prefix: process.env.BULLMQ_PREFIX || 'rag',
    });
  }
}
