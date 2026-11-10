# VYRO Audit Report: Seller Payouts, Calm Motion, and First-Run Onboarding

**Date:** 2026-11-10  
**Scope:** Part A (Seller Payouts & Integer-Cents Escrow Ledger), Part B (Calm Purposeful Motion), Part C (5-Screen First-Run Onboarding & Coach Marks), Part D (End-to-End Verification & Guards).

---

## 1. Part A — Seller Payouts & Platform Escrow Model

### A0 Diagnosis (Root Cause Before Fix)
Prior to this pass:
- SQLite contained no `seller_payout_accounts`, `payouts`, or `ledger_entries` tables (`users` only stored a generic `balance` number).
- [`paypalClient.ts`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/paypalClient.ts) captured buyer payments into the platform merchant account without `payee` (correct for single-merchant model), but immediately hardcoded `sellerPayoutStatus = 'simulated_paid'` and `sellerShareHeld = tx.amount` with 0% platform fee, no work-acceptance gate, and no PayPal Payouts dispatch.
- Live PayPal Sandbox probe (`diagnose_a0.cjs`) confirmed the configured REST app (`APP-00L186717S712100P`) has `https://uri.paypal.com/payments/payouts` enabled (`OAuth 200`, debug ID `ca58384890be3`; `$1.00` test batch `POST /v1/payments/payouts` returned `201`, debug ID `ca583848b4e20`, `payout_batch_id: "U4TWHWDTYAE8U"`, `batch_status: "PENDING"`).

