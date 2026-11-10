# Audit: Negotiation Engine & Autonomous Turns

**Audit Date:** 2026-11-10  
**Target:** Multi-Issue Agent Negotiation System  
**Verdict:** **Deterministic Math & Hardcoded Templates In Use** (LLM bypass verified)

---

## 1. Executive Summary & Root Cause

Earlier test runs produced "deal accepted" in 2–4 rounds with identical numbers ($149, 5 days) and identical messaging because **neither the Buyer agent nor the Seller agent called an LLM during negotiation rounds**. 

Instead:
1. `orchestrator.ts` (`stepNegotiation` lines 298–303 & 450–455) bypasses the LLM and directly invokes `negotiationEngine.generateBuyerResponse` and `negotiationEngine.generateSellerResponse` located in `server/src/services/negotiation/engine.ts`.
2. `engine.ts` calculates prices with a fixed mathematical formula based on round indices (`priceSpan * priceFraction`, lines 97–98).
3. The messages appended to `negotiation.messages` are static template strings (`${buyer.name} accepts the terms...`, `orchestrator.ts` lines 317, 344, 467, 536).
4. `generateBuyerResponse` accepts the counterparty's private `SellerProfile` (including `seller.hardFloor`), violating strict counterparty isolation.

---

## 2. Evidence with Exact File & Line References

### A. LLM Invocation Is Completely Absent in Turns
- **File:** `server/src/services/negotiation/orchestrator.ts`
  - **Lines 298–303:**
    ```ts
    const response = negotiationEngine.generateBuyerResponse(
      buyerProfile,
      sellerProfile,
      currentOffer,
      negotiation.currentRound
    );
    ```
  - **Lines 448–454:**
    ```ts
    const response = negotiationEngine.generateSellerResponse(
      sellerProfile,
      buyerProfile,
      currentBuyerOffer,
      negotiation.currentRound
    );
    ```
  - **Finding:** Neither call touches Gemini or any LLM service. They execute pure TypeScript synchronous math functions in `engine.ts`.

### B. Fixed Formula Concession Curves (Why Numbers Repeated)
- **File:** `server/src/services/negotiation/engine.ts`
  - **Lines 97–98:**
    ```ts
    const priceFraction = round === 1 ? 0.15 : round === 2 ? 0.35 : 0.60;
    proposedPrice = Math.round(buyer.targetPrice + priceSpan * priceFraction);
    ```
  - **Finding:** Given standard catalog items seeded at $180 list and $150 budget, round 2 always calculated `150 * 0.75 + (150 - 112) * 0.35` = $125 or $149, producing identical numbers every run.

### C. Leaked Counterparty Boundaries
- **File:** `server/src/services/negotiation/engine.ts`
  - **Lines 69–73:**
    ```ts
    // Check if seller's hard floor is above buyer's max budget (Empty ZOPA)
    if (seller.hardFloor > buyer.maxBudget) {
      return {
        action: 'rejection',
        reason: `Empty ZOPA: Buyer maximum budget ($${buyer.maxBudget}) is below Seller absolute hard floor ($${seller.hardFloor}).`
      };
    }
    ```
  - **Finding:** The buyer function directly reads `seller.hardFloor` and the seller function reads `buyer.maxBudget`. In a genuine multi-agent marketplace, neither agent may possess the counterparty's private reservation price.

### D. Static Message Strings (Zero Natural Dialogue)
- **File:** `server/src/services/negotiation/orchestrator.ts`
  - **Lines 317, 467, 536:**
    ```ts
    content: `${seller.businessName} proposes adjusted package: $${validCounter.price} with ${validCounter.deliveryDays}-day delivery. Trades: ${validCounter.tradesMade?.join(', ') || 'value rebalanced'}.`
    ```
  - **Finding:** Every round produces mechanical, repeated phrases rather than genuine business negotiations.

---

## 3. Remediation Architecture (Part 2 Implementation)

To fulfill Part 2 requirements:
1. **Isolated LLM Prompting:**
   - Both Buyer Agent and Seller Agent will call the active Gemini model (`gemini-2.5-flash` with deterministic fallback) via dedicated methods in `server/src/services/ai/gemini.ts`.
   - Buyer Agent prompt receives: Buyer private profile (budget ceiling, deadline, must-haves, canary `CANARY_BUYER_CEILING`), negotiation history, and untrusted counterparty message wrapped in `<counterparty_message>...</counterparty_message>`. **Zero seller floor info.**
   - Seller Agent prompt receives: Seller private profile (list price, standard floor, hard floor, canary `CANARY_SELLER_FLOOR`), negotiation history, and untrusted counterparty message. **Zero buyer ceiling info.**
2. **Canary Leak Protection:**
   - `CANARY_BUYER_CEILING=BUYER_CANARY_<uuid>`
   - `CANARY_SELLER_FLOOR=SELLER_CANARY_<uuid>`
   - Automated assertion: Canary strings never appear in counterparty messages or logs.
3. **Hard Rule Guardrails & Clamping:**
   - `negotiationEngine.validateAndClampProposal` strictly enforces seller hard floor and buyer ceiling. If the LLM generates an invalid price, the engine clamps it or forces a re-prompt.
4. **Professional Business Tone:**
   - Prompt engineering ensures human-sounding business tone (no "I am pleased to counter at...").
