import IORedis from 'ioredis';

// Singleton Redis connection
const redis = new IORedis(process.env.REDIS_URL!);

export default redis;