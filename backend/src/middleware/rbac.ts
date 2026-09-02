import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import logger from '../utils/logger';

/**
 * RBAC Permission Matrix.
 * Maps actions to allowed roles.
 */
const PERMISSIONS: Record<string, UserRole[]> = {
  // Admin Only
  'users:manage':       ['ADMIN'],
  'settings:manage':    ['ADMIN'],
  'system:health':      ['ADMIN'],
  'demo:manage':        ['ADMIN'],
  'audit:view':         ['ADMIN'],

  // Cases & Investigation (Admin & Investigator)
  'cases:create':       ['ADMIN', 'INVESTIGATOR'],
  'cases:view':         ['ADMIN', 'INVESTIGATOR'],
  'cases:update':       ['ADMIN', 'INVESTIGATOR'],
  'cases:assign':       ['ADMIN', 'INVESTIGATOR'],

  // Data Upload & Ingestion
  'data:upload':        ['ADMIN', 'INVESTIGATOR'],
  'data:process':       ['ADMIN', 'INVESTIGATOR'],

  // Entities & Network Graph
  'entities:view':      ['ADMIN', 'INVESTIGATOR'],
  'entities:review':    ['ADMIN', 'INVESTIGATOR'],
  'network:view':       ['ADMIN', 'INVESTIGATOR'],
  'network:analytics':  ['ADMIN', 'INVESTIGATOR'],

  // Alerts & Intelligence
  'alerts:view':        ['ADMIN', 'INVESTIGATOR'],
  'alerts:review':      ['ADMIN', 'INVESTIGATOR'],
  'ai:query':           ['ADMIN', 'INVESTIGATOR'],

  // Notes, Reports & Documents
  'notes:create':       ['ADMIN', 'INVESTIGATOR'],
  'notes:view':         ['ADMIN', 'INVESTIGATOR'],
  'reports:generate':   ['ADMIN', 'INVESTIGATOR'],
  'reports:view':       ['ADMIN', 'INVESTIGATOR'],
  'documents:view':     ['ADMIN', 'INVESTIGATOR'],
};

/**
 * Role-based access control middleware factory.
 * Usage: authorize('cases:create')
 */
export function authorize(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as UserRole;

    for (const permission of requiredPermissions) {
      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles) {
        logger.warn(`Unknown permission requested: ${permission}`);
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to perform this action.',
        });
        return;
      }
    }

    next();
  };
}

/**
 * Check if user has a specific role.
 */
export function hasRole(userRole: string, ...roles: UserRole[]): boolean {
  return roles.includes(userRole as UserRole);
}
