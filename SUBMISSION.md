# VYRO — Submission Summary

## Hosted Demo & Test Credentials
- **Hosted URL:** `[CONFIRM — insert deployed URL before final submission; local app runs at http://localhost:5173]`
- **Demo Buyer:** `demo.buyer@example.com` / `password123`
- **Demo Seller:** `demo.seller@example.com` / `password123`
- **PayPal Sandbox Personal Checkout Account:** `[CONFIRM — use a Sandbox Personal buyer email and password from PayPal Developer Dashboard > Testing Tools > Sandbox Accounts]`

## What VYRO Does
VYRO is an AI-driven freelance marketplace where AI agents do the haggling and PayPal does the paying, and a human only steps in when it matters.

- **Plain-Language Listing & Request Intake:** Sellers describe services in plain words and AI drafts the listing; buyers describe what they need with a budget and deadline.
- **Independent Bilateral Negotiation:** Buyer and seller AI agents negotiate multi-issue terms (price, delivery turnaround, scope) in structured rounds while keeping each side's private limits strictly confidential on the server.
- **Flexible Budgets & Human Review:** Deals in a buyer's stretch zone (`Flexible +10%` or `Very flexible +20%`) route to **"Needs your OK"** with a plain-language reason and suggested counter rather than silently failing. Every automated decision includes a `"Why?"` explanation and avoids raw IDs or internal tokens.
- **PayPal Orders, Hold, Payouts & Refunds:** Buyers pay via PayPal Sandbox Orders API (`create`, `approve`, `capture`). The platform holds the seller's net share (`agreed price - 5% service fee`) until work acceptance, then dispatches payouts via **real PayPal Payouts API calls in the sandbox, with a clearly labeled simulated fallback used only in test mode and refused when `NODE_ENV=production`**. Refunds are supported via PayPal's refund API before seller payout release.
- **Server-Side Safety:** Auto-approval limits and daily spend caps are enforced on the server; counterparty text is quarantined as untrusted data; `/api/v1/payments/mock-settle` is unmounted (`404`) outside dev/test with `PAYMENT_PROVIDER=mock`; and all payments run against PayPal Sandbox.

## Testing & Known Limitations
- Automated backend tests (`41/41` across `7` suites) and Playwright E2E scripts verify real `POST /api/v1/payments/create-order`, server gates, PayPal Sandbox Payouts dispatch, refunds before payout release, zero raw-text leakage, onboarding, and `NODE_ENV=production` security (`404` on `/mock-settle`, refusal of simulated/mock providers).
- Automated E2E scripts settle test orders via `/api/v1/payments/mock-settle` (only active when `NODE_ENV` is `test`/`development` and `PAYMENT_PROVIDER=mock`) after verifying real PayPal `createOrder`; real buyer popup approval and capture were verified manually in a browser with a Sandbox Personal account (`[CONFIRM]` if re-tested in a new environment).
- Before live production launch with real money, PayPal Commerce Platform / Partner Referrals approval and money-transmitter/escrow licensing compliance are required (documented in [README.md](file:///c:/Users/User/Desktop/My_Apps/VYRO/README.md) and [PAYPAL_RUNBOOK.md](file:///c:/Users/User/Desktop/My_Apps/VYRO/PAYPAL_RUNBOOK.md)).
