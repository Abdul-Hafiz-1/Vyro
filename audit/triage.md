# VYRO Product Triage Matrix (Phase 1)

**Date**: 2026-11-09  
**Product Promise Standard**:  
*"VYRO is a marketplace where AI agents search, negotiate, decide and pay on behalf of real people. Humans only handle exceptions and rejections. If an element doesn't help a person (1) start a request or listing, (2) trust what the AI is doing, (3) handle an exception, or (4) see the outcome, it is a candidate for deletion."*

**Triage Categories**:
- `KEEP`: Real, needed, works, well-placed.
- `CUT`: Fake, decoration, confusing, developer clutter, or serves none of the 4 jobs. Delete completely.
- `HIDE`: Real and needed, but for advanced diagnostics only. Disclose on demand or tuck away.
- `MERGE`: Redundant / duplicate functionality. Consolidate into the single best location.
- `FIX`: Essential to the 4 jobs, but currently broken or buggy. Fix in Phase 2.
- `REWRITE`: Essential, but wording is technical jargon or confusing. Clarify in Phase 3.

---

## 1. Application Routes & Pages

| Route / Item | Job Served | Real? | Working? | Verdict | Justification & Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LandingPage (`/`)** | 1. Start | Yes | Yes | `KEEP` | Primary entry point explaining value proposition to first-time buyers and sellers. |
| **HowItWorksPage (`/how-it-works`)** | 2. Trust | Yes | Yes | `KEEP` | Explains autonomous search, multi-issue bargaining, and human approval gates. |
| **SecurityPage (`/security`)** | 2. Trust | Yes | Yes | `KEEP` | Proves privacy isolation (buyer ceiling & seller floor secrecy) and PayPal security. |
| **LoginPage (`/login`)** | 1. Start | Yes | Yes | `KEEP` | Standard cookie session authentication for returning users. |
| **SignupPage (`/signup`)** | 1. Start | Yes | Yes | `KEEP` | User registration creating isolated account with default safety rules. |
| **OnboardingPage (`/onboarding`)** | 1. Start | Yes | Yes | `REWRITE` | Good concept but text contains technical jargon. Rewrite to focus on buyer/seller intent. |
| **OverviewPage (`/app`)** | 2, 3, 4 | Yes | Yes | `KEEP` | Core dashboard for exception handling (Review Queue), active deals, and recent results. |
| **NegotiationsListPage (`/app/deals`)** | 2, 3, 4 | Yes | Yes | `KEEP` | Central cockpit of all commercial negotiations and review requirements. |
| **NegotiationDetailPage (`/app/deals/:id`)** | 2, 3, 4 | Yes | Partial | `FIX` | Essential deal cockpit. Broken direct approval and missing appeal action must be fixed in Phase 2. |
| **RequestCreatePage (`/app/requests/new`)** | 1. Start | Yes | Yes | `KEEP` | Core buyer procurement entry point. |
| **Marketplace (`/app/marketplace`)** | 1. Start | Yes | Yes | `KEEP` | Core catalog of seller services available for procurement. |
| **ListingsPage (`/app/listings`)** | 1. Start | Yes | Partial | `FIX` | Essential seller management page. Shadowed `/listings/my` route must be fixed in Phase 2. |
| **ListingEditorPage (`/app/listings/new`, `/:id`)** | 1. Start | Yes | Yes | `KEEP` | Core seller service creator with private floor protection. |
| **RulesPage (`/app/rules`)** | 2, 3 | Yes | Yes | `KEEP` | Core human governance: auto-approval limits, daily spend cap, emergency pause switch. |
| **TransactionsPage (`/app/transactions`)** | 4. Outcome | Yes | Yes | `KEEP` | Commercial ledger tracking settled payments, escrow holds, and orders. |
| **TransactionDetailPage (`/app/transactions/:id`)**| 4. Outcome | Yes | Yes | `KEEP` | Itemized invoice and commercial proof for accounting. |
| **NotificationsPage (`/app/notifications`)** | 3. Exception | Yes | Yes | `KEEP` | Alerts for human review requirements and deal conclusions. |
| **SettingsPage (`/app/settings`)** | System | Yes | Yes | `HIDE` | Developer diagnostics (Gemini latency, PayPal OAuth probes) must be tucked behind Advanced toggle. |
| **NetworkPage (`/app/network`)** | None | Semi | No | `CUT` | Legacy visualizer showing force-directed nodes. Decorative eye candy that serves none of the 4 jobs. |
| **AgentsPage (`/app/agents`)** | None | Redundant| No | `CUT` | In VYRO, agents represent user rules (set in Rules). Creating separate agent personas confuses ownership. |
| **AgentCreatePage (`/app/agents/new`)** | None | Redundant| No | `CUT` | Unnecessary separate entity creation. Merged with Rules and User Profile. |
| **AnalyticsPage (`/app/analytics`)** | 4. Outcome | Semi | No | `CUT` | Vanity graphs and simulated metrics. Real outcomes belong directly in Overview and Transactions. |
| **Route Alias `/app/negotiations*`** | None | Duplicate| Yes | `MERGE` | Duplicate route alias. Redirect permanently to `/app/deals*`. |
| **Route Alias `/app/memory`** | None | Duplicate| Yes | `MERGE` | Duplicate route alias. Redirect permanently to `/app/rules`. |

