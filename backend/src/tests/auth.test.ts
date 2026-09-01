import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginUser } from '../services/auth.service';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { checkRedisHealth } from '../config/redis';
import { checkNeo4jHealth } from '../config/neo4j';
import bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';

describe('Auth Services & Middleware Tests (Mock Mode)', () => {
  beforeEach(() => {
    // Reset prisma users store in mock database
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Password123!', salt);

    prisma.users = [
      {
        id: 'admin-1111',
        email: 'admin@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        fullName: 'Admin User',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'viewer-4444',
        email: 'viewer@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        fullName: 'Viewer User',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('loginUser() service', () => {
    it('authenticates a user with correct credentials', async () => {
      const result = await loginUser('admin@crimegraph.demo', 'Password123!');
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('admin@crimegraph.demo');
      expect(result.accessToken).toBeDefined();
    });

    it('rejects authentication with invalid credentials', async () => {
      const result = await loginUser('admin@crimegraph.demo', 'WrongPassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password.');
    });

    it('locks account after 5 consecutive failures', async () => {
      // 1st, 2nd, 3rd, 4th failed attempts
      for (let i = 0; i < 4; i++) {
        const res = await loginUser('admin@crimegraph.demo', 'WrongPassword');
        expect(res.success).toBe(false);
      }

      // Check not locked yet
      let user = prisma.users.find((u: any) => u.email === 'admin@crimegraph.demo');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.failedLoginCount).toBe(4);

      // 5th failed attempt -> should lock
      const lastRes = await loginUser('admin@crimegraph.demo', 'WrongPassword');
      expect(lastRes.success).toBe(false);

      user = prisma.users.find((u: any) => u.email === 'admin@crimegraph.demo');
      expect(user.status).toBe(UserStatus.LOCKED);
      expect(user.lockedUntil).toBeDefined();
    });
  });

  describe('RBAC middleware authorize()', () => {
    it('allows access if user has required role', () => {
      const req: any = { user: { userId: 'admin-1111', role: 'ADMIN', email: 'admin@crimegraph.demo' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      const middleware = authorize('users:manage');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks access (returns 403) if user lacks role', () => {
      const req: any = { user: { userId: 'viewer-4444', role: 'VIEWER', email: 'viewer@crimegraph.demo' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      const middleware = authorize('users:manage');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Access denied' }));
    });
  });

  describe('Database Health Checks', () => {
    it('verifies that Redis and Neo4j return true in mock mode', async () => {
      const redisHealth = await checkRedisHealth();
      const neo4jHealth = await checkNeo4jHealth();
      
      expect(redisHealth).toBe(true);
      expect(neo4jHealth).toBe(true);
    });
  });
});
