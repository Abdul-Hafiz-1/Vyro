import { DatabaseSync } from 'node:sqlite';
import { geminiService } from '../server/src/services/ai/gemini.js';
import { negotiationOrchestrator } from '../server/src/services/negotiation/orchestrator.js';
import { store } from '../server/src/db/store.js';

async function main() {
  const db = new DatabaseSync('server/data/vyro.db');

  console.log('=== PART 1A: BUG 1 ($300 ask vs $1,750 buyer counter) DB DUMP ===');
  const neg1 = db.prepare('SELECT id, request_id, buyer_agent_id, seller_agent_id, status, current_round, messages FROM negotiations WHERE id = ?').get('neg_0070fb83') as any;
  if (neg1) {
    const req1 = db.prepare('SELECT id, title, max_budget, deadline_days, raw_input FROM requests WHERE id = ?').get(neg1.request_id);
    const props1 = db.prepare('SELECT id, round, sender_agent_id, price, delivery_days, status, why_this_offer FROM proposals WHERE negotiation_id = ? ORDER BY rowid').all(neg1.id);
    console.log('Request:', req1);
    console.log('Proposals:', props1);
    console.log('Messages:', JSON.parse(neg1.messages || '[]').map((m: any) => ({
      round: m.round,
      role: m.senderRole,
      type: m.messageType,
      isAi: m.payload?.isAiGenerated,
      content: m.content,
      price: m.payload?.price ?? m.payload?.counterPrice ?? m.payload?.agreedPrice,
      tradeSummary: m.payload?.tradeSummary
    })));
  }

  console.log('\n=== PART 1B: BUG 2 (Buyer stuck at $132) DB & 3-ROUND TRACE ===');
  const neg2 = db.prepare('SELECT id, request_id, status, current_round, messages FROM negotiations WHERE id = ?').get('neg_232c8425') as any;
  if (neg2) {
    const req2 = db.prepare('SELECT id, title, max_budget, deadline_days FROM requests WHERE id = ?').get(neg2.request_id);
    const props2 = db.prepare('SELECT id, round, sender_agent_id, price, delivery_days, status, why_this_offer FROM proposals WHERE negotiation_id = ? ORDER BY rowid').all(neg2.id);
    console.log('Request:', req2);
    console.log('Proposals:', props2);
    console.log('Messages:', JSON.parse(neg2.messages || '[]').map((m: any) => ({
      round: m.round,
      role: m.senderRole,
      type: m.messageType,
      isAi: m.payload?.isAiGenerated,
      price: m.payload?.price ?? m.payload?.counterPrice,
      content: m.content
    })));
  }

  // Test why LLM fell back or what 3 consecutive rounds look like
  const sellerOwner = store.getUser('usr_marcus_vance')!;
  const buyerUser = store.getUser('usr_alex_mercer')!;

  const testSeller = store.saveAgent({
    id: 'agt_repro_300_180_' + Date.now(),
    ownerId: sellerOwner.id,
    userId: sellerOwner.id,
    businessName: 'Repro Studio (300/180)',
    name: 'Repro Seller',
    type: 'seller',
    description: 'Repro',
    category: 'Design',
    capabilities: ['Design'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [{ id: 'c1', name: 'Service', description: 'Service', startingPrice: 300, minPrice: 180, deliveryDays: 5, includedDeliverables: ['Full Scope'] }],
    pricingConstraints: { startingPrice: 300, minAcceptablePrice: 180 },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log('\n=== PART 1C: BUG 4 SENSITIVITY TABLE BEFORE FIX (Seller List=$300, Lowest=$180) ===');
  for (const budget of [150, 200, 300, 500]) {
    const req = store.saveRequest({
      id: 'req_sens_repro_' + budget + '_' + Date.now(),
      userId: buyerUser.id,
      buyerUserId: buyerUser.id,
      buyerAgentId: 'agt_alex_buyer',
      rawInput: 'Design sprint',
      title: 'Design sprint',
      category: 'Design',
      requiredCapabilities: ['Design'],
      deliverables: ['Full Scope'],
      maxBudget: budget,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'High',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    let neg = await negotiationOrchestrator.initiateNegotiation(req.id, testSeller.id);
    let turns = 0;
    while (neg.status === 'in_negotiation' && turns < 10) {
      neg = await negotiationOrchestrator.stepNegotiation(neg.id);
      turns++;
    }
    const closingPrice = neg.currentProposal?.price ?? null;
    const isAi = neg.messages.filter(m => m.senderRole === 'buyer' && m.messageType === 'counteroffer').map(m => m.payload?.isAiGenerated);
    console.log(`Budget: $${budget} | Outcome: ${neg.status} | Closing/Last Price: $${closingPrice} | Rounds: ${neg.currentRound} | Buyer AI flags: ${JSON.stringify(isAi)}`);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