---

## 2. Components & UI Sub-views

| Component | Job Served | Real? | Working? | Verdict | Justification & Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`NetworkVisualizer`** | None | No | No | `CUT` | Canvas physics simulation of agent nodes. Distracts from commerce. Delete file. |
| **`NegotiationArena`** | None | No | No | `CUT` | Legacy mock negotiation playground with simulated rounds. Delete file. |
| **`HumanCompactShowcase`**| None | No | No | `CUT` | Static marketing demo component in app code. Delete file. |
| **`InspectDetailsDrawer`**| 2. Trust | Yes | Yes | `HIDE` | Full JSON logs and utility curves. Move behind quiet "Audit Telemetry" link on deal page. |
| **`PriceLadder`** | 2. Trust | Yes | Yes | `KEEP` | Visual breakdown of package deal (price, delivery, deliverables, revisions). |
| **`ConversationalTurns`**| 2. Trust | Yes | Yes | `KEEP` | Verifiable transcript of AI agent dialogue and concessions. |
| **`EvaluatorBreakdown`** | 2. Trust | Yes | Yes | `KEEP` | Explains why deal was approved, escalated, or declined against policy rules. |
| **`HumanApprovalModal`** | 3. Exception | Yes | Yes | `KEEP` | Core modal allowing human to approve deal, submit counteroffer, or decline. |
| **`PayPalCheckoutButton`**| 4. Outcome | Yes | Yes | `KEEP` | Orders v2 button with popup approval and server capture settlement. |
| **`WorkspaceSwitcher`** | 1. Start | Yes | Yes | `MERGE` | Dropdown in navbar switcher. Simplify into clear Buying / Selling tabs in nav. |
| **`ThemeToggle`** | Polish | Yes | Yes | `KEEP` | Supports clean dark and light mode rendering. |
| **`Badge` & `Button`** | Primitive | Yes | Yes | `KEEP` | Foundational design system atoms. |

---

## 3. Interactive Buttons, Forms & Action Controls

| Action / Button | Location | Job | Verdict | Justification & Action |
| :--- | :--- | :--- | :--- | :--- |
| **"Structure with AI"** | RequestCreatePage | 1. Start | `KEEP` | Parses plain English brief into structured requirements using Gemini. |
| **"Deploy Buyer Agent"**| RequestCreatePage | 1. Start | `FIX` | Submits request and triggers auto-match. Currently breaks when `sellerIds` missing. Fix in Phase 2. |
| **"Publish Listing"** | ListingEditorPage | 1. Start | `KEEP` | Saves listing with protected confidential floor price. |
| **"Review & Decide"** | Overview / Deals | 3. Exception | `KEEP` | Primary CTA opening HumanApprovalModal. |
| **"Approve Deal"** | Deal Detail Cockpit | 3. Exception | `FIX` | Currently missing direct server route. Fix in Phase 2. |
| **"Appeal Decision"** | Deal Detail Cockpit | 3. Exception | `FIX` | Currently completely absent for auto-declined deals. Add in Phase 2. |
| **"Emergency Pause"** | RulesPage | 3. Exception | `KEEP` | Master kill-switch routing 100% of transactions to human review. |
| **"Test Live Call"** | SettingsPage | System | `HIDE` | Developer probe. Tuck inside Advanced developer disclosure. |
| **"Simulate Turn"** | NegotiationsListPage | None | `CUT` | Leftover testing button. Deleting prevents fake manual progression. |

---

## 4. API Endpoints

| Endpoint | Job | Verdict | Action |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/auth/register` | 1. Start | `KEEP` | Retain Argon2/bcrypt cookie auth. |
| `POST /api/v1/auth/login` | 1. Start | `KEEP` | Retain cookie auth. |
| `POST /api/v1/auth/logout` | 1. Start | `KEEP` | Retain session teardown. |
| `GET /api/v1/auth/me` | 1. Start | `KEEP` | Retain session check. |
| `POST /api/v1/requests` | 1. Start | `KEEP` | Retain procurement creation. |
| `POST /api/v1/negotiations/multi-agent` | 1. Start | `FIX` | Make `sellerIds` optional with automatic listing matchmaking. |
| `GET /api/v1/listings/my` | 1. Start | `FIX` | Mount before `GET /listings/:id` to eliminate route shadowing. |
| `POST /api/v1/negotiations/:id/approve` | 3. Exception | `FIX` | Add direct approval handler on negotiations route. |
| `POST /api/v1/negotiations/:id/appeal` | 3. Exception | `FIX` | Add appeal handler to reopen auto-declined deals. |
| `GET /api/v1/payments/health` | 2. Trust | `KEEP` | Retain PayPal sandbox probe. |
| `POST /api/v1/payments/create-order` | 4. Outcome | `KEEP` | Retain Orders v2 intent CAPTURE creation. |
| `POST /api/v1/payments/capture-order` | 4. Outcome | `KEEP` | Retain server capture on popup `onApprove`. |
| `GET /api/v1/network` & `/agents` | None | `CUT` | Remove dead endpoints for deleted network visualizer and duplicate agent entities. |
| `GET /api/v1/analytics` | None | `CUT` | Remove fake time-saved analytics endpoint. |
| `GET /api/v1/activity` | None | `MERGE` | Fold activity records into Overview `/home` endpoint. |
