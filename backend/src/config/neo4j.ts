import neo4j from 'neo4j-driver';
import { config } from './env';
import logger from '../utils/logger';

let neo4jDriver: any;
let isMock = false;

// Determine if we should mock Neo4j
const shouldMock = process.env.MOCK_DATABASE === 'true' || config.nodeEnv === 'development' || config.isDemo;

if (shouldMock) {
  isMock = true;
  logger.info('ℹ️ Neo4j: Running in MOCK mode');
  
  neo4jDriver = {
    session: () => ({
      run: async (query: string, params?: any) => {
        logger.info(`ℹ️ Neo4j mock running query: ${query.trim().substring(0, 100)}...`);
        return {
          records: [],
          summary: {},
        };
      },
      close: async () => {},
    }),
    close: async () => {},
    verifyConnectivity: async () => {},
  };
} else {
  try {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
    );
  } catch (err) {
    logger.error('❌ Failed to initialize Neo4j driver, falling back to mock', err);
    isMock = true;
    neo4jDriver = {
      session: () => ({
        run: async () => ({ records: [] }),
        close: async () => {},
      }),
      close: async () => {},
      verifyConnectivity: async () => { throw new Error('Mock'); },
    };
  }
}

export async function connectNeo4j(): Promise<void> {
  if (isMock) {
    logger.info('ℹ️ Neo4j mock connection established');
    return;
  }
  
  try {
    await neo4jDriver.verifyConnectivity();
    logger.info('✅ Neo4j connection verified');
    await initNeo4jConstraints();
  } catch (err) {
    logger.error('❌ Neo4j verification failed, using mock fallback', err);
    isMock = true;
    neo4jDriver = {
      session: () => ({
        run: async () => ({ records: [] }),
        close: async () => {},
      }),
      close: async () => {},
      verifyConnectivity: async () => { throw new Error('Mock'); },
    };
  }
}

async function initNeo4jConstraints(): Promise<void> {
  if (isMock) return;
  const session = neo4jDriver.session();
  try {
    // Create uniqueness constraint on Entity ID
    await session.run(`
      CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
      FOR (e:Entity) REQUIRE e.id IS UNIQUE
    `);
    
    // Create index on Entity primaryName
    await session.run(`
      CREATE INDEX entity_name_index IF NOT EXISTS
      FOR (e:Entity) ON (e.primaryName)
    `);
    
    logger.info('✅ Neo4j constraints and indexes verified');
  } catch (err) {
    logger.error('❌ Failed to initialize Neo4j constraints', err);
  } finally {
    await session.close();
  }
}

export async function checkNeo4jHealth(): Promise<boolean> {
  if (isMock) return true;
  try {
    await neo4jDriver.verifyConnectivity();
    return true;
  } catch (err) {
    return false;
  }
}

export async function closeNeo4j(): Promise<void> {
  if (neo4jDriver && typeof neo4jDriver.close === 'function') {
    await neo4jDriver.close();
  }
}

export default neo4jDriver;
