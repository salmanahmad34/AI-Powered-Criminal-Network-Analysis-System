import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { checkNeo4jHealthDetails, getIsMockNeo4j } from '../config/neo4j';
import { graphSyncService } from '../services/graph/graph-sync.service';
import logger from '../utils/logger';

const router = Router();

// Protect all graph API endpoints with authentication
router.use(authenticate);

/**
 * GET /api/graph/health
 * Public graph database cluster health diagnostic
 */
router.get(
  '/health',
  authorize('network:view'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await checkNeo4jHealthDetails();
      res.json({
        status: health.status,
        driverConnected: health.connected,
        isMock: health.isMock,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Error checking graph health', err);
      res.status(500).json({ error: 'Failed to verify graph database health status.' });
    }
  }
);

/**
 * POST /api/graph/sync/case/:caseId
 * Trigger manual idempotent resynchronization of target case to Neo4j Aura
 */
router.post(
  '/sync/case/:caseId',
  authorize('data:process'),
  async (req: Request, res: Response): Promise<void> => {
    const caseId = req.params.caseId as string;
    try {
      const result = await graphSyncService.syncCaseToGraph(caseId);
      if (!result.success) {
        res.status(404).json({ error: `Case ${caseId} not found or sync failed.` });
        return;
      }
      res.json({
        success: true,
        caseId,
        syncedNodes: result.syncedNodes,
        syncedEdges: result.syncedEdges,
        isMock: getIsMockNeo4j(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error(`Failed to trigger graph sync for case ${caseId}`, err);
      res.status(500).json({ error: 'Graph synchronization pipeline failed.' });
    }
  }
);

/**
 * GET /api/graph/case/:caseId
 * Fetch full case graph payload (nodes, edges, statistics) formatted for D3/vis-network UI
 */
router.get(
  '/case/:caseId',
  authorize('network:view'),
  async (req: Request, res: Response): Promise<void> => {
    const caseId = req.params.caseId as string;
    try {
      const graphData = await graphSyncService.getCaseGraph(caseId);
      res.json(graphData);
    } catch (err) {
      logger.error(`Error querying case graph for ${caseId}`, err);
      res.status(500).json({ error: 'Failed to query network link graph.' });
    }
  }
);

/**
 * GET /api/graph/entity/:entityId
 * Fetch 1-hop / 2-hop neighborhood ego network for a specific entity
 */
router.get(
  '/entity/:entityId',
  authorize('network:view'),
  async (req: Request, res: Response): Promise<void> => {
    const entityId = req.params.entityId as string;
    const hops = parseInt((req.query.hops as string) || '1', 10);
    try {
      const neighborhood = await graphSyncService.getEntityNeighborhood(entityId, hops);
      res.json(neighborhood);
    } catch (err) {
      logger.error(`Error querying entity neighborhood for ${entityId}`, err);
      res.status(500).json({ error: 'Failed to query entity neighborhood graph.' });
    }
  }
);

export default router;
