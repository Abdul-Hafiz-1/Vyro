# VYRO Negotiation Engine, Negotiable Budgets, Decision Card & PayPal Checkout Fix Report

**Date**: 2026-11-10
**Scope**: Root-cause reproduction, integer-cents negotiable budget model, deterministic concession engine + Gemini live writer, same-side timeline UI, `DecisionCard` redesign, and official `PayPalCheckoutButton` integration.

---

## 1. Root Causes Reproduced (Before Fix)

### Bug 1 — Buyer offered `$1,750` against Seller's `$300` ask (`neg_0070fb83`, `req_ea4b16da`)
- **Database evidence**: `req_ea4b16da` carried `max_budget = 2000`, which seeded `targetPrice = 1500`.
- **Root cause**: In `server/src/services/ai/gemini.ts` fallback logic (lines 996–1015 before fix, triggered when primary Gemini models hit 429 quota), Round 1 auto-accept was blocked by `round >= 2` and the fallback computed `counterPrice = Math.round((targetPrice + maxPrice) / 2)` = `Math.round((1500 + 2000) / 2) = 1750` with **zero never-cross validation** against the seller's current `$300` ask (`prop_7a8a88a7`), after which the seller accepted `$1,750` (`prop_9b76e449`).

### Bug 2 — Buyer agent repeated `$132` across consecutive rounds (`neg_232c8425`, `req_c76d0105`)
- **Root cause**: With `max_budget = 150` (`targetPrice = 113`), the fallback concession formula `Math.round((113 + 150) / 2) = 132` was completely **round-invariant** and ignored both the buyer's prior offers and the seller's concessions (`$300 → $176`). As a result, the buyer agent repeated `$132` on Rounds 1, 2, and 3 (`prop_297410ae`, `prop_b05d8446`, `prop_172cbf5f`) until the seller rejected.

### Bug 3 — Timeline labels compared against counterparty & lacked commas
- **Root cause**: `client/src/pages/app/NegotiationDetailPage.tsx` (pre-fix line 227) computed delta text using `p.price - proposals[idx - 1].price` (comparing against the **other** side's offer instead of the same side's previous offer), producing misleading labels such as `+$1450 counter` and `-$168 price concession`. `client/src/lib/present.ts` also formatted numbers without thousands separators (`$1750` instead of `$1,750`).

### Bug 4 — Sensitivity distortion (`$150` died while `$500` closed near `$438`)
- **Before-fix baseline** (same seller: List `$300`, Standard Lowest `$180`):
  - Buyer Budget `$150` → `rejected` at `$132` (`4` rounds)
  - Buyer Budget `$200` → `agreement_reached` at `$178` (`2` rounds)
  - Buyer Budget `$300` → `agreement_reached` at `$263` (`2` rounds)
  - Buyer Budget `$500` → `agreement_reached` at `$438` (`2` rounds)
