import IORedis from 'ioredis';

// Singleton Redis connection for the entire backend
const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 5,      // Allow some retries for reliability
  lazyConnect: false,           // Connect immediately
  keepAlive: 30000,             // 30s TCP keepalive (important for cloud)
  enableAutoPipelining: true,   // Allow pipelining for efficiency
  connectTimeout: 15000,        // 15s connect timeout
  commandTimeout: 15000,        // 15s command timeout
  family: 4,
  enableReadyCheck: true,       // Ensure connection is ready
});

export default redis;
