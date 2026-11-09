import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.js';
import { User, UserCapabilities, WorkspaceType, Session, Agent } from '../types/index.js';
import { AuthenticatedRequest, authenticateUser, SESSION_COOKIE_NAME } from '../middleware/rbac.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Allow local development without HTTPS
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName, username, capabilities } = req.body;

  if (!email || !displayName || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email, Display Name, and Password (min 6 characters) are required.'
    });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters in length.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = store.getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email already exists.'
    });
  }

  const cleanName = displayName.trim();
  const cleanUsername = (username || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).trim() || `user_${Date.now().toString(36)}`;
  const uid = `usr_${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  const defaultCaps: UserCapabilities = capabilities || { buying: true, selling: true };
  const initialWorkspace: WorkspaceType = defaultCaps.selling && !defaultCaps.buying ? 'seller' : 'buyer';

  const newUser: User = {
    id: uid,
    email: cleanEmail,
    passwordHash,
    displayName: cleanName,
    username: cleanUsername,
    avatarUrl: undefined, // Honest initials fallback; no stock Unsplash
    capabilities: defaultCaps,
    activeWorkspace: initialWorkspace,
    onboardingCompleted: false,
    onboardingStep: 1,
    autoApprovalLimit: 200,
    dailyBudgetCap: 500,
    balance: 2500,
    isAutomationPaused: false,
    createdAt: now,
    updatedAt: now
  };

  store.saveUser(newUser);

  // Issue real session
  const sessionId = `sess_${uuidv4().substring(0, 16)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  store.saveSession({
    id: sessionId,
    userId: uid,
    expiresAt,
    createdAt: now
  });

  res.cookie(SESSION_COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  return res.status(201).json({
    success: true,
    data: sanitizeUser(newUser),
    sessionId // Also returned for bearer token clients
  });
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = store.getUserByEmail(cleanEmail);

  if (!user || !user.passwordHash) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  // Issue real session
  const now = new Date().toISOString();
  const sessionId = `sess_${uuidv4().substring(0, 16)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  store.saveSession({
    id: sessionId,
    userId: user.id,
    expiresAt,
    createdAt: now
  });

  res.cookie(SESSION_COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  return res.json({
    success: true,
    data: sanitizeUser(user),
    sessionId
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (sessionId) {
    store.deleteSession(sessionId);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

// GET /api/v1/auth/me
router.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: sanitizeUser(req.user!)
  });
});

// PATCH /api/v1/auth/capabilities
router.patch('/capabilities', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { buying, selling } = req.body;

  const updatedCapabilities: UserCapabilities = {
    buying: typeof buying === 'boolean' ? buying : user.capabilities.buying,
    selling: typeof selling === 'boolean' ? selling : user.capabilities.selling
  };

  const updated = store.updateUserCapabilities(user.id, updatedCapabilities);
  return res.json({
    success: true,
    data: updated ? sanitizeUser(updated) : null
  });
});

// PATCH /api/v1/auth/workspace
router.patch('/workspace', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { workspace } = req.body as { workspace: WorkspaceType };

  if (!['buyer', 'seller'].includes(workspace)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid workspace type. Must be "buyer" or "seller".'
    });
  }

  const updated = store.updateUserWorkspace(user.id, workspace);
  return res.json({
    success: true,
    data: updated ? sanitizeUser(updated) : null
  });
});

// POST /api/v1/auth/onboarding
router.post('/onboarding', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { step, capabilities, buyerPreferences, sellerProfile, completed } = req.body;

  if (capabilities) user.capabilities = capabilities;
  if (buyerPreferences) user.buyerPreferences = buyerPreferences;
  if (sellerProfile) user.sellerProfile = sellerProfile;
  if (typeof step === 'number') user.onboardingStep = step;
  if (typeof completed === 'boolean') user.onboardingCompleted = completed;

  const updated = store.saveUser(user);
  return res.json({
    success: true,
    data: sanitizeUser(updated)
  });
});

// PATCH /api/v1/auth/profile
router.patch('/profile', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { displayName, bio, isAutomationPaused, buyerPreferences, sellerProfile } = req.body;

  if (displayName && typeof displayName === 'string') {
    user.displayName = displayName.trim();
  }
  if (bio !== undefined) {
    user.bio = typeof bio === 'string' ? bio.trim() : null as any;
  }
  if (typeof isAutomationPaused === 'boolean') {
    user.isAutomationPaused = isAutomationPaused;
  }
  if (buyerPreferences) {
    user.buyerPreferences = { ...user.buyerPreferences, ...buyerPreferences };
  }
  if (sellerProfile) {
    user.sellerProfile = { ...user.sellerProfile, ...sellerProfile };
  }

  const updated = store.saveUser(user);
  return res.json({
    success: true,
    data: sanitizeUser(updated)
  });
});

// POST /api/v1/auth/change-password
router.post('/change-password', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required.'
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters in length.'
    });
  }

  const isCurrentValid = user.passwordHash ? bcrypt.compareSync(currentPassword, user.passwordHash) : false;
  if (!isCurrentValid) {
    return res.status(401).json({
      success: false,
      error: 'Current password does not match.'
    });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  store.saveUser(user);

  return res.json({
    success: true,
    message: 'Password updated successfully.'
  });
});

// POST /api/v1/auth/logout-all
router.post('/logout-all', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  store.deleteSessionsForUser(user.id);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({
    success: true,
    message: 'Signed out of all active sessions.'
  });
});

// DELETE /api/v1/auth/account
router.delete('/account', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userDeals = store.getNegotiationsForUser(user.id);
  const activeDeals = userDeals.filter(d => ['negotiating', 'ready_for_review'].includes(d.status));

  if (activeDeals.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete account while you have ${activeDeals.length} active deal(s) in progress. Please complete or decline in-flight deals first.`
    });
  }

  store.deleteUser(user.id);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({
    success: true,
    message: 'Account and associated data deleted permanently.'
  });
});

export default router;
