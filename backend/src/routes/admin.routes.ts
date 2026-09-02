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

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

async function generateUniqueEmail(fullName: string): Promise<string> {
  const cleanName = fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
  let candidate = `${cleanName}@crimegraph.demo`;
  let count = 1;
  while (await prisma.user.findUnique({ where: { email: candidate } })) {
    count++;
    candidate = `${cleanName}${count}@crimegraph.demo`;
  }
  return candidate;
}

const createUserSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  role: z.nativeEnum(UserRole).optional().default(UserRole.INVESTIGATOR),
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
        mustChangePassword: true,
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
 * POST /api/admin/generate-email
 */
router.post('/generate-email', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const { fullName } = req.body;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Valid full name required.' });
      return;
    }

    const email = await generateUniqueEmail(fullName);
    res.json({ email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate email.' });
  }
});

/**
 * POST /api/admin/users — Create Officer / User Account
 */
router.post('/users', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input parameters.', details: parsed.error.issues });
      return;
    }

    let finalEmail = parsed.data.email;
    if (!finalEmail) {
      finalEmail = await generateUniqueEmail(parsed.data.fullName);
    }

    // Check collision if explicit email provided
    const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
    if (existing) {
      res.status(400).json({ error: `An account with email ${finalEmail} already exists.` });
      return;
    }

    const tempPassword = parsed.data.password || generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: finalEmail,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role || UserRole.INVESTIGATOR,
        mustChangePassword: true,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await recordAudit(req.user!.userId, AuditAction.USER_CREATED, 'user', user.id, {
      email: user.email,
      role: user.role,
    }, req.ip || undefined);

    // Return tempPassword to Admin ONLY once in response payload
    res.status(201).json({
      user,
      tempPassword,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 */
router.post('/users/:id/reset-password', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    await recordAudit(req.user!.userId, AuditAction.USER_UPDATED, 'user', user.id, {
      action: 'PASSWORD_RESET',
    }, req.ip || undefined);

    res.json({
      success: true,
      user,
      tempPassword,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset user password.' });
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
        mustChangePassword: true,
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
