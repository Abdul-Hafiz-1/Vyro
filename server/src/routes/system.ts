import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { store } from '../db/store.js';
import { paypalService } from '../services/paypal/paypalClient.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';

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

// POST /api/v1/system/reset-demo
router.post('/reset-demo', (req: Request, res: Response) => {
  store.resetToSeed();
  res.json({
    success: true,
    message: 'Store reset to initial demonstration state with default agents.'
  });
});

// POST /api/v1/system/seed-demo-flow
// Runs the exact 12-step guided demo flow from Section 21
router.post('/seed-demo-flow', async (req: Request, res: Response) => {
  try {
    // 1. Create Request
    const request = store.saveRequest({
      id: `req_demo_${Date.now()}`,
      userId: 'user_main',
      buyerAgentId: 'agent_buyer_studio',
      rawInput: 'I need a professionally designed landing page for my new business. My maximum budget is $150. I need it within five days.',
      title: 'High-Impact Brand Landing Page with Contact Form',
      category: 'Design',
      requiredCapabilities: ['Landing Page Design', 'Tailwind CSS', 'Responsive UI', 'Contact Forms'],
      deliverables: [
        'Responsive Landing Page Layout',
        'Interactive Pricing Section',
        'Integrated Contact Form',
        'Mobile Optimization'
      ],
      maxBudget: 150,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'Modern typographic hierarchy, high performance, clean responsive breakpoints.',
      status: 'analyzed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Discover seller agents: Pixel Studio, Northstar Design, LaunchCraft
    const sellerIds = ['agent_seller_pixel', 'agent_seller_northstar', 'agent_seller_launchcraft'];

    // 3. Run multi-agent negotiations
    const { negotiations, evaluation } = await negotiationOrchestrator.runMultiAgentNegotiation(
      request.id,
      sellerIds
    );

    // 4. Find recommended negotiation & agreement
    const recommendedNeg = negotiations.find(n => n.id === evaluation.recommendedNegotiationId) || negotiations[0];
    let agreement = recommendedNeg.agreementId ? store.getAgreement(recommendedNeg.agreementId) : null;

    if (!agreement && recommendedNeg.currentProposal) {
      // Ensure agreement exists
      const buyer = store.getAgent(recommendedNeg.buyerAgentId)!;
      const seller = store.getAgent(recommendedNeg.sellerAgentId)!;
      agreement = store.saveAgreement({
        id: `agr_demo_${Date.now()}`,
        negotiationId: recommendedNeg.id,
        requestId: request.id,
        buyerAgentId: buyer.id,
        sellerAgentId: seller.id,
        buyerUserId: request.userId,
        sellerBusinessName: seller.businessName,
        finalPrice: recommendedNeg.currentProposal.price,
        currency: 'USD',
        finalDeliverables: recommendedNeg.currentProposal.deliverables,
        deliveryDays: recommendedNeg.currentProposal.deliveryDays,
        commercialTerms: 'All intellectual property rights assign to buyer upon PayPal capture confirmation.',
        humanApprovalStatus: 'pending',
        paypalReady: false,
        createdAt: new Date().toISOString()
      });
      recommendedNeg.agreementId = agreement.id;
      recommendedNeg.status = 'agreement_reached';
      store.saveNegotiation(recommendedNeg);
    }

    res.json({
      success: true,
      message: 'Demonstration flow orchestrated successfully across 3 candidate seller agents.',
      data: {
        request,
        negotiations,
        evaluation,
        agreement
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
