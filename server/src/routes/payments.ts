import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { paypalService } from '../services/paypal/paypalClient.js';
import { config } from '../config/index.js';

const router = Router();

// GET /api/v1/payments/config
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      clientId: config.paypal.clientId || 'sb', // 'sb' is standard PayPal sandbox test ID
      mode: config.paypal.mode,
      isConfigured: paypalService.isConfigured()
    }
  });
});

// POST /api/v1/payments/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  const { agreementId, idempotencyKey } = req.body;
  if (!agreementId) {
    return res.status(400).json({ success: false, error: 'agreementId is required' });
  }

  const key = idempotencyKey || `idem_${uuidv4().substring(0, 12)}`;

  try {
    const order = await paypalService.createOrder(agreementId, key);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/payments/capture-order
router.post('/capture-order', async (req: Request, res: Response) => {
  const { orderId, idempotencyKey } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'orderId is required' });
  }

  const key = idempotencyKey || `cap_idem_${uuidv4().substring(0, 12)}`;

  try {
    const transaction = await paypalService.captureOrder(orderId, key);
    res.json({
      success: true,
      message: 'PayPal Sandbox order captured and verified successfully.',
      data: transaction
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
