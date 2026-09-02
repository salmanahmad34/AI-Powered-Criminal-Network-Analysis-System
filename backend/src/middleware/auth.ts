import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware.
 * Extracts and verifies JWT from HttpOnly cookie.
 * NEVER reads tokens from localStorage or Authorization headers in production.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.['__Host-access-token'] || req.cookies?.['access-token'];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Hardcode expected algorithm — never derive from unverified token
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    // Reject 'none' algorithm (defense in depth — jwt.verify with algorithms already does this)
    if (!decoded || !decoded.userId || !decoded.role) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    // Generic error — do not expose JWT internals
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
}

/**
 * Generate access and refresh tokens.
 */
export function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

/**
 * Set auth cookies on response.
 * HttpOnly, Secure, SameSite=Strict.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = config.nodeEnv === 'production';
  const cookiePrefix = isProduction ? '__Host-' : '';

  res.cookie(`${cookiePrefix}access-token`, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie(`${cookiePrefix}refresh-token`, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });
}

/**
 * Clear auth cookies on logout.
 */
export function clearAuthCookies(res: Response): void {
  const isProduction = config.nodeEnv === 'production';
  const cookiePrefix = isProduction ? '__Host-' : '';

  res.clearCookie(`${cookiePrefix}access-token`, { path: '/' });
  res.clearCookie(`${cookiePrefix}refresh-token`, { path: '/api/auth/refresh' });
  // Also clear non-prefixed for dev
  res.clearCookie('access-token', { path: '/' });
  res.clearCookie('refresh-token', { path: '/api/auth/refresh' });
}
