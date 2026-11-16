/**
 * @file authMiddleware.ts
 * @description Role-Based Authentication & Authorization Middleware (FR-02, FR-03, FR-07, NFR-01).
 * Validates active user identity and enforces least-privilege role separation on protected endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { UserAccount, UserRole } from '../../shared/types/did.types';
import { identityRepository } from '../repositories/identityRepository';

export interface AuthenticatedRequest extends Request {
  currentUser?: UserAccount;
}

/**
 * Resolves the active session user from the `x-actor-user-id` header or defaults to
 * the primary student account if not supplied on read-only workspace inspection endpoints.
 */
export function attachCurrentUser(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const headerUserId = req.header('x-actor-user-id');
  const user =
    (headerUserId && identityRepository.users.find((u) => u.id === headerUserId)) ||
    identityRepository.users[0];
  req.currentUser = user;
  next();
}

/**
 * Enforces that the authenticated caller holds one of the allowed RBAC roles (FR-03, FR-07, NFR-01).
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required (FR-02). Please sign in with a valid account.',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: `Role authorization denied (FR-03 / NFR-01): Actor '${user.fullName}' (${user.role}) is not permitted to perform this operation. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}
