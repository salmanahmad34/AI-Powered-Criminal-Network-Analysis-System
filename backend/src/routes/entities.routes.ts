import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';

const router = Router();

router.use(authenticate);

/**
 * GET /api/entities
 * List/search entities — scoped by user's case access.
 */
router.get('/', authorize('entities:view'), async (req: Request, res: Response) => {
  try {
    const { search, type, caseId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const take = Math.min(parseInt(limit as string, 10), 200);

    const where: Record<string, unknown> = {};
    if (type) where.entityType = type;
    if (caseId) where.caseId = caseId;
    if (search) {
      where.OR = [
        { primaryName: { contains: search as string, mode: 'insensitive' } },
        { aliases: { some: { aliasName: { contains: search as string, mode: 'insensitive' } } } },
        { identifiers: { some: { identifierValue: { contains: search as string, mode: 'insensitive' } } } },
      ];
    }

    const [entities, total] = await Promise.all([
      prisma.entity.findMany({
        where: where as any,
        include: {
          aliases: true,
          identifiers: true,
          case: { select: { id: true, caseNumber: true, title: true } },
          _count: {
            select: { matchesAsA: true, matchesAsB: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.entity.count({ where: where as any }),
    ]);

    res.json({ entities, total, page: parseInt(page as string, 10), limit: take });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entities.' });
  }
});

/**
 * GET /api/entities/:id
 * Entity profile with all related data.
 */
router.get('/:id', authorize('entities:view'), async (req: Request, res: Response) => {
  try {
    const entity = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: {
        aliases: true,
        identifiers: true,
        case: { select: { id: true, caseNumber: true, title: true } },
        sourceDocument: { select: { id: true, originalFilename: true } },
        matchesAsA: {
          include: {
            entityB: { select: { id: true, primaryName: true, entityType: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
        },
        matchesAsB: {
          include: {
            entityA: { select: { id: true, primaryName: true, entityType: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
        },
        sourceRelationsFrom: {
          include: {
            targetEntity: { select: { id: true, primaryName: true, entityType: true } },
          },
        },
        sourceRelationsTo: {
          include: {
            sourceEntity: { select: { id: true, primaryName: true, entityType: true } },
          },
        },
      },
    });

    if (!entity) {
      res.status(404).json({ error: 'Entity not found.' });
      return;
    }

    res.json({ entity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entity.' });
  }
});

/**
 * GET /api/entities/matches/pending
 * List pending match candidates for review.
 */
router.get('/matches/pending', authorize('entities:review'), async (req: Request, res: Response) => {
  try {
    const matches = await prisma.matchCandidate.findMany({
      where: { status: 'PENDING' },
      include: {
        entityA: {
          include: {
            aliases: true,
            identifiers: true,
            case: { select: { id: true, caseNumber: true } },
          },
        },
        entityB: {
          include: {
            aliases: true,
            identifiers: true,
            case: { select: { id: true, caseNumber: true } },
          },
        },
      },
      orderBy: { confidence: 'desc' },
    });

    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match candidates.' });
  }
});

/**
 * POST /api/entities/matches/:id/review
 * Confirm or reject an entity match.
 */
router.post('/matches/:id/review', authorize('entities:review'), async (req: Request, res: Response) => {
  try {
    const { decision, notes } = req.body;

    if (!decision || !['CONFIRMED', 'REJECTED'].includes(decision)) {
      res.status(400).json({ error: 'Decision must be CONFIRMED or REJECTED.' });
      return;
    }

    const userId = req.user!.userId;

    const match = await prisma.matchCandidate.update({
      where: { id: req.params.id },
      data: {
        status: decision,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });

    // Audit the decision
    const { recordAudit } = await import('../middleware/audit');
    const { AuditAction } = await import('@prisma/client');
    await recordAudit(
      userId,
      decision === 'CONFIRMED' ? AuditAction.ENTITY_CONFIRMED : AuditAction.ENTITY_REJECTED,
      'match_candidate',
      match.id,
      {
        entityAId: match.entityAId,
        entityBId: match.entityBId,
        confidence: match.confidence,
        decision,
      },
      req.ip || undefined
    );

    res.json({ match });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review match.' });
  }
});

export default router;
