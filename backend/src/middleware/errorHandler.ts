import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Global error handler.
 * SECURITY: Never expose internal errors, stack traces, or SQL errors to clients.
 */
export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error internally
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    code: err.code,
  });

  // Prisma-specific errors — generic messages only
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'A record with this information already exists.' });
    return;
  }
  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found.' });
    return;
  }

  const statusCode = err.statusCode || 500;

  // NEVER send err.message or err.stack to client in production
  res.status(statusCode).json({
    error: statusCode === 500
      ? 'An internal error occurred. Please try again later.'
      : err.message || 'An error occurred.',
  });
}

/**
 * 404 handler for undefined routes.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Resource not found.' });
}
