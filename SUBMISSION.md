# VYRO — Devpost Submission Copy

**Demo Video:** [https://youtu.be/Z75r16UUy5k](https://youtu.be/Z75r16UUy5k)  
**GitHub Repository:** [https://github.com/Abdul-Hafiz-1/Vyro](https://github.com/Abdul-Hafiz-1/Vyro)

---

## Elevator Pitch (123 characters)
AI freelance marketplace where isolated buyer and seller agents negotiate multi-issue terms and PayPal holds and releases escrow.

---

## Project Description (~285 words)
Beginner freelancers rarely get the recognition they deserve. Established profiles with long review histories win the work, while newcomers spend their time writing proposals and haggling over price. Buyers have the opposite problem: they often need something very specific, and finding the right person means scrolling through listings and messaging back and forth. In the age of AI, that back and forth shouldn't be a person's job. VYRO is a freelance marketplace where AI agents do the matching and negotiating, PayPal handles the money, and humans step in only when a decision really needs one.

Sellers describe a service in plain words and Gemini drafts the structured listing. Buyers describe what they need with a budget and deadline, and VYRO structures a brief (asking at most one follow-up if budget or deadline is missing). Independent buyer and seller agents then negotiate price, turnaround days, and revisions in integer cents while keeping each side's private ceiling or floor strictly quarantined on the server.

Deals within a user's rules can auto-approve; deals that enter a flexible stretch zone or exceed auto-limits route to **Needs your OK** with a plain-language `"Why?"` explanation for one-click Approve, Counter, or Decline. Once agreed, buyers fund escrow through **PayPal Sandbox Orders v2** (`create`, `approve`, `capture`). Funds stay held until the seller starts and delivers work (with SHA-256 hashed files stored privately outside the web root) and the buyer clicks **Accept work**—or a 72-hour review window completes—releasing net earnings via **PayPal Payouts**. Stage-locked refund rules allow instant refunds before work starts while blocking buyer self-refund abuse after delivery.

---

## Inspiration
Freelancers spend hours writing proposals and underpricing themselves, while buyers struggle to compare custom quotes across directories. Meanwhile, naive marketplace escrow can expose sellers to post-delivery refund abuse. We wanted AI agents to handle the tiring back-and-forth without ever leaking private budgets or letting an LLM bypass server-enforced money rules.

## What It Does
- **Plain-Words Briefs & Listings:** Turn natural language into structured buyer requests and seller listings.
- **Bilateral Multi-Issue Negotiation:** Agents trade price, delivery days, and revisions across rounds with zero private-limit leakage.
- **Exception-Based Human Control:** Auto-approve within user limits, escalate stretch offers to **Needs your OK**, or auto-decline policy violations with an appeal path.
- **PayPal Escrow, Stage-Locked Refunds & Payouts:** Capture into platform sandbox hold, lock instant refunds once work starts/delivers, support 72-hour review auto-release, and mediate disputes (`Release`, `Refund`, or percentage `Split`) before releasing PayPal payouts.

## How We Built It
We built a React 19 + Vite + Tailwind CSS client paired with a TypeScript Express API backed by SQLite (`node:sqlite`). All money math uses integer cents inside `BEGIN IMMEDIATE` SQLite transactions so concurrent accept-work and refund calls can never violate $\text{refunded} + \text{paid\_out} \le \text{captured}$. Google Gemini (`gemini-3.5-flash-lite`) powers natural-language parsing and negotiation phrasing, bounded by deterministic algorithmic guardrails. PayPal integration uses `@paypal/react-paypal-js` and REST calls to Sandbox Orders v2, Payments Refunds v2, and Payouts v1.

## Challenges We Ran Into
1. **Stopping LLM Negotiation Hallucinations:** Early LLM turns produced invalid counters (e.g., bidding above the seller's ask). We solved this by computing offers deterministically in integer cents and confining the LLM to structured parsing and phrasing.
2. **Preventing Post-Delivery Refund Abuse & Race Conditions:** We replaced generic refund buttons with a server-enforced project state machine (`paid_held` → `in_progress` → `delivered` → `accepted` → `payout_released`) and `BEGIN IMMEDIATE` locks.

## Accomplishments That We're Proud Of
- **Zero-Knowledge Counterparty Isolation:** Verified by automated canary tests proving buyer budgets and seller floors never appear in counterparty API responses or `project_events`.
- **Atomic Financial Invariants:** Verified under concurrent `Promise.all` race tests, `NODE_ENV=production` security gates (`404` on `/mock-settle`), and a 7-scenario two-account Playwright E2E suite.

## What We Learned
AI agents shine at turning messy human intent into structured terms, but money, limits, and state transitions must stay deterministic on the server. Separating "AI drafting/phrasing" from "server-enforced financial rules" made the product both predictable and explainable.

## What's Next
- Complete PayPal Commerce Platform Partner Referrals onboarding so sellers connect their own PayPal merchant accounts directly.
- Enable live production PayPal Payouts with money-transmission compliance.
- Sync PayPal Resolution Center dispute webhooks directly into VYRO's mediator console.

## Built-With Tags
`paypal` · `gemini` · `typescript` · `react` · `nodejs` · `express` · `sqlite` · `tailwindcss` · `playwright`

---

## Testing Instructions for Judges (Short)
1. `git clone https://github.com/Abdul-Hafiz-1/Vyro.git && cd Vyro && npm run install:all`
2. `cp .env.example .env` (Windows: `copy .env.example .env`) and add PayPal Sandbox REST keys (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `VITE_PAYPAL_CLIENT_ID`) plus optional `GEMINI_API_KEY`.
3. `npm run seed:demo && npm run dev`, then open `http://localhost:5173`.
4. Use `demo.seller@example.com` / `password123` in one window and `demo.buyer@example.com` / `password123` in an incognito window; approve PayPal Checkout using a **Sandbox Personal** buyer account.

---

## Tools Used
- **PayPal:** JS SDK (`@paypal/react-paypal-js`), OAuth 2.0 (`POST /v1/oauth2/token`), Orders API v2 (`POST /v2/checkout/orders`, `POST /v2/checkout/orders/{orderId}/capture`), Refunds API v2 (`POST /v2/payments/captures/{captureId}/refund`), Payouts API v1 (`POST /v1/payments/payouts`, `GET /v1/payments/payouts/{batchId}`), plus dev/test-only simulated fallback refused in `NODE_ENV=production`.
- **AI Inside the Product:** Google Gemini (`gemini-3.5-flash-lite` via `@google/generative-ai`) for brief/listing parsing and negotiation phrasing, validated by deterministic integer-cent algorithms and `DecisionEngine`.
- **AI Used to Build the Product:** We used Claude and the Anti-Gravity AI coding assistant as major parts of the development process, to write and edit code and to refine prompts and designs. We reviewed, tested and iterated on the results.
- **Stack & Tooling:** React 19, Vite 8, Tailwind CSS 3, Node.js 20+, Express 4, SQLite (`node:sqlite`), Playwright, GitHub.
