import IORedis from 'ioredis';

// Singleton Redis connection for the entire backend
const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
    // Disable automatic operations
  lazyConnect: true,           // Only connect when needed
  keepAlive: 0,               // Disable keepalive pings
  enableAutoPipelining: false, // Disable automatic batching
  
  // Minimal retry logic
  connectTimeout: 5000,
  commandTimeout: 10000,
  
  // Disable automatic reconnection for dev
  reconnectOnError: null,
  
  // Minimal connection settings
  family: 4,
  enableReadyCheck: false,
});

export default redis;
