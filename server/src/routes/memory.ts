import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { MemoryItem } from '../types/index.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/rbac.js';

const router = Router();
router.use(authenticateUser);

// GET /api/v1/memory
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.query;
  const items = store.getMemoryItems(req.user!.id, role as 'buyer' | 'seller' | undefined);

  res.json({
    success: true,
    data: items
  });
});

// POST /api/v1/memory
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const { role, type, key, value } = req.body;

  if (!role || !key || !value) {
    return res.status(400).json({
      success: false,
      error: 'role, key, and value are required fields.'
    });
  }

  const memoryItem: MemoryItem = {
    id: `mem_${uuidv4().substring(0, 8)}`,
    userId: req.user!.id,
    role: role as 'buyer' | 'seller',
    type: type || 'preference',
    key: key.trim(),
    value: value.trim(),
    source: 'user_provided',
    confidence: 1.0,
    verifiedByUser: true,
    createdAt: new Date().toISOString()
  };

  store.saveMemoryItem(memoryItem);

  res.status(201).json({
    success: true,
    data: memoryItem
  });
});

// DELETE /api/v1/memory/:id
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = store.getMemoryItem(req.params.id);
  if (!item || item.userId !== req.user!.id) {
    return res.status(404).json({
      success: false,
      error: 'Memory item not found.'
    });
  }

  store.deleteMemoryItem(req.params.id);
  res.json({
    success: true,
    message: 'Memory item deleted.'
  });
});

export default router;
