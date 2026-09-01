import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus, AuditAction } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { hashPassword } from '../services/auth.service';
import { recordAudit } from '../middleware/audit';
import prisma from '../config/database';

const router = Router();
router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(255),
  role: z.nativeEnum(UserRole),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

/**
 * GET /api/admin/users
 */
router.get('/users', authorize('users:manage'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        fullName: true,
        lastLogin: true,
        failedLoginCount: true,
        mfaEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * POST /api/admin/users
 */
router.post('/users', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input.', details: parsed.error.issues });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
    });

    await recordAudit(req.user!.userId, AuditAction.USER_CREATED, 'user', user.id, {
      email: user.email,
      role: user.role,
    }, req.ip || undefined);

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 */
router.patch('/users/:id', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input.', details: parsed.error.issues });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
      },
    });

    await recordAudit(req.user!.userId, AuditAction.USER_UPDATED, 'user', user.id, {
      fields: Object.keys(parsed.data),
    }, req.ip || undefined);

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * DELETE /api/admin/users/:id — Deactivate, not hard delete.
 */
router.delete('/users/:id', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: UserStatus.INACTIVE },
    });

    await recordAudit(req.user!.userId, AuditAction.USER_DEACTIVATED, 'user', user.id, undefined, req.ip || undefined);

    res.json({ message: 'User deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user.' });
  }
});

/**
 * GET /api/admin/health
 */
router.get('/health', authorize('system:health'), async (_req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      services: {
        database: 'connected',
        api: 'running',
      },
      timestamp: new Date().toISOString(),
      demo: true,
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      services: {
        database: 'disconnected',
      },
    });
  }
});

export default router;
