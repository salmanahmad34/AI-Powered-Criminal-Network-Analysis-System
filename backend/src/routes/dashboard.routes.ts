import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();
router.use(authenticate);

/**
 * GET /api/dashboard
 * Dashboard stats — scoped by user's case access.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Case filter for non-admin users
    const caseFilter = userRole === 'ADMIN'
      ? {}
      : {
          OR: [
            { createdById: userId },
            { assignments: { some: { userId } } },
          ],
        };

    const [
      totalCases,
      activeCases,
      totalEntities,
      totalDocuments,
      totalAlerts,
      newAlerts,
      processingJobs,
      recentActivity,
    ] = await Promise.all([
      prisma.case.count({ where: caseFilter as any }),
      prisma.case.count({ where: { ...caseFilter, status: 'ACTIVE' } as any }),
      prisma.entity.count(),
      prisma.document.count(),
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'NEW' } }),
      prisma.processingJob.count({ where: { status: { notIn: ['COMPLETED', 'FAILED'] } } }),
      prisma.auditLog.findMany({
        where: userRole === 'ADMIN' ? {} : { userId },
        include: {
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Count relationships
    const totalRelationships = await prisma.extractedRelationship.count();

    res.json({
      stats: {
        totalCases,
        activeCases,
        totalEntities,
        totalRelationships,
        totalDocuments,
        totalAlerts,
        newAlerts,
        processingJobs,
      },
      recentActivity,
      demo: true, // Always flag as demo data
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

/**
 * GET /api/search
 * Global search across all entity types.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters.' });
      return;
    }

    const searchTerm = q.trim();

    // Search entities
    const entityWhere: Record<string, unknown> = {
      OR: [
        { primaryName: { contains: searchTerm, mode: 'insensitive' } },
        { aliases: { some: { aliasName: { contains: searchTerm, mode: 'insensitive' } } } },
        { identifiers: { some: { identifierValue: { contains: searchTerm, mode: 'insensitive' } } } },
      ],
    };
    if (type) entityWhere.entityType = type;

    const entities = await prisma.entity.findMany({
      where: entityWhere as any,
      include: {
        aliases: true,
        identifiers: true,
        case: { select: { id: true, caseNumber: true, title: true } },
      },
      take: 20,
    });

    // Search cases
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { caseNumber: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // Search documents
    const documents = await prisma.document.findMany({
      where: {
        originalFilename: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        id: true,
        originalFilename: true,
        dataCategory: true,
        caseId: true,
        case: { select: { caseNumber: true } },
      },
      take: 10,
    });

    res.json({
      results: {
        entities,
        cases,
        documents,
      },
      query: searchTerm,
    });
  } catch (err) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
