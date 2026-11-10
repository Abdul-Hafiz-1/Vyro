# VYRO — AI-Driven Freelance Marketplace

VYRO is an AI-driven freelance marketplace where AI agents do the haggling and PayPal does the paying, and a human only steps in when it matters.

![Server Build](https://img.shields.io/badge/Server%20%26%20Client-TypeScript%20Build%20Passing-brightgreen?style=flat-square)
![Backend Tests](https://img.shields.io/badge/Backend%20Tests-41%2F41%20Passing-brightgreen?style=flat-square)
![Database](https://img.shields.io/badge/Database-SQLite%20(Single%20Source)-003B57?style=flat-square)
![Payments](https://img.shields.io/badge/Payments-PayPal%20Sandbox%20Orders%20%26%20Payouts-0070BA?style=flat-square)

---

## Judge Quick Start (5-Minute Walkthrough)

- **Hosted URL:** `[CONFIRM — deploy URL not yet set; local preview runs at http://localhost:5173]`
- **Demo Buyer Login:** `demo.buyer@example.com` / `password123`
- **Demo Seller Login:** `demo.seller@example.com` / `password123`
- **PayPal Sandbox Personal Buyer Login (for checkout popup):** `[CONFIRM — enter a Sandbox Personal buyer account email & password from PayPal Developer Dashboard > Testing Tools > Sandbox Accounts]`

### 5-Minute Path
1. **Seller setup (1 min):** Sign in as `demo.seller@example.com`, switch to **Selling**, open **Payments** (`/app/transactions`), and confirm the payout PayPal email (`Ready` status). Switch to **Today** (`/app`) and type what you offer to AI-draft and publish a service listing.
2. **Buyer request & negotiation (1.5 min):** In a private window or after signing in as `demo.buyer@example.com`, type what you need with a budget and deadline on **Today** (e.g., *"Need a 1-page UI audit, budget $140, 5 days"*), review AI's *"Here's what I understood"* summary, and click **Start**.
3. **Human-in-the-loop exception (0.5 min):** Inspect the negotiation timeline (`/app/deals/:id`) showing same-side price concessions, `"Why?"` explanations, and `"Needs your OK"` cards when an offer sits in your stretch zone. Click **Approve** (with a 10-second Undo window).
4. **PayPal checkout & work acceptance (1.5 min):** Click the **PayPal** button in the Summary Panel and approve in the PayPal Sandbox popup using your Sandbox Personal buyer login. Once captured (`Paid, held`), click **Accept work** to release the seller payout (`agreed price - 5% service fee`) via PayPal Payouts API in sandbox.
5. **Itemized receipts & diagnostics (0.5 min):** Open `/app/transactions/:id` to view the itemized price, 5% service fee, and seller payout, and check **Settings > Advanced > Payments status** for live sandbox diagnostics.

---

## 1. Product Model & How It Works

Sellers describe a service in plain words and an AI drafts the listing (title, deliverables, list price, standard lowest price, turnaround days). Buyers type what they need, with a budget and a deadline.

From that point, two independent AI agents (one for each side) negotiate for real: price, delivery time, and scope move in steps, with trades like `"$138 if we use 7 days."` Each side's private limits stay strictly private on the server. Budgets are flexible by design (`Stick to budget`, `Flexible +10%`, `Very flexible +20%`), so a deal slightly above a buyer's comfortable budget isn't thrown away—it routes to the human as a **"Needs your OK"** decision with a plain-language reason and a suggested counter.

Every outcome passes server-enforced rules:
- **Auto-approve** within the user's pre-authorized limits (price within limits, verified seller, confidence threshold, auto-approval ceiling, daily spend cap).
- **Auto-decline** with a plain-language explanation and an option to appeal and reopen.
- **Escalate** to the **Needs you** decision inbox for one-click Approve, Counter, or Decline.

Once a deal is approved, the buyer pays through PayPal (**Orders API**: create, approve, capture), the platform holds the seller's share, and releases it when the buyer accepts the work through **real PayPal Payouts API calls in the sandbox, with a clearly labeled simulated fallback used only in test mode and refused when `NODE_ENV=production`**. Refunds are supported through PayPal's refund API before the seller payout is released.

The interface avoids raw data: every status, price, and decision is written in plain language, with a `"Why?"` explanation for each automated decision.

---

## 2. Safety & Architecture

- **Server-Enforced Spending Limits & Daily Cap:** Client requests have zero financial authority. Orders, captures, daily caps, auto-approval limits, and seller payout gates are verified in SQLite on the server (`server/src/services/decision/engine.ts`, `server/src/services/paypal/paypalClient.ts`, `server/src/services/paypal/payoutService.ts`).
- **Hard Limit Protection:** The AI negotiation guardrail wrapper and algorithm enforce non-crossing offers, monotonic concessions, and hard floor/cap ceilings (`server/src/services/negotiation/algorithm.ts`). Nothing binds above a buyer's hard limit without human authorization.
- **Privacy & Prompt-Injection Containment:** Buyer ceilings and seller floors are stripped from counterparty prompts and API payloads (`server/src/routes/negotiations.ts`). Counterparty text is wrapped as untrusted data inside `<<<UNTRUSTED_COUNTERPARTY_MESSAGE>>>` delimiters (`server/src/services/ai/gemini.ts`).
- **Strict Test-Only Endpoint Gating:** `/api/v1/payments/mock-settle` is registered **only** when `NODE_ENV` is `test` or `development` **and** `PAYMENT_PROVIDER=mock`. When `NODE_ENV=production` (or when `PAYMENT_PROVIDER` is not `mock`), `/api/v1/payments/mock-settle` is not mounted and returns `404`, and mock/simulated payout or payment providers throw an error if selected in production.
- **PayPal Sandbox Scope:** All PayPal calls target `https://api-m.sandbox.paypal.com` (`PAYPAL_ENV=sandbox`). Startup validation aborts boot if live credentials are detected alongside `PAYPAL_ENV=sandbox`.

---

## 3. Workspaces, Navigation & Onboarding

- **Buying Workspace:** `Today · Requests · Deals · Marketplace · Payments`
- **Selling Workspace:** `Today · Listings · Deals · Payments`
- **5-Screen Onboarding (`/onboarding`):** Skippable, reopenable from **Help** (`/app/help`), persisted per account (`onboardingCompleted`), covering Welcome, Role (`Buy services` / `Sell services` / `Both`), an interactive 7-step `"Sample, not real"` walkthrough, plain-language safety limits, and role-based payments setup.
- **Appearance & Accessibility:** Dark default + light mode toggle, System/Full/Reduced motion preference in **Settings > Appearance** honoring `prefers-reduced-motion`.

---

## 4. Local Setup & PayPal Sandbox Configuration

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 9+

### Installation & Run
```bash
npm install
npm --prefix client install
npm --prefix server install
cp .env.example .env
```

Fill in `.env` with your Gemini API key (optional—deterministic engine runs when omitted) and PayPal Sandbox REST app credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `VITE_PAYPAL_CLIENT_ID`). Also see [PAYPAL_RUNBOOK.md](file:///c:/Users/User/Desktop/My_Apps/VYRO/PAYPAL_RUNBOOK.md).

### Sandbox Accounts Setup (1 Business + 2 Personal US/USD)
1. In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), open **Testing Tools > Sandbox Accounts**:
   - **Platform Business Account:** Merchant account tied to your REST app (ensure **Payouts** is enabled under App Feature Options). Receives buyer payments and sends seller payouts.
   - **Personal Buyer Account:** Used by the buyer inside the PayPal checkout popup.
   - **Personal Seller Account:** Email address saved by the seller under **Selling > Payments** (`Where should we send your earnings?`).
2. Start both apps:
```bash
npm run dev:server   # Express + SQLite on http://localhost:4000
npm run dev:client   # Vite React client on http://localhost:5173
```

> **Before Going Live (Important Legal & Licensing Note):**  
> In this sandbox architecture, a single platform merchant account receives buyer funds, holds the seller's share until work acceptance, and pays out `agreed price - 5% service fee` to the seller's PayPal email. **Holding funds on behalf of third parties in real production carries financial-licensing and escrow/money-transmitter compliance requirements**, and onboarding sellers directly requires approved **PayPal Commerce Platform / Partner Referrals** marketplace status. Complete PayPal partner approval and legal/compliance review before accepting real money.

---

## 5. Testing and Known Limitations

- **PayPal Checkout & Capture in Automated vs Browser Tests:** Automated Playwright tests use `/api/v1/payments/mock-settle` (available only when `NODE_ENV` is `test`/`development` and `PAYMENT_PROVIDER=mock`) after verifying real `POST /api/v1/payments/create-order` against PayPal Sandbox; real buyer popup approval and capture were verified manually in a browser with a Sandbox Personal account (`[CONFIRM]` when re-run against a specific tester account).
- **Refund Window:** Refunds (`POST /api/v1/payments/refund`, calling PayPal `POST /v2/payments/captures/{captureId}/refund` for live captures) are available **only before** the seller payout is released (`status !== 'paid'` and `'simulated_paid'`).
- **Live Sandbox Payouts Execution:** Verified via `POST /v1/payments/payouts` in Sandbox (`server/src/services/paypal/payoutProvider.ts` and `scripts/verify_full_journey_pass3.cjs`), with seller payout rows created in SQLite (`processing` while PayPal settles the sandbox batch, updating via webhook or `GET /api/v1/payouts/:id/refresh`).

### Verification Commands
```bash
# TypeScript & production bundle checks
npm --prefix server run build
npm --prefix client run build

# Backend unit, property, isolation, PayPal & production-security tests (41 tests across 7 suites)
npm --prefix server test

# Static motion, fake-progress, raw-text, onboarding & control-crawl guards
node scripts/motion_guard.js
node scripts/fake_progress_guard.js
node scripts/scan_raw_text.js
node scripts/onboarding_e2e.js
node scripts/crawl_all_controls.js
```

---

## 6. License

MIT License. See [LICENSE](file:///c:/Users/User/Desktop/My_Apps/VYRO/LICENSE).