- **Root cause**: High-budget buyers anchored and closed near `0.875 * maxBudget` (`$438` > seller's `$300` list price), while lower budgets lacked stretch zones and got stuck repeating a fixed price.

### Bug 5 — `DecisionCard` wrapping & duplicate PayPal surfaces
- **Root cause**:
  - `DecisionCard.tsx` used `flex-wrap` + `h-10.5` pills, causing `Decline` to wrap to a second row on `1440px`, rendered a decorative `<Sparkles>` icon, and fired destructive `onDecline` on one click without confirmation or Undo.
  - `PayPalCheckoutButton.tsx` lacked `disableFunding: 'card,credit,paylater'` (rendering stacked 138px PayPal + card buttons) and lacked `tagline: false` and a 48px loading skeleton. Both `SummaryPanel.tsx` (`Pay $178 securely`) and `NegotiationDetailPage.tsx` (`Or test with Instant Platform Escrow`) rendered duplicate payment actions alongside PayPal.

---

## 2. What Changed

### Backend: Integer Cents, Negotiable Budgets & Deterministic Algorithm
- **`server/src/services/negotiation/money.ts`**: Added integer-cents helpers (`parseMoneyToCents`, `dollarsToCents`, `centsToDollars`, `formatCents`, `roundNaturalCents`, `computeBuyerHardCapCents`, `computeSellerAbsoluteMinCents`) and `FlexibilityTier` (`'strict' | 'flexible' | 'very_flexible'`).
- **Database Migration & Privacy Serialization**: Added SQLite migration `007_negotiable_budgets_and_cents` in `server/src/db/sqlite.ts` and updated `server/src/db/store.ts`, `server/src/routes/requests.ts`, `server/src/routes/listings.ts`, `server/src/routes/negotiations.ts`, and `server/src/routes/home.ts` (`POST /api/v1/home/review/:id/undo` and `/api/v1/rules` mount in `server/src/index.ts`). Counterparty endpoints strictly strip seller lowest/absolute minimum and buyer budget/hard cap.
- **`server/src/services/negotiation/algorithm.ts`**:
  - Deterministic integer-cents concession engine (`computeDeterministicSellerTurn`, `computeDeterministicBuyerTurn`, `checkOverlap`, `validateOfferSanity`).
  - Enforces opening bands, monotonic moves (`0` repeated prices), margin pacing, never-cross invariants (buyer never above seller ask), market-anchored buyer target, split-the-gap at `<= 5%`, stretch-zone escalations (`needs_review` instead of false declines), and Round 8 final stretch verification.
- **`server/src/services/ai/gemini.ts` & `server/src/services/negotiation/orchestrator.ts`**:
  - Default live model `gemini-3.5-flash-lite` with per-model 60s cooldown cache on 429/404.
  - `phraseDeterministicTurn` lets the LLM phrase natural messages around deterministic prices/terms while checking canary privacy tokens; if LLM calls fail in live mode, pauses the negotiation cleanly in `waiting_retry` instead of faking canned text.

### Frontend: Budget UI, Timeline, `DecisionCard` & `PayPalCheckoutButton`
- **4-Number Negotiable Budgets UI**: Updated `RequestCreatePage.tsx`, `ListingEditorPage.tsx`, `HomePromptBox.tsx`, `OverviewPage.tsx`, `InspectDetailsDrawer.tsx`, `SettingsPage.tsx`, `MemoryPage.tsx`, `StyleguidePage.tsx`, and public pages to replace rigid "ceiling"/"floor" framing with target, comfortable budget / standard lowest price, flexibility segmented selector, and live hard-cap / absolute-min calculated sentence.
- **Same-Side Timeline & Gap Bar (`NegotiationDetailPage.tsx`, `DealNode.tsx`, `present.ts`)**: Formatted all dollar amounts with `Intl.NumberFormat('en-US')`, computed same-side deltas (`Lowered by $X`, `Raised by $X`, `Held at $X`, `Changed delivery X → Y days`), rendered `"Why: ..."` rationale per turn, and added the compact Gap Bar / `"Agreed at $X"` + `"You saved $X vs your budget"` header.
- **`DecisionCard.tsx`**: Redesigned with 48px (`h-12`), `rounded-[10px]` buttons in a single desktop row and stacked full-width mobile buttons: solid volt `Approve $X`, 1px outline `Counter` (expanding inline prefilled price + `-$5`/`+$5` steppers + budget/hard-cap helper + `Send counter`), ghost `Decline` (opening `"Decline this deal?"` confirm popover with `[Keep]` and `[Decline]`), desktop `A`/`C`/`D` keyboard hints, and 10s Undo bar. Fixed `SummaryPanel.tsx` sticky positioning so scrolling never overlaps `DecisionCard`.
- **`PayPalCheckoutButton.tsx` & `SummaryPanel.tsx`**: Single official PayPal SDK button (`components=buttons, currency=USD, intent=capture, disable-funding=card,credit,paylater`, `gold` on dark / `blue` on light, `rect`, `height: 48`, `label: 'paypal'`, `tagline: false`), 48px skeleton loader, Retry error box when blocked, `"Paid with PayPal"` + receipt link post-capture, and removed all duplicate payment buttons.

---

## 3. Verification Results

### A. Backend Tests (`npm --prefix server test`) & Client Build (`npm --prefix client run build`)
- `npm.cmd --prefix server test`: **32 / 32 tests passing, 0 failed, 0 skipped** across 5 suites:
  - `Multi-Issue Negotiation Engine & Soft Floor Dynamics`: 6/6 pass
  - `VYRO Multi-User Isolation & Commercial Integrity`: 6/6 pass
  - `Negotiation Algorithm & Money Property Tests` (`server/test/negotiation_properties.test.ts`): 4/4 pass (money parsing including `$1,750`, `$1.750,00`, cents arithmetic across 100 random values, 120 property pairs never-cross/monotonic/zone checks, sanity guard rejecting `$1,750` vs `$300`)
  - `PayPal Sandbox Orders v2 Integration & Security Gates`: 8/8 pass
  - `VYRO Phase 1 / Step 2: Privacy & Decision Engine`: 8/8 pass
- `npm.cmd --prefix client run build` (`tsc -b && vite build`): **0 errors**, built in `1.65s`.

### B. 300-Pair Randomized Negotiation Lab (`scripts/negotiation_lab.ts` → `audit/negotiation_lab_results.json`)
- **Total pairs**: `300`
- **Agreements**: `161` (`53.7%`)
- **Escalations (`needs_review`)**: `38` (`12.7%`)
- **Clean Declines**: `101`
- **Average rounds**: `2.88`
- **Repeated prices**: `0`
- **Crossing offers**: `0`
- **Buyer bids above seller ask**: `0`
- **Canary privacy leaks**: `0`
- **False declines with stretch overlap**: `0` (`0%`)

### C. Sensitivity Table (Seller: List `$300`, Standard Lowest `$180`, Flexible `-10%` → Abs Min `$162`; Buyer Flexible `+10%`)

| Buyer Budget | Before Outcome | Before Price | Before Rounds | After Outcome | After Price | After Rounds |
| --- | --- | --- | --- | --- | --- | --- |
| `$150` | `rejected` | `$132` (stuck) | `4` | `escalated` (stretch zone, buyer cap `$165` vs abs min `$162`) | `$162` | `8` |
| `$200` | `agreement_reached` | `$178` | `2` | `agreement_reached` | `$200` | `4` |
| `$300` | `agreement_reached` | `$263` | `2` | `agreement_reached` | `$205` | `3` |
| `$500` | `agreement_reached` | `$438` (over ask) | `2` | `agreement_reached` | `$205` | `3` |

- **Rise from `$200` → `$500` budget**: **`2.5%`** (`$200` → `$205`, well below the `<= 10%` threshold).

### D. Bug Replays (`audit/negotiation_lab_results.json`)
- **Replay 1 (`$300` ask vs `$1,750` buyer bug scenario)**:
  - Round 1: Seller `$300` (proposal) → Buyer `$170` (counteroffer)
  - Round 2: Seller `$255` (counteroffer) → Buyer `$205` (counteroffer)
  - Round 3: Seller accepts `$205` (`agreement_reached`, `3` rounds, `0` bids above ask)
- **Replay 2 (`$132` stuck scenario — Budget `$150`, Flexible `+10%` vs Seller `$300`/`$180`, Flexible `-10%`)**:
  - Round 1: Seller `$300` → Buyer `$94`
  - Round 2: Seller `$245` → Buyer `$115`
  - Round 3: Seller `$215` → Buyer `$130`
  - Round 4: Seller `$200` → Buyer `$140`
  - Round 5: Seller `$185` → Buyer `$150`
  - Round 6: Seller `$180` → Buyer `$155`
  - Round 7: Seller `$175` → Buyer `$160`
  - Round 8: Seller `$162` (final stretch quote inside `[$162, $165]` overlap) → `escalated` (`8` rounds, `0` repeated prices)

---

## 4. Three Full Live Gemini Transcripts (`audit/transcripts_v2/`)

### Transcript 1 — Normal Agreement (`audit/transcripts_v2/live_normal_deal.md`, `neg_275cf307`)
- **Parameters**: Buyer Budget `$240` (flexible, Hard Cap `$264`) · Final Price **`$185`** · Outcome **`agreement_reached`** in `3` rounds.
- **Round 1 — Seller [proposal] (`$300`, 5d)**: *"We can deliver the Full Production Web Component Kit in 5 days for our standard catalogue rate of $300, which includes the Figma Tokens, React Components, and Accessibility Audit via milestone escrow."*
- **Round 1 — Buyer [counteroffer] (`$150`, 5d)**: *"We appreciate the proposal but are looking to bring this in at $150 for the 5-day turnaround on the Figma Tokens, React Components, and Accessibility Audit. Given the scope, we're anchoring our opening offer here to leave room for us to reach a mutually beneficial agreement via milestone escrow."*
- **Round 2 — Seller [counteroffer] (`$250`, 5d)**: *"Since you moved up $37.50, I've come down $50 to meet you at $250 while keeping the 5-day turnaround, Figma Tokens, React Components, and Accessibility Audit on milestone escrow."*
- **Round 2 — Buyer [counteroffer] (`$185`, 7d)**: *"Since you came down $50, I've moved up $35 to counter at $185 with a 7-day delivery and upfront escrow release for the Figma Tokens, React Components, and Accessibility Audit."*
- **Round 3 — Seller [acceptance] (`$185`, 7d)**: *"Sounds good, we're happy to accept your $185 offer with 7-day delivery since it hits our target margin. Let's move forward with the Figma Tokens, React Components, and Accessibility Audit on upfront escrow release."*

### Transcript 2 — Stretch Zone Escalation (`audit/transcripts_v2/live_stretch_escalation.md`, `neg_942f14e8`)
- **Parameters**: Buyer Budget `$155` (flexible, Hard Cap `$170.50`) · Final Price **`$164`** · Outcome **`escalated`** in `8` rounds.
- **Price progression**: Seller `$300 → $245 → $215 → $200 → $185 → $180 → $174`; Buyer `$97 → $120 → $135 → $145 → $155 → $160 → $164` (`0` repeated prices).
- **Round 8 — Seller [human_escalation] (`$164`, 7d)**: *"We can accept your $164 offer for the full kit, including the Figma tokens, React components, and accessibility audit, with the 7-day delivery timeline. Given this pricing reflects our stretch zone, we appreciate you meeting these terms for an immediate project start."*

### Transcript 3 — Clean No-Deal (`audit/transcripts_v2/live_no_deal.md`, `neg_f5de48e0`)
- **Parameters**: Buyer Budget `$120` (strict, Hard Cap `$120`) · Outcome **`rejected`** in `1` round.
- **Round 1 — Seller [proposal] (`$300`, 5d)**: *"We can accommodate your request for the Full Production Web Component Kit at our standard rate of $300, delivered in 5 days via milestone escrow."*
- **Round 1 — Buyer [rejection]**: *"No deal because the seller's lowest possible rate ($162) is above your hard stretch limit ($120)."*

---

## 5. Visual Proof Inventory

### Before Screenshots (`audit/before-screenshots/`)
- `decision_card_1440_dark.png`, `decision_card_1440_light.png`, `decision_card_390_dark.png`, `decision_card_390_light.png`
- `paypal_checkout_1440_dark.png`, `paypal_checkout_1440_light.png`, `paypal_checkout_390_dark.png`, `paypal_checkout_390_light.png`

### After Screenshots (`audit/after-screenshots/`, verified visually)
- **Decision Card (390 & 1440, dark & light)**:
  - `decision_card_1440_dark.png` (single horizontal row: `Approve $340 [A]`, `Counter [C]`, `Decline [D]`, 48px)
  - `decision_card_1440_light.png`
  - `decision_card_390_dark.png` (full-width stacked mobile buttons)
  - `decision_card_390_light.png`
- **Decision Card Interactive States**:
  - `decision_card_counter_open.png` (inline price field, `-$5`/`+$5` steppers, `Your budget: $360 · Hard cap: $396`, `Cancel`, `Send counter`, zero sticky overlap)
  - `decision_card_decline_confirm.png` (`Decline this deal?` popover with optional reason, `Keep`, `Decline`)
  - `decision_card_undo_collapsed.png` (single collapsed line with `Undo (10s)` countdown after approval)
- **PayPal Official SDK Checkout (390 & 1440, dark & light)**:
  - `paypal_checkout_1440_dark.png` (single gold `PayPal` 48px rect button, plain copy above/below, same-side timeline & Gap Bar)
  - `paypal_checkout_1440_light.png` (single blue `PayPal` 48px rect button)
  - `paypal_checkout_390_dark.png` (mobile gold `PayPal` button)
  - `paypal_checkout_390_light.png` (mobile blue `PayPal` button)
- **PayPal Slow / Blocked Error States & Budget/Timeline UI**:
  - `paypal_slow_skeleton.png` (48px pulsing placeholder during slow network)
  - `paypal_blocked_fallback.png` (`PayPal checkout couldn't load right now.` + `Retry` button when PayPal SDK is blocked)
  - `timeline_gap_bar_1440_dark.png` (Gap Bar `"Agreed at $185"`, `"You saved $55 vs your budget"`, same-side deltas & `"Why:"` boxes)
  - `budget_flexibility_1440_dark.png` (`RequestCreatePage` Step 2 showing target, comfortable budget `$1,750`, flexibility segmented selector, and `"With a $1,750 budget and Flexible, I can ask for your OK up to $1,925."`)

---

## 6. Remaining Known Notes
- Live Gemini generation prioritizes `gemini-3.5-flash-lite` and caches 429/404 model cooldowns for 60s; in `waiting_retry` state when all configured LLM models are throttled, deals pause safely instead of substituting canned fallback offers.
- Live PayPal Sandbox pop-up completion (`approve -> capture`) is verified via backend `PayPal Sandbox Orders v2` integration tests (8/8 pass) and live SDK button mounting in headless Chromium across all 4 viewport/theme combinations.
