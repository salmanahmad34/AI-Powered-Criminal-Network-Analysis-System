import { createClient } from 'redis';
import { config } from './env';
import logger from '../utils/logger';

let redisClient: any;
let isMock = false;

// Determine if we should mock Redis
const shouldMock = process.env.MOCK_DATABASE === 'true' || config.nodeEnv === 'development' || config.isDemo;

if (shouldMock) {
  isMock = true;
  logger.info('ℹ️ Redis: Running in MOCK mode');
  
  // Simple in-memory storage for Redis mock
  const memoryStore = new Map<string, string>();
  
  redisClient = {
    connect: async () => {
      logger.info('ℹ️ Redis mock client connected');
    },
    ping: async () => 'PONG',
    get: async (key: string) => {
      return memoryStore.get(key) || null;
    },
    set: async (key: string, value: string, options?: any) => {
      memoryStore.set(key, value);
      if (options?.EX) {
        setTimeout(() => memoryStore.delete(key), options.EX * 1000);
      }
      return 'OK';
    },
    del: async (key: string) => {
      return memoryStore.delete(key) ? 1 : 0;
    },
    quit: async () => {},
    on: (event: string, callback: Function) => {
      // Mock listener
    },
  };
} else {
  redisClient = createClient({
    url: config.redis.url,
  });
  
  redisClient.on('error', (err: any) => {
    logger.error('❌ Redis Client Connection Error', err);
  });
}

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('❌ Failed to connect to Redis, falling back to mock');
    isMock = true;
    // Re-assign mock client
    const memoryStore = new Map<string, string>();
    redisClient = {
      connect: async () => {},
      ping: async () => 'PONG',
      get: async (key: string) => memoryStore.get(key) || null,
      set: async (key: string, value: string) => { memoryStore.set(key, value); return 'OK'; },
      del: async (key: string) => memoryStore.delete(key) ? 1 : 0,
      quit: async () => {},
      on: () => {},
    };
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const res = await redisClient.ping();
    return res === 'PONG';
  } catch (err) {
    return false;
  }
}

export default redisClient;
