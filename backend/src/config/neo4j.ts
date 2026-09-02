import neo4j from 'neo4j-driver';
import { config } from './env';
import logger from '../utils/logger';

let neo4jDriver: any;
let isMock = false;

// Determine if we should mock Neo4j
const shouldMock = process.env.MOCK_DATABASE === 'true' || config.isDemo || process.env.NODE_ENV === 'test' || !process.env.NEO4J_URI;

const createMockDriver = () => ({
  session: () => ({
    run: async (query: string, params?: any) => {
      logger.info(`ℹ️ Neo4j mock running query: ${query.trim().substring(0, 100)}...`);
      return {
        records: [],
        summary: {},
      };
    },
    executeRead: async (fn: any) => fn({ run: async () => ({ records: [] }) }),
    executeWrite: async (fn: any) => fn({ run: async () => ({ records: [] }) }),
    close: async () => {},
  }),
  close: async () => {},
  verifyConnectivity: async () => {},
});

if (shouldMock) {
  isMock = true;
  logger.info('ℹ️ Neo4j: Running in MOCK mode (MOCK_DATABASE=true)');
  neo4jDriver = createMockDriver();
} else {
  try {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      {
        maxConnectionPoolSize: 50,
        connectionTimeout: 15000,
        maxConnectionLifetime: 3600000,
      }
    );
  } catch (err) {
    logger.error('❌ Failed to initialize Neo4j driver, falling back to mock mode', err);
    isMock = true;
    neo4jDriver = createMockDriver();
  }
}

export async function connectNeo4j(): Promise<void> {
  isMock = true;
  neo4jDriver = createMockDriver();
  logger.info('ℹ️ Neo4j mock connection established');
}

export async function initNeo4jConstraints(): Promise<void> {
  if (isMock) return;
  const session = neo4jDriver.session();
  try {
    // Uniqueness Constraints
    await session.run(`
      CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
      FOR (e:Entity) REQUIRE e.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT case_id_unique IF NOT EXISTS
      FOR (c:Case) REQUIRE c.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT doc_id_unique IF NOT EXISTS
      FOR (d:Document) REQUIRE d.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT identifier_id_unique IF NOT EXISTS
      FOR (i:Identifier) REQUIRE i.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT alias_id_unique IF NOT EXISTS
      FOR (a:Alias) REQUIRE a.id IS UNIQUE
    `);

    // Performance Indexes
    await session.run(`
      CREATE INDEX entity_name_index IF NOT EXISTS
      FOR (e:Entity) ON (e.primaryName)
    `);
    await session.run(`
      CREATE INDEX entity_case_index IF NOT EXISTS
      FOR (e:Entity) ON (e.caseId)
    `);
    await session.run(`
      CREATE INDEX identifier_val_index IF NOT EXISTS
      FOR (i:Identifier) ON (i.identifierValue)
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

export async function checkNeo4jHealthDetails(): Promise<{ status: string; isMock: boolean; connected: boolean }> {
  if (isMock) {
    return { status: 'mock', isMock: true, connected: true };
  }
  try {
    await neo4jDriver.verifyConnectivity();
    return { status: 'healthy', isMock: false, connected: true };
  } catch (err) {
    return { status: 'degraded', isMock: false, connected: false };
  }
}

export function getIsMockNeo4j(): boolean {
  return isMock;
}

export async function closeNeo4j(): Promise<void> {
  if (neo4jDriver && typeof neo4jDriver.close === 'function') {
    await neo4jDriver.close();
  }
}

export default neo4jDriver;