### A1–A4 Implementation Summary
- **Schema & Ledger (SQLite Migration `008_seller_payouts_ledger_onboarding`):**
  - Added [`seller_payout_accounts`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/db/sqlite.ts#L510-L522), `payouts`, and `ledger_entries` (`buyer_paid`, `platform_fee`, `held_for_seller`, `seller_payout`, `refund`).
  - Integer-cents fee calculation via `computeFeeAndPayoutCents(grossCents, feePercent)` in [`money.ts`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/negotiation/money.ts) (`platformFeePercent` defaults to `5%`, configurable via `PLATFORM_FEE_PERCENT`).
- **Payout Providers & Server Gates:**
  - [`PayPalPayoutsProvider`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/payoutProvider.ts#L78) (`POST /v1/payments/payouts` with `sender_batch_id = payout.id`, `sender_item_id = dealId`, USD `value`, note `"VYRO payout"`) and [`SimulatedPayoutProvider`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/payoutProvider.ts) (refuses to run when `NODE_ENV=production`).
  - [`acceptWorkAndReleasePayout`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/payoutService.ts#L114) enforces all server gates: caller is deal buyer, no open dispute/refund, transaction `paymentStatus === 'completed'`, seller payout account `status === 'ready'`, idempotent payout lookup by `dealId`.
  - Fixed two real defects discovered during live end-to-end testing:
    1. Updated [`checkPayoutsCapability`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/payoutProvider.ts#L81-L100) so PayPal's `400 VALIDATION_ERROR` on synthetic batch-ID probes is recognized as Payouts-enabled (rather than falling back to `simulated`).
    2. Updated [`settleMockOrder`](file:///c:/Users/User/Desktop/My_Apps/VYRO/server/src/services/paypal/paypalClient.ts#L765) to update an existing `awaiting_paypal` transaction row in place instead of inserting a duplicate transaction row for the same `agreementId`.
    3. Updated [`SettingsPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/SettingsPage.tsx#L462) so `lastCreateOrderResult` renders as a plain status string (`OK · PAYER_ACTION_REQUIRED`) instead of crashing React when rendering an object.
- **UI & Diagnostics:**
  - [`TransactionsPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/TransactionsPage.tsx): **"Where should we send your earnings?"** card, `"Test mode: no real money moves"` badge, fee/timing copy, PayPal email validation, and seller payout history with retry controls.
  - [`NegotiationDetailPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/NegotiationDetailPage.tsx): Buyer **"Accept work"** and **"Report a problem"** + refund request controls; Seller earnings breakdown (`Buyer paid $X. Your earnings $Y (after $Z fee)...`); confirmation/setup gates (`"Waiting for the seller to finish payout setup"` to buyer, `"Add where to send your earnings"` to seller).
  - [`TransactionDetailPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/TransactionDetailPage.tsx): Itemized receipt (`Agreed project price`, `Service fee (5%)`, `Seller payout`) and pre-acceptance refund form.
  - [`SettingsPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/SettingsPage.tsx): Collapsible **Advanced > Payments status** live diagnostics panel.

### Before Going Live (Legal, Licensing & Partner Referrals)
Documented in [`README.md`](file:///c:/Users/User/Desktop/My_Apps/VYRO/README.md) and [`PAYPAL_RUNBOOK.md`](file:///c:/Users/User/Desktop/My_Apps/VYRO/PAYPAL_RUNBOOK.md):
- In the current architecture, the platform merchant account receives buyer funds, holds the seller's net share until work acceptance, and pays out `agreed price - 5% service fee`.
- Holding funds owed to third parties in real production has legal and money-transmitter/escrow licensing implications; connecting sellers' own PayPal accounts requires approved **PayPal Commerce Platform / Partner Referrals** marketplace onboarding before handling real money.

---

## 2. Part B — Calm, Purposeful Motion

- **Tokens & Accessibility:** [`index.css`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/index.css) defines `120ms` micro, `200ms` standard, and `320ms` emphasis tokens (`<= 400ms`), `cubic-bezier(.2,.8,.2,1)` / `cubic-bezier(.4,0,1,1)` easings, `@media (prefers-reduced-motion: reduce)`, and `.motion-reduced` overrides wired through [`MotionContext.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/context/MotionContext.tsx) and persisted via **Settings > Appearance > Motion** (`System` / `Full` / `Reduced`).
- **Implemented Motion:**
  - Global [`RouteProgressBar`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/RouteProgressBar.tsx) (`transform: scaleX`), active desktop nav indicator (`layoutId="vyro-nav-indicator"`), and 200ms page enter transitions in [`AppLayout.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/AppLayout.tsx).
  - Staggered `40ms` list entrance on Today (`inProgress`, max 8 items) in [`OverviewPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/app/OverviewPage.tsx).
  - Deal timeline [`DealNode`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/DealNode.tsx) dot/connector draw-in, `scaleX` `GapBar`, [`RollingNumber`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/RollingNumber.tsx) count-up on prices, `.vyro-volt-sweep` banner on `agreement_reached` (removed `canvas-confetti`), and `.vyro-live-indicator` reserved solely for active negotiations/loading.
  - Smooth expand/collapse + 10s draining `scaleX` undo progress bar in [`DecisionCard.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/DecisionCard.tsx), slide + focus restore in [`Drawer.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/Drawer.tsx), sliding thumb in [`ModeSwitch.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/ModeSwitch.tsx), and SVG draw-in in [`EmptyState.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/EmptyState.tsx).

---

## 3. Part C — First-Run Onboarding & Coach Marks

- [`OnboardingPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/public/OnboardingPage.tsx) implements 5 horizontal sliding screens:
  1. Welcome + flat SVG line illustration.
  2. Role selector (`Buy services` / `Sell services` / `Both`).
  3. Interactive 7-step deal walkthrough explicitly badged `Sample, not real`.
  4. Plain-language buyer & seller safety limits with live stretch preview.
  5. Role-aware Payments explanation + optional seller PayPal payout setup (`"You're ready — go to Today"` focuses `#home-prompt-input` on `/app?focusPrompt=1`).
- Persisted per account (`onboardingCompleted`), skippable (`Skip setup`), auto-launched once for new accounts in [`AppLayout.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/components/common/AppLayout.tsx), and reopenable via **"Replay onboarding walkthrough"** on [`HelpPage.tsx`](file:///c:/Users/User/Desktop/My_Apps/VYRO/client/src/pages/public/HelpPage.tsx).
- Three dismissible Coach Marks on Today (`homeBox`, `workspaceSwitch`, `needsInbox`) persisted to DB via `coachMarksDismissed`.

---

## 4. Verification Evidence (Commands & Observed Results)

| Check | Command | Latest Result |
| :--- | :--- | :--- |
| Server build | `npm.cmd --prefix server run build` | Passed (0 TypeScript errors) |
| Client build | `npm.cmd --prefix client run build` | Passed (`dist/assets/index-COKQ105v.css`, `index-Cb_xzFyX.js`, 0 errors) |
| Backend unit & integration tests | `npm.cmd --prefix server test` | **38 / 38 passed**, 6 suites, 0 failed, 0 skipped |
| Motion static/bundle guard | `node scripts/motion_guard.js` | **PASSED** (`67 source files + 1 built CSS bundles checked`) |
| Fake progress guard | `node scripts/fake_progress_guard.js` | **PASSED** (`65 files scanned, zero fake progress timers`) |
| Raw text & typography guard | `node scripts/scan_raw_text.js` | **PASSED** (`100% CLEAN. ZERO RAW DATA VIOLATIONS.` across Buyer/Seller/Empty at `1440px` & `390px`) |
| Onboarding E2E | `node scripts/onboarding_e2e.js` | **PASSED** (Case 1 Skip + Help replay; Case 2 5-screen seller flow, `#home-prompt-input` focus, 3 coach marks persisted) |
| Control crawl (responsive) | `node scripts/crawl_all_controls.js` | **PASSED** at `1440x900` and `390x844` (0 page errors, 0 5xx API responses, 0 horizontal overflow) |
| Two-account full journey + video | `node scripts/verify_full_journey_pass3.cjs` | **PASSED**: live `createOrder` `5VY608169S640241B` (`PAYER_ACTION_REQUIRED`), `accept-work` triggered live PayPal Sandbox Payout (`providerBatchId: "TYNH3AT63Z63Q"`, `paypalDebugId: "f374145fd9f45"`, `$130.00` gross, `$6.50` fee, `$123.50` seller payout), second deal dispute & refund (`neg_e5a6ce0d`) |
| Web Vitals / Long tasks | `verify_full_journey_pass3.cjs` | Buyer `CLS=0.0001` (< 0.1), Seller `CLS=0.0813` (< 0.1). Note: `longtask` with `buffered: true` observed initial SPA hydration/PayPal script tasks up to `284.0ms` (Buyer) / `71.0ms` (Seller), not steady-state animation loops. |

### Evidence Files Saved
- Screenshots inspected in `audit/pass3/`:
  - `onboarding_01_welcome.png`, `onboarding_02_role.png`, `onboarding_03_sample_deal.png`, `onboarding_04_limits.png`, `onboarding_05_payments.png`, `onboarding_06_seller_today_prompt.png`
  - `01_seller_onboard_payments.png`, `02_seller_payments_ready.png`, `03_buyer_agreed_before_pay.png`, `04_buyer_paid_held.png`, `05_buyer_accepted_work.png`, `06_buyer_receipt_itemized.png`, `07_seller_deal_released.png`, `08_seller_payments_released.png`, `09_buyer_refunded.png`
- Playwright video recordings saved under `audit/pass3/video/*.webm`.

### Known Limits
- Headless Playwright verification proves live PayPal Sandbox `Orders v2` creation (`PAYER_ACTION_REQUIRED`), server escrow capture accounting, work acceptance gates, real `POST /v1/payments/payouts` dispatch (`TYNH3AT63Z63Q`), and refunds; completing the interactive third-party `sandbox.paypal.com` buyer login popup itself still requires manual Sandbox Personal credentials (documented in [`PAYPAL_RUNBOOK.md`](file:///c:/Users/User/Desktop/My_Apps/VYRO/PAYPAL_RUNBOOK.md)), so the automated Playwright runner completes the post-`createOrder` settlement step via `/api/v1/payments/mock-settle` after asserting live `createOrder` succeeds.
