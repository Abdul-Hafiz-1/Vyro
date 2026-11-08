import { Router, Request, Response } from 'express';
import { geminiService } from '../services/ai/gemini.js';

const router = Router();

// GET /api/v1/ai/status
router.get('/status', (req: Request, res: Response) => {
  const status = geminiService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

// POST /api/v1/ai/test
// Performs an actual live request to Gemini API and measures latency
router.post('/test', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  try {
    const report = await geminiService.testConnection(apiKey);
    res.json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/v1/ai/configure
// Dynamically configure/update Gemini API key
router.post('/configure', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'A valid apiKey string is required.'
    });
  }

  try {
    const report = await geminiService.testConnection(apiKey.trim());
    res.json({
      success: true,
      message: report.isLive 
        ? `Gemini API connected successfully (${report.latencyMs}ms).` 
        : `Gemini configuration updated but test failed: ${report.errorMessage}`,
      data: report
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
