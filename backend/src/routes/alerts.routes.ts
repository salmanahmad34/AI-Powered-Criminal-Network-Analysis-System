import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';

const router = Router();
router.use(authenticate);

/**
 * GET /api/alerts
 * List alerts — scoped by user's case access.
 */
router.get('/', authorize('alerts:view'), async (req: Request, res: Response) => {
  try {
    const { status, type, caseId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const take = Math.min(parseInt(limit as string, 10), 100);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.alertType = type;
    if (caseId) where.caseId = caseId;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: where as any,
        include: {
          case: { select: { id: true, caseNumber: true, title: true } },
          reviewedBy: { select: { id: true, fullName: true } },
          _count: { select: { alertEvidence: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.alert.count({ where: where as any }),
    ]);

    res.json({ alerts, total, page: parseInt(page as string, 10), limit: take });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

/**
 * GET /api/alerts/:id
 * Alert detail with evidence and source records.
 */
router.get('/:id', authorize('alerts:view'), async (req: Request, res: Response) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        alertEvidence: {
          include: {
            document: { select: { id: true, originalFilename: true } },
          },
        },
      },
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }

    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alert.' });
  }
});

/**
 * PATCH /api/alerts/:id
 * Update alert status (review).
 */
router.patch('/:id', authorize('alerts:review'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
      },
    });

    const { recordAudit } = await import('../middleware/audit');
    const { AuditAction } = await import('@prisma/client');
    await recordAudit(
      req.user!.userId,
      AuditAction.ALERT_REVIEWED,
      'alert',
      updated.id,
      { status, alertType: updated.alertType },
      req.ip || undefined
    );

    res.json({ alert: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert.' });
  }
});

export default router;
