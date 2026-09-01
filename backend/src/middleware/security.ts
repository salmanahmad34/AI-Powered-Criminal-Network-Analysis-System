import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Security headers via Helmet.
 * Strict CSP to prevent XSS. No unsafe-inline or unsafe-eval.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Needed for Tailwind inline styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", config.frontendUrl],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow loading fonts
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
});

/**
 * CORS — strict origin allow-list.
 */
export const corsMiddleware = cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 600,
});

/**
 * General rate limiter — 100 requests per 15 minutes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Auth rate limiter — 5 requests per 15 minutes (login, register).
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  keyGenerator: (req: Request) => {
    // Rate limit by IP, not by user
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Additional security headers not covered by Helmet.
 */
export function additionalHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
