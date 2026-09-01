import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';

const router = Router();
router.use(authenticate);

/**
 * GET /api/processing/jobs
 * Fetch list of processing jobs.
 */
router.get('/jobs', authorize('data:process'), async (req: Request, res: Response) => {
  try {
    const { caseId } = req.query;

    const where: any = {};
    if (caseId) {
      where.caseId = caseId as string;
    }

    const jobs = await prisma.processingJob.findMany({
      where,
      include: {
        startedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch processing jobs.' });
  }
});

/**
 * GET /api/processing/jobs/:id
 * Fetch detailed state of a single processing job.
 */
router.get('/jobs/:id', authorize('data:process'), async (req: Request, res: Response) => {
  try {
    const job = await prisma.processingJob.findUnique({
      where: { id: req.params.id },
      include: {
        startedBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Processing job not found.' });
      return;
    }

    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch processing job.' });
  }
});

export default router;
