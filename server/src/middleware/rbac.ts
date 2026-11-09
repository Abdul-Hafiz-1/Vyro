import { Request, Response, NextFunction } from 'express';
import { store } from '../db/store.js';
import { User } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

export const SESSION_COOKIE_NAME = 'vyro_session';

/**
 * Extracts session token strictly from httpOnly cookie or Authorization Bearer header.
 * Rejects client-supplied x-user-id or user parameters.
 */
function extractSessionId(req: Request): string | undefined {
  const fromCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (fromCookie && typeof fromCookie === 'string' && fromCookie.trim().length > 0) {
    return fromCookie.trim();
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return undefined;
}

/**
 * Strictly authenticates the request using the server-side session.
 * Never falls back to default users or trusts client-provided user IDs.
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = extractSessionId(req);

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.'
    });
  }

  const session = store.getSession(sessionId);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session invalid or expired. Please sign in again.'
    });
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    store.deleteSession(sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please sign in again.'
    });
  }

  const user = store.getUser(session.userId);
  if (!user) {
    store.deleteSession(sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(401).json({
      success: false,
      error: 'User account not found.'
    });
  }

  req.user = user;
  req.sessionId = sessionId;
  next();
}

/**
 * Optionally attaches authenticated user if valid session exists, without blocking.
 */
export function optionalAuthenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = extractSessionId(req);
  if (sessionId) {
    const session = store.getSession(sessionId);
    if (session && new Date(session.expiresAt).getTime() >= Date.now()) {
      const user = store.getUser(session.userId);
      if (user) {
        req.user = user;
        req.sessionId = sessionId;
      }
    }
  }
  next();
}

/**
 * Enforces role-based capability permissions.
 */
export function requireRole(requiredRole: 'buyer' | 'seller' | 'any') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (requiredRole === 'any') {
      return next();
    }

    const caps = req.user.capabilities;
    const activeWorkspace = req.user.activeWorkspace;

    if (requiredRole === 'buyer') {
      if (!caps?.buying && activeWorkspace !== 'buyer') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Buyer capability or buyer workspace required.'
        });
      }
    } else if (requiredRole === 'seller') {
      if (!caps?.selling && activeWorkspace !== 'seller') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Seller capability or seller workspace required.'
        });
      }
    }

    next();
  };
}
