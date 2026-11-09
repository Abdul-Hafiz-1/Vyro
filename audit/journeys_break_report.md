# Core User Journeys Breakage Audit (Phase 0)

**Date**: 2026-11-09  
**Target Environment**: VYRO (Client: Port 5173, Server: Port 4000)  
**Method**: Automated API journey runner (`scripts/test_journeys.ts`) & Browser Playwright/Puppeteer walk.

---

## Executive Summary

| Journey | User Scenario | Automated Test Result | Breakage Severity |
| :--- | :--- | :--- | :--- |
| **Journey 1** | New buyer posts a procurement request | **FAIL** | **HIGH** (Auto-negotiation fails if `sellerIds` omitted) |
| **Journey 2** | New seller lists a service | **PASS (with defect)** | **MEDIUM** (`/listings/my` 404s due to route shadowing) |
| **Journey 3** | Deal needs a human decision | **PASS (with UI gap)** | **MEDIUM** (Deal detail lacks direct `/approve` endpoint) |
| **Journey 4** | Deal is auto-declined and appealed | **FAIL (Missing Feature)**| **CRITICAL** (No appeal route or UI exists) |
| **Journey 5** | Payment completes (PayPal / Mock) | **PASS (with UX bug)** | **LOW** (Mock pay param mismatch & missing receipt link) |

---

## Detailed Journey Audits & Root Cause Analysis

### Journey 1: New Buyer Posts a Request
- **User Intention**: A non-technical user registers an account, writes in plain language what they want ("Need OWASP penetration testing under $350 in 4 days"), and their AI buyer agent goes to work finding suppliers and negotiating.
- **Observed Behavior**:
  - The request record is saved cleanly in SQLite (`requests` table).
  - However, when initiating multi-agent negotiation via `POST /api/v1/negotiations/multi-agent`, the server immediately aborts with `{"success":false,"error":"sellerIds is required"}`.
  - The server does not perform automatic marketplace matchmaking based on category/deliverables when `sellerIds` is omitted or empty.
- **Root Cause Code**:
  - `server/src/routes/negotiations.ts:149-152`:
    ```ts
    const { requestId, sellerIds } = req.body;
    if (!requestId || !sellerIds || !Array.isArray(sellerIds) || sellerIds.length === 0) {
      return res.status(400).json({ success: false, error: 'sellerIds is required' });
    }
    ```
- **Required Fix**: When `sellerIds` is not supplied, the server must automatically query active listings matching the request category and capabilities, extract their `sellerAgentId`s (excluding the user's own agents), and proceed autonomously.

---

### Journey 2: New Seller Lists a Service
- **User Intention**: A service provider registers, clicks "Create Listing", fills out standard asking price, sets their confidential minimum floor ($200), and publishes it to the marketplace.
- **Observed Behavior**:
  - Listing is successfully written to `listings` table and marked `active`.
  - Floor price is correctly scrubbed by `serializeListing` when viewed by public buyers.
  - However, if the client requests `GET /api/v1/listings/my`, Express matches `GET /api/v1/listings/:id` with `id="my"` and returns `404 Listing not found`.
- **Root Cause Code**:
  - `server/src/routes/listings.ts:47`:
    ```ts
    // Parameterized route is declared before any /my route:
    router.get('/:id', optionalAuthenticateUser, ...)
    ```
- **Required Fix**: Explicitly declare `router.get('/my', authenticateUser, ...)` *above* `router.get('/:id', ...)` to return the authenticated user's owned listings directly without requiring client query parameters.

---

### Journey 3: Deal Needs a Human Decision
- **User Intention**: An agent negotiates terms where price ($260) exceeds the buyer's auto-approval rule ($200). The user sees a high-priority card in the Review Queue or Deal Cockpit, reviews the trade-offs, and clicks "Approve".
- **Observed Behavior**:
  - The decision engine correctly routes the transaction to `status: "escalated"` and `decision.status: "needs_review"`.
  - The item appears in `GET /api/v1/home` review queue.
  - However, on the Deal Detail Cockpit page (`/app/deals/:id`), the user expects an "Approve Deal" button. Currently, approval only exists on the dashboard review queue via `/api/v1/home/review/:id/approve`. If the user is on the deal cockpit itself, there is no direct `/api/v1/negotiations/:id/approve` endpoint.
- **Root Cause Code**:
  - `server/src/routes/negotiations.ts` has no `router.post('/:id/approve', ...)` or `router.post('/:id/decline', ...)` handlers.
- **Required Fix**: Add direct `POST /api/v1/negotiations/:id/approve` and `POST /api/v1/negotiations/:id/decline` routes to `negotiations.ts`, unifying approval handling whether triggered from Overview or the Deal Cockpit.

---

### Journey 4: Deal is Auto-Declined and Appealed
- **User Intention**: A deal is auto-declined by policy (e.g. counterparty offered prohibited category or price deviated >30%). The human is notified, clicks "Appeal Decision", explains why an exception is acceptable ("Special client waiver approved"), and the deal is reopened for review.
- **Observed Behavior**:
  - **TOTAL FAILURE**: Route `POST /api/v1/negotiations/:id/appeal` does not exist on the server (returns 404 HTML).
  - The UI has no appeal button, modal, or input for auto-declined negotiations.
  - The deal remains permanently declined with no recovery path.
- **Root Cause Code**: Feature was never implemented in either server or client.
- **Required Fix**:
  1. Add `POST /api/v1/negotiations/:id/appeal` in `server/src/routes/negotiations.ts` which records an appeal justification note, transitions decision status to `appealed_pending_review`, and adds an audit message.
  2. Add "Appeal Decision" action button and modal in `NegotiationDetailPage.tsx` for deals in `auto_declined` status.

---

### Journey 5: Payment Completes
- **User Intention**: Once approved, the buyer clicks PayPal to pay. PayPal popup appears, buyer confirms sandbox payment, server captures order, seller share is held in internal escrow ledger, and a clear transaction receipt is presented.
- **Observed Behavior**:
  - PayPal Orders v2 with `onApprove` captures correctly and securely.
  - Health check verifies sandbox OAuth connectivity.
  - Minor UX Defect: The Mock Pay fallback button in `NegotiationDetailPage.tsx` sends `deal.id` instead of `deal.agreementId` in some code paths, resulting in `404 Agreement not found`.
  - Transaction receipt exists at `/app/transactions/:id`, but upon settlement, the user is not automatically provided a "View Commercial Receipt" link in the deal cockpit.
- **Required Fix**:
  1. Ensure Mock Pay handler derives `agreementId` reliably.
  2. Display a prominent "View Commercial Receipt & Invoice" banner in `NegotiationDetailPage.tsx` when status is `settled` / `completed`.
