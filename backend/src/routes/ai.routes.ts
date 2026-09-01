import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';
import { AIProviderManager } from '../services/ai/provider.manager';
import logger from '../utils/logger';

const router = Router();
router.use(authenticate);

const aiManager = new AIProviderManager();

/**
 * GET /api/ai/providers
 * Returns health status, enabled state, retry counts and priority rankings.
 */
router.get('/providers', authorize('audit:view'), async (req: Request, res: Response) => {
  try {
    const providers = await prisma.aIProvider.findMany({
      orderBy: { priority: 'asc' },
    });

    res.json({ providers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve AI provider configurations.' });
  }
});

/**
 * POST /api/ai/providers/:providerId/toggle
 * Toggle enabled state of a provider.
 */
router.post('/providers/:providerId/toggle', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined || typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Missing field: enabled (boolean).' });
      return;
    }

    const provider = await prisma.aIProvider.findUnique({
      where: { providerId },
    });

    if (!provider) {
      res.status(404).json({ error: `AI provider ${providerId} not found.` });
      return;
    }

    const updated = await prisma.aIProvider.update({
      where: { id: provider.id },
      data: { enabled },
    });

    logger.info(`AI Provider ${providerId} toggled to enabled=${enabled} by admin.`);

    res.json({ provider: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle AI provider state.' });
  }
});

/**
 * POST /api/ai/query
 * Execute manual testing extraction run.
 */
router.post('/query', authorize('ai:query'), async (req: Request, res: Response) => {
  try {
    const { text, caseId } = req.body;

    if (!text || !caseId) {
      res.status(400).json({ error: 'Fields: text, caseId are required.' });
      return;
    }

    const result = await aiManager.extractDocument(text, {
      caseId,
      documentId: 'manual-test-id',
    });

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Direct manual query test failed.' });
  }
});

export default router;
