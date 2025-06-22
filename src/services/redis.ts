import Redis from 'ioredis';
import { Service } from 'typedi';

@Service()
export class RedisService {
  public client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL!);
  }
}
