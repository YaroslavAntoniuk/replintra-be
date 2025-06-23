import IORedis from 'ioredis';

// Singleton Redis connection for the entire backend
const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export default redis;
