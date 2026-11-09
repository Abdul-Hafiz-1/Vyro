import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { store } from '../db/store.js';
import { paypalService } from '../services/paypal/paypalClient.js';

const router = Router();

// GET /api/v1/system/status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'VYRO Autonomous AI Commerce Network Engine',
      version: '1.0.0',
      environment: config.nodeEnv,
      providers: {
        gemini: {
          configured: Boolean(config.geminiApiKey),
          model: config.geminiModel,
          mode: config.geminiApiKey ? 'live_ai' : 'deterministic_simulation'
        },
        paypal: {
          configured: paypalService.isConfigured(),
          mode: config.paypal.mode,
          endpoint: config.paypal.baseUrl
        },
        database: {
          driver: 'persisted_store',
          records: {
            agents: store.getAgents().length,
            negotiations: store.getNegotiations().length,
            transactions: store.getTransactions().length
          }
        }
      }
    }
  });
});

export default router;
