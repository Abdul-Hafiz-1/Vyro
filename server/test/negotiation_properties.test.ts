import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseMoneyToCents,
  dollarsToCents,
  centsToDollars,
  formatCents,
  computeBuyerHardCapCents,
  computeSellerAbsoluteMinCents,
  FlexibilityTier,
} from '../src/services/negotiation/money.js';
import {
  computeDeterministicBuyerTurn,
  computeDeterministicSellerTurn,
  validateOfferSanity,
  checkOverlap,
  OfferSnapshot,
} from '../src/services/negotiation/algorithm.js';

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('Negotiation Algorithm & Money Property Tests', () => {
  it('1. Money Parsing Property: Handles $1,750, 1750, EU 1.750,00, cents, and rejects garbage', () => {
    assert.strictEqual(parseMoneyToCents('$1,750'), 175000);
    assert.strictEqual(parseMoneyToCents('1750'), 175000);
    assert.strictEqual(parseMoneyToCents('1,750.50'), 175050);
    assert.strictEqual(parseMoneyToCents('1.750,00'), 175000);
    assert.strictEqual(parseMoneyToCents('1.750,75'), 175075);
    assert.strictEqual(parseMoneyToCents('$1,250,000'), 125000000);
    assert.strictEqual(parseMoneyToCents('149.50'), 14950);
    assert.strictEqual(parseMoneyToCents(1750), 175000);
    assert.strictEqual(parseMoneyToCents('-50'), null);
    assert.strictEqual(parseMoneyToCents('abc'), null);
    assert.strictEqual(parseMoneyToCents(''), null);

    // Formatting invariant: commas & drop whole cents
    assert.strictEqual(formatCents(175000), '$1,750');
    assert.strictEqual(formatCents(175050), '$1,750.50');
    assert.strictEqual(formatCents(14900), '$149');
  });

  it('2. Integer Cents Arithmetic Property: Zero floating-point drift across 100 random amounts', () => {
    const rand = lcg(42);
    for (let i = 0; i < 100; i++) {
      const dollars = Math.floor(rand() * 5000) + 10 + Math.floor(rand() * 100) / 100;
      const cents = dollarsToCents(dollars);
      assert.strictEqual(Number.isInteger(cents), true);
      const back = centsToDollars(cents);
      assert.strictEqual(dollarsToCents(back), cents);
    }
  });

  it('3. Never-Cross, Monotonic Concession & Zone Enforcement across 120 property pairs', () => {
    const rand = lcg(1337);
    const flexTiers: FlexibilityTier[] = ['strict', 'flexible', 'very_flexible'];

    for (let trial = 0; trial < 120; trial++) {
      const sellerStd = (Math.floor(rand() * 40) + 5) * 1000; // $50 - $440 in cents
      const sellerList = Math.round(sellerStd * (1.2 + rand() * 0.5));
      const sellerFlex = flexTiers[Math.floor(rand() * flexTiers.length)];
      const sellerAbsMin = computeSellerAbsoluteMinCents(sellerStd, sellerFlex);

      const buyerBudget = (Math.floor(rand() * 55) + 4) * 1000; // $40 - $580 in cents
      const buyerTarget = Math.round(buyerBudget * (0.7 + rand() * 0.15));
      const buyerFlex = flexTiers[Math.floor(rand() * flexTiers.length)];
      const buyerHardCap = computeBuyerHardCapCents(buyerBudget, buyerFlex);

      const history: OfferSnapshot[] = [];
      let buyerLast: OfferSnapshot | undefined;
      let sellerLast: OfferSnapshot | undefined;
      let prevBuyerPrice: number | null = null;
      let prevSellerPrice: number | null = null;

      let outcome: 'accept' | 'escalate' | 'decline' | 'running' = 'running';
      let settledPriceCents = 0;

      for (let round = 1; round <= 8; round++) {
        // Seller turn
        const sDec = computeDeterministicSellerTurn({
          seller: {
            listPriceCents: sellerList,
            standardLowestCents: sellerStd,
            flexibility: sellerFlex,
            absoluteMinCents: sellerAbsMin,
            minDeliveryDays: 2,
            standardDeliveryDays: 5,
            capacity: 8,
            strategy: 'value-trader',
          },
          round,
          history,
          buyerLastOffer: buyerLast,
          availableDeliverables: ['Core Deliverable', 'QA Pass'],
          requestedDeadlineDays: 6,
        });

        assert.ok(sDec.priceCents >= sellerAbsMin, `Trial ${trial} r${round}: Seller went below absolute minimum`);
        if (buyerLast) {
          assert.ok(sDec.priceCents >= buyerLast.priceCents, `Trial ${trial} r${round}: Seller crossed below buyer bid`);
        }
        if (sDec.action === 'counter') {
          if (prevSellerPrice !== null) {
            assert.notStrictEqual(sDec.priceCents, prevSellerPrice, `Trial ${trial} r${round}: Seller repeated price`);
            assert.ok(sDec.priceCents < prevSellerPrice, `Trial ${trial} r${round}: Seller moved wrong direction`);
          }
          prevSellerPrice = sDec.priceCents;
          sellerLast = {
            round,
            senderRole: 'seller',
            priceCents: sDec.priceCents,
            deliveryDays: sDec.deliveryDays,
            scope: sDec.scope,
            revisions: sDec.revisions,
            paymentTerms: sDec.paymentTerms,
          };
          history.push(sellerLast);
        } else {
          outcome = sDec.action;
          settledPriceCents = sDec.priceCents;
          if (sDec.action === 'accept' || sDec.action === 'escalate') {
            assert.ok(settledPriceCents >= sellerAbsMin);
            if (settledPriceCents < sellerStd) {
              assert.strictEqual(sDec.action, 'escalate', 'Seller below standard floor must escalate');
            }
          }
          break;
        }

        // Overlap check
        const overlap = checkOverlap(buyerHardCap, sellerAbsMin, 7, 2);
        if (!overlap.hasOverlap) {
          outcome = 'decline';
          break;
        }

        // Buyer turn
        const bDec = computeDeterministicBuyerTurn({
          buyer: {
            targetCents: buyerTarget,
            budgetCents: buyerBudget,
            flexibility: buyerFlex,
            hardCapCents: buyerHardCap,
            idealDeliveryDays: 3,
            latestDeliveryDays: 7,
            mustHaves: ['Core Deliverable'],
            niceToHaves: ['QA Pass'],
            strategy: 'conceder',
          },
          round,
          history,
          sellerLastOffer: sellerLast,
        });

        assert.ok(bDec.priceCents <= buyerHardCap, `Trial ${trial} r${round}: Buyer exceeded hard cap`);
        assert.ok(bDec.priceCents <= sellerLast.priceCents, `Trial ${trial} r${round}: Buyer crossed above seller ask`);

        if (bDec.action === 'counter') {
          if (prevBuyerPrice !== null) {
            assert.notStrictEqual(bDec.priceCents, prevBuyerPrice, `Trial ${trial} r${round}: Buyer repeated price`);
            assert.ok(bDec.priceCents > prevBuyerPrice, `Trial ${trial} r${round}: Buyer moved wrong direction`);
          }
          prevBuyerPrice = bDec.priceCents;
          buyerLast = {
            round,
            senderRole: 'buyer',
            priceCents: bDec.priceCents,
            deliveryDays: bDec.deliveryDays,
            scope: bDec.scope,
            revisions: bDec.revisions,
            paymentTerms: bDec.paymentTerms,
          };
          history.push(buyerLast);
        } else {
          outcome = bDec.action;
          settledPriceCents = bDec.priceCents;
          if (settledPriceCents > buyerBudget && (bDec.action === 'accept' || bDec.action === 'escalate')) {
            assert.strictEqual(bDec.action, 'escalate', 'Above buyer budget must escalate to human OK');
          }
          assert.ok(settledPriceCents <= buyerHardCap, 'Above hard cap must never agree');
          break;
        }
      }

      assert.notStrictEqual(outcome, 'running', `Trial ${trial} failed to terminate by round 8`);
    }
  });

  it('4. Sanity Guard Rejects $1,750 Buyer Counter Against $300 Seller Ask & 10x Anomalies', () => {
    const check = validateOfferSanity({
      role: 'buyer',
      proposedPriceInput: '$1,750',
      counterpartyCurrentPriceCents: 30000,
      priorOffersCents: [30000],
      buyerHardCapCents: 220000,
    });
    assert.strictEqual(check.valid, false);
    assert.ok(check.reason?.includes('exceeds seller ask'));

    const anomaly = validateOfferSanity({
      role: 'buyer',
      proposedPriceInput: 5000,
      counterpartyCurrentPriceCents: 600000,
      priorOffersCents: [15000],
      buyerHardCapCents: 600000,
    });
    assert.strictEqual(anomaly.valid, false);
    assert.ok(anomaly.reason?.includes('10x'));
  });
});
