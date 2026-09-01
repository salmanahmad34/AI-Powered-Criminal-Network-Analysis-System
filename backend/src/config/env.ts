import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Environment validation — fail fast if critical config is missing
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Resolve a secret from environment, local file, or generate ephemeral.
 * NEVER uses a hardcoded literal fallback.
 */
function resolveSecret(envKey: string, fileKey: string): string {
  // 1. Try environment variable
  if (process.env[envKey]) {
    return process.env[envKey]!;
  }

  // 2. Try local secret file
  const secretFile = path.join(process.cwd(), `${fileKey}.txt`);
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf-8').trim();
  }

  // 3. Generate ephemeral secret + log severe warning
  console.warn(
    `⚠️  WARNING: No ${envKey} found. Generating ephemeral secret. ` +
    `This instance is isolated — sessions will not survive restart. ` +
    `Set ${envKey} in environment for production.`
  );
  return crypto.randomBytes(64).toString('hex');
}

export const config = {
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  port: parseInt(getOptionalEnv('PORT', '4000'), 10),
  frontendUrl: getOptionalEnv('FRONTEND_URL', 'http://localhost:3000'),

  database: {
    url: getOptionalEnv('DATABASE_URL', 'postgresql://crimegraph_user:crimegraph_dev_2026@localhost:5432/crimegraph'),
  },

  neo4j: {
    uri: getOptionalEnv('NEO4J_URI', 'bolt://localhost:7687'),
    user: getOptionalEnv('NEO4J_USER', 'neo4j'),
    password: getOptionalEnv('NEO4J_PASSWORD', 'crimegraph_neo4j_2026'),
    databaseName: getOptionalEnv('NEO4J_DATABASE', 'neo4j'),
  },

  redis: {
    url: getOptionalEnv('REDIS_URL', 'redis://:crimegraph_redis_2026@localhost:6379'),
  },

  jwt: {
    accessSecret: resolveSecret('JWT_ACCESS_SECRET', 'jwt_access_secret'),
    refreshSecret: resolveSecret('JWT_REFRESH_SECRET', 'jwt_refresh_secret'),
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  aiService: {
    url: getOptionalEnv('AI_SERVICE_URL', 'http://localhost:8000'),
  },

  upload: {
    maxFileSizeMB: parseInt(getOptionalEnv('MAX_FILE_SIZE_MB', '50'), 10),
    dir: getOptionalEnv('UPLOAD_DIR', './uploads'),
    allowedExtensions: ['.pdf', '.csv', '.xlsx', '.json', '.txt'],
    allowedMimeTypes: [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/plain',
    ],
  },

  rateLimit: {
    windowMs: parseInt(getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    authMax: parseInt(getOptionalEnv('AUTH_RATE_LIMIT_MAX', '5'), 10),
  },

  isDev: getOptionalEnv('NODE_ENV', 'development') === 'development',
  isDemo: true, // Always true for hackathon prototype
};
