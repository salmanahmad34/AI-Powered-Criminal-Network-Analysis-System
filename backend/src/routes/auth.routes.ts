import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, setAuthCookies, clearAuthCookies } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { loginUser, getUserProfile } from '../services/auth.service';
import { recordAudit } from '../middleware/audit';
import { AuditAction } from '@prisma/client';

const router = Router();

// Login schema — validates input, prevents injection
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

/**
 * POST /api/auth/login
 * Public — rate-limited to 5 per 15 minutes per IP.
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input.' });
      return;
    }

    const { email, password } = parsed.data;
    const ip = req.ip || req.socket.remoteAddress;

    const result = await loginUser(email, password, ip);

    if (!result.success || !result.accessToken || !result.refreshToken) {
      res.status(401).json({ error: result.error || 'Authentication failed.' });
      return;
    }

    // Set HttpOnly cookies — tokens never sent in response body
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/logout
 * Requires authentication.
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    clearAuthCookies(res);

    if (req.user) {
      await recordAudit(
        req.user.userId,
        AuditAction.LOGOUT,
        'user',
        req.user.userId,
        undefined,
        req.ip || req.socket.remoteAddress
      );
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile.
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const profile = await getUserProfile(req.user.userId);
    if (!profile) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user: profile });
  } catch (err) {
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh cookie.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.['__Host-refresh-token'] || req.cookies?.['refresh-token'];

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token.' });
      return;
    }

    // Verify refresh token
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../config/env');

    const decoded = jwt.default.verify(refreshToken, config.jwt.refreshSecret, {
      algorithms: ['HS256'],
    }) as { userId: string; email: string; role: string };

    // Generate new tokens
    const { generateTokens } = await import('../middleware/auth');
    const tokens = generateTokens({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ success: true });
  } catch (err) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid refresh token.' });
  }
});

export default router;
