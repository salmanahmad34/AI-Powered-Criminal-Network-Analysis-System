import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import logger from '../utils/logger';

/**
 * RBAC Permission Matrix.
 * Maps actions to allowed roles.
 */
const PERMISSIONS: Record<string, UserRole[]> = {
  // Admin
  'users:manage':       ['ADMIN'],
  'settings:manage':    ['ADMIN'],
  'system:health':      ['ADMIN'],
  'demo:manage':        ['ADMIN'],

  // Cases
  'cases:create':       ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER'],
  'cases:view':         ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],
  'cases:update':       ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER'],
  'cases:assign':       ['ADMIN', 'SENIOR_OFFICER'],

  // Data
  'data:upload':        ['INVESTIGATOR'],
  'data:process':       ['INVESTIGATOR'],

  // Entities
  'entities:view':      ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],
  'entities:review':    ['INVESTIGATOR'],

  // Network
  'network:view':       ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],
  'network:analytics':  ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER'],

  // Alerts
  'alerts:view':        ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],
  'alerts:review':      ['INVESTIGATOR', 'SENIOR_OFFICER'],

  // AI
  'ai:query':           ['INVESTIGATOR', 'SENIOR_OFFICER'],

  // Notes
  'notes:create':       ['INVESTIGATOR'],
  'notes:view':         ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],

  // Reports
  'reports:generate':   ['INVESTIGATOR', 'SENIOR_OFFICER'],
  'reports:view':       ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],

  // Documents
  'documents:view':     ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'],

  // Audit
  'audit:view':         ['ADMIN', 'SENIOR_OFFICER'],
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
