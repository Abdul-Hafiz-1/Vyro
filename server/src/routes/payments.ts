import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { paypalService, PayPalApiException } from '../services/paypal/paypalClient.js';
import { config } from '../config/index.js';
import { store } from '../db/store.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';

const router = Router();

// GET /api/v1/payments/health (sandbox connection verification)
router.get('/health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await paypalService.checkHealth();
    return res.json({
      success: true,
      data: health
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: {
        ok: false,
        connected: false,
        env: config.paypal.env,
        reason: err.message
      }
    });
  }
});

// GET /api/v1/payments/config (public configuration for PayPal SDK)
router.get('/config', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      clientId: config.paypal.clientId || 'sb',
      env: config.paypal.env,
      mode: config.paypal.mode,
      isConfigured: paypalService.isConfigured(),
      platformFeePercent: config.platformFeePercent,
      payoutProvider: config.paypal.payoutProvider
    }
  });
});

// GET /api/v1/payments/diagnostics (dev/admin Settings > Advanced Payments status)
router.get('/diagnostics', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const diag = await paypalService.getDiagnostics();
    return res.json({ success: true, data: diag });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/payments/create-order
// Strictly validates buyer identity and server-side decision record
router.post('/create-order', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { agreementId, idempotencyKey } = req.body;
  if (!agreementId) {
    return res.status(400).json({
      success: false,
      error: 'agreementId is required',
      code: 'VALIDATION_ERROR',
      nextStep: 'Please provide a valid agreement ID.'
    });
  }

  const key = idempotencyKey || `idem_${uuidv4().substring(0, 12)}`;

  try {
    const order = await paypalService.createOrder(agreementId, key, user.id);
    return res.json({ success: true, data: order });
  } catch (err: any) {
    if (err instanceof PayPalApiException) {
      return res.status(err.details.status).json({
        success: false,
        error: err.details.message,
        code: err.details.code,
        nextStep: err.details.nextStep,
        debugId: err.details.debugId
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to create PayPal order',
      code: 'CREATE_ORDER_FAILED',
      nextStep: 'Please retry or verify connection settings.'
    });
  }
});

// POST /api/v1/payments/capture-order
// Strictly validates buyer identity and idempotent execution
router.post('/capture-order', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { orderId, idempotencyKey } = req.body;
  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: 'orderId is required',
      code: 'VALIDATION_ERROR',
      nextStep: 'Ensure orderId from PayPal popup approval is provided.'
    });
  }

  const key = idempotencyKey || `cap_idem_${uuidv4().substring(0, 12)}`;

  try {
    const transaction = await paypalService.captureOrder(orderId, key, user.id);
    return res.json({
      success: true,
      message: 'PayPal Sandbox order captured and verified successfully.',
      data: transaction
    });
  } catch (err: any) {
    if (err instanceof PayPalApiException) {
      return res.status(err.details.status).json({
        success: false,
        error: err.details.message,
        code: err.details.code,
        nextStep: err.details.nextStep,
        debugId: err.details.debugId
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'Payment capture failed',
      code: 'CAPTURE_FAILED',
      nextStep: 'Please retry or check system logs.'
    });
  }
});

// POST /api/v1/payments/mock-settle
// Registered ONLY when NODE_ENV is 'test' or 'development' AND PAYMENT_PROVIDER=mock
if ((config.nodeEnv === 'test' || config.nodeEnv === 'development') && config.paymentProvider === 'mock') {
  router.post('/mock-settle', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { agreementId } = req.body;
    if (!agreementId) {
      return res.status(400).json({
        success: false,
        error: 'agreementId is required',
        code: 'VALIDATION_ERROR',
        nextStep: 'Please provide a valid agreement ID.'
      });
    }

    try {
      const transaction = await paypalService.settleMockOrder(agreementId, user.id);
      return res.json({
        success: true,
        message: 'Platform Escrow simulated settlement completed successfully.',
        data: transaction
      });
    } catch (err: any) {
      if (err instanceof PayPalApiException) {
        return res.status(err.details.status).json({
          success: false,
          error: err.details.message,
          code: err.details.code,
          nextStep: err.details.nextStep,
          debugId: err.details.debugId
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'Mock payment settlement failed',
        code: 'SETTLEMENT_FAILED',
        nextStep: 'Please retry or check system logs.'
      });
    }
  });
}

// POST /api/v1/payments/refund
router.post('/refund', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { agreementId, reason } = req.body;
  if (!agreementId) {
    return res.status(400).json({
      success: false,
      error: 'agreementId is required',
      code: 'VALIDATION_ERROR'
    });
  }

  try {
    const tx = await paypalService.refundPayment(agreementId, reason || 'Refund requested', user.id);
    return res.json({
      success: true,
      message: 'Payment refunded to buyer.',
      data: tx
    });
  } catch (err: any) {
    if (err instanceof PayPalApiException) {
      return res.status(err.details.status).json({
        success: false,
        error: err.details.message,
        code: err.details.code,
        nextStep: err.details.nextStep,
        debugId: err.details.debugId
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'Refund failed'
    });
  }
});

// POST /api/v1/payments/webhooks/paypal - Handle async PayPal payout & refund events
router.post('/webhooks/paypal', (req: AuthenticatedRequest, res: Response) => {
  const eventType = String(req.body?.event_type || '');
  const resource = req.body?.resource || {};

  if (eventType.startsWith('PAYMENT.PAYOUTS-ITEM.')) {
    const batchId = resource.payout_batch_id;
    const itemId = resource.payout_item?.sender_item_id;
    const dealId = itemId;
    if (dealId) {
      const payout = store.getPayoutByDeal(dealId);
      if (payout) {
        if (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') payout.status = 'paid';
        else if (['PAYMENT.PAYOUTS-ITEM.FAILED', 'PAYMENT.PAYOUTS-ITEM.DENIED', 'PAYMENT.PAYOUTS-ITEM.BLOCKED'].includes(eventType)) {
          payout.status = 'failed';
          payout.failureReason = resource.errors?.message || eventType;
        }
        if (batchId) payout.providerBatchId = batchId;
        store.savePayout(payout);
        const tx = store.getTransactionByAgreement(payout.agreementId);
        if (tx) {
          tx.sellerPayoutStatus = payout.status;
          store.saveTransaction(tx);
        }
      }
    }
  }

  return res.json({ received: true });
});

export default router;
