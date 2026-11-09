import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BuyerProfile,
  SellerProfile,
  PackageOffer
} from '../src/services/negotiation/types.js';
import { negotiationEngine } from '../src/services/negotiation/engine.js';
import { calculateBuyerUtility, calculateSellerUtility, analyzeTrade } from '../src/services/negotiation/utility.js';

describe('Multi-Issue Negotiation Engine & Soft Floor Dynamics', () => {
  function getSampleProfiles() {
    const seller: SellerProfile = {
      id: 'sp_test',
      userId: 'usr_seller',
      agentId: 'agt_seller',
      businessName: 'Apex Design Lab',
      listPrice: 220,
      standardFloor: 160,
      stretchPct: 0.12,
      hardFloor: 140, // standardFloor * (1 - 0.12) = 140.8 -> 140
      capacity: 8,
      minDeliveryDays: 2,
      standardDeliveryDays: 5,
      rushFeePctPerDay: 0.10,
      discounts: {
        longerDeadlinePctPerDay: 0.02,
        scopeReductionPctPerItem: 0.08,
        repeatBuyerPct: 0.05,
        upfrontPaymentPct: 0.06,
        bundlePct: 0.05
      },
      weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
      strategy: 'value-trader'
    };

    const buyer: BuyerProfile = {
      id: 'bp_test',
      userId: 'usr_buyer',
      agentId: 'agt_buyer',
      displayName: 'Alice Buyer',
      targetPrice: 130,
      maxBudget: 190,
      idealDeliveryDays: 3,
      latestDeliveryDays: 8,
      scopeItems: [
        { id: 's1', name: 'UI Components', priority: 'must-have' },
        { id: 's2', name: 'API Schema', priority: 'must-have' },
        { id: 's3', name: 'Storybook Docs', priority: 'nice-to-have' }
      ],
      acceptedPaymentTerms: ['escrow_milestone', 'upfront'],
      preferredPaymentTerm: 'escrow_milestone',
      weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
      strategy: 'conceder'
    };

    return { seller, buyer };
  }

  it('1. Package Offer Structure: Opening proposal contains price, deliveryDays, scope, revisions, and payment terms', () => {
    const { seller, buyer } = getSampleProfiles();
    const opening = negotiationEngine.generateOpeningSellerOffer(seller, buyer);

    assert.strictEqual(opening.price, 220);
    assert.strictEqual(opening.deliveryDays, 5);
    assert.strictEqual(opening.revisions, 2);
    assert.strictEqual(opening.paymentTerms, 'escrow_milestone');
    assert.strictEqual(opening.scopeItems.length, 3);
    assert.ok(opening.utilitySeller !== undefined && opening.utilitySeller > 0.7);
  });

  it('2. Multi-Issue Utility: Buyer utility rewards lower price, faster delivery, and must-have scope', () => {
    const { buyer } = getSampleProfiles();

    const goodOffer: PackageOffer = {
      id: 'o_good',
      round: 1,
      senderRole: 'seller',
      senderAgentId: 'agt_seller',
      price: 135,
      deliveryDays: 3,
      scopeItems: ['UI Components', 'API Schema', 'Storybook Docs'],
      revisions: 2,
      paymentTerms: 'escrow_milestone',
      validUntil: new Date().toISOString()
    };

    const badOffer: PackageOffer = {
      id: 'o_bad',
      round: 1,
      senderRole: 'seller',
      senderAgentId: 'agt_seller',
      price: 185,
      deliveryDays: 8,
      scopeItems: ['UI Components', 'API Schema'],
      revisions: 1,
      paymentTerms: 'upfront',
      validUntil: new Date().toISOString()
    };

    const goodUtility = calculateBuyerUtility(goodOffer, buyer);
    const badUtility = calculateBuyerUtility(badOffer, buyer);

    assert.ok(goodUtility > badUtility, `Expected good utility (${goodUtility}) > bad utility (${badUtility})`);
    assert.ok(goodUtility >= 0.85);
  });

  it('3. Soft-Floor Activation: Seller accepts below standardFloor ($160) down to hardFloor ($140) when buyer concedes non-price value', () => {
    const { seller, buyer } = getSampleProfiles();

    // Buyer makes substantial concessions: +3 turnaround days (8d), drops nice-to-have scope, offers upfront payment
    const concessionOffer: PackageOffer = {
      id: 'o_concessions',
      round: 3,
      senderRole: 'buyer',
      senderAgentId: buyer.agentId,
      price: 150, // Below standardFloor ($160)!
      deliveryDays: 8, // +3 days over standard 5
      scopeItems: ['UI Components', 'API Schema'], // Dropped Storybook Docs
      revisions: 2,
      paymentTerms: 'upfront', // Preferred instant payment
      validUntil: new Date().toISOString()
    };

    const response = negotiationEngine.generateSellerResponse(seller, buyer, concessionOffer, 3);
    // Must accept because the non-price trades unlocked effectiveFloor down to ~$145
    assert.strictEqual(response.action, 'acceptance', 'Seller must accept below standardFloor when buyer trades turnaround, scope, and upfront terms');
  });

  it('4. Hard-Floor Enforcement: Seller NEVER accepts below hardFloor ($140) even with non-price concessions', () => {
    const { seller, buyer } = getSampleProfiles();

    const breachOffer: PackageOffer = {
      id: 'o_breach',
      round: 4,
      senderRole: 'buyer',
      senderAgentId: buyer.agentId,
      price: 130, // Below hardFloor ($140)!
      deliveryDays: 8,
      scopeItems: ['UI Components', 'API Schema'],
      revisions: 1,
      paymentTerms: 'upfront',
      validUntil: new Date().toISOString()
    };

    const response = negotiationEngine.generateSellerResponse(seller, buyer, breachOffer, 4);
    assert.notStrictEqual(response.action, 'acceptance', 'Seller must never accept an offer below hardFloor');
  });

  it('5. Clean No-Deal: Rejects with specific diagnostic reason when ZOPA is empty', () => {
    const { seller, buyer } = getSampleProfiles();
    // Incompatible constraints: buyer max budget ($135) is below seller hard floor ($140)
    buyer.maxBudget = 135;

    const opening = negotiationEngine.generateOpeningSellerOffer(seller, buyer);
    const buyerResponse = negotiationEngine.generateBuyerResponse(buyer, seller, opening, 1);

    assert.strictEqual(buyerResponse.action, 'rejection');
    assert.ok(buyerResponse.reason?.includes('Empty ZOPA'), `Expected empty ZOPA reason, got: ${buyerResponse.reason}`);
  });

  it('6. Deterministic Guardrail Wrapper: Clamps invalid LLM values before counterparty transmission', () => {
    const { seller, buyer } = getSampleProfiles();

    // Fabricate an invalid LLM proposal (below hard floor and missing must-have scope)
    const rawProposal: PackageOffer = {
      id: 'p_invalid',
      round: 2,
      senderRole: 'seller',
      senderAgentId: seller.agentId,
      price: 110, // Violates hardFloor ($140)
      deliveryDays: 1, // Violates minDeliveryDays (2)
      scopeItems: ['Random Item'], // Missing 'UI Components' and 'API Schema'
      revisions: 2,
      paymentTerms: 'escrow_milestone',
      validUntil: new Date().toISOString()
    };

    const validation = negotiationEngine.validateAndClampProposal(rawProposal, buyer, seller);

    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.clampedOffer.price, 140, 'Price must be clamped to hardFloor');
    assert.strictEqual(validation.clampedOffer.deliveryDays, 2, 'Delivery days must be clamped to minDeliveryDays');
    assert.ok(validation.clampedOffer.scopeItems.includes('UI Components'), 'Must-have scope must be re-injected');
    assert.ok(validation.violations.length >= 3);
  });
});
