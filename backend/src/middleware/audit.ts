import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import prisma from '../config/database';
import logger from '../utils/logger';

/**
 * Record an audit log entry.
 * Audit logs are append-only and immutable to normal users.
 */
export async function recordAudit(
  userId: string | null,
  action: AuditAction,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        // SECURITY: Strip any sensitive fields from details before logging
        details: details ? sanitizeAuditDetails(details) : undefined,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    // Audit failures should not break the application flow
    logger.error('Failed to record audit log', { action, resourceType, resourceId });
  }
}

/**
 * Remove sensitive fields from audit detail payloads.
 */
function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'cookie', 'authorization'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to auto-audit route access.
 * Attach to specific routes that need audit logging.
 */
export function auditMiddleware(action: AuditAction, resourceType?: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId || null;
    const resourceId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || undefined;
    const rawIp = req.ip || req.socket.remoteAddress;
    const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp) || undefined;

    // Fire and forget — don't block the request
    recordAudit(userId, action, resourceType, resourceId, undefined, ip);
    next();
  };
}
