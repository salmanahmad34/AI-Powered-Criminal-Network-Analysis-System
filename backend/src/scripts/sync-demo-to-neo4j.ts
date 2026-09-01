import prisma from '../config/database';
import { connectNeo4j, closeNeo4j } from '../config/neo4j';
import { graphSyncService } from '../services/graph/graph-sync.service';
import logger from '../utils/logger';

async function syncDemoDataToNeo4j() {
  logger.info('🚀 Starting Demo Graph Seed Synchronization to Neo4j...');
  
  try {
    await connectNeo4j();

    const cases = await prisma.case.findMany();
    logger.info(`Found ${cases.length} cases in database to synchronize.`);

    for (const c of cases) {
      logger.info(`Synchronizing case: ${c.caseNumber} (${c.title})`);
      const result = await graphSyncService.syncCaseToGraph(c.id);
      logger.info(`Case ${c.caseNumber} result: ${result.syncedNodes} nodes, ${result.syncedEdges} edges.`);
    }

    logger.info('✅ Demo Graph Seed Synchronization complete.');
  } catch (err) {
    logger.error('❌ Failed during demo graph seed synchronization', err);
  } finally {
    await closeNeo4j();
    process.exit(0);
  }
}

syncDemoDataToNeo4j();
