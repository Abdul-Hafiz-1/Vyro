# VYRO System Inventory & Surface Map

**Date**: 2026-11-09  
**Reviewer**: Autonomous Product Reviewer & Senior Engineer  
**Scope**: Full-stack inventory of all routes, pages, components, interactive controls, forms, modals, menus, API endpoints, background timers, and settings.

---

## 1. Application Routes

| Path | Component | Auth Required | Purpose / Job |
| :--- | :--- | :--- | :--- |
| `/` | `LandingPage` | No | Public landing page explaining autonomous commerce, value proposition, and entry points. |
| `/how-it-works` | `HowItWorksPage` | No | Educational walkthrough of AI-to-AI search, multi-issue negotiation, human exception handling, and settlement. |
| `/security` | `SecurityPage` | No | Technical assurance page detailing multi-user isolation, private value secrecy, policy gates, and PayPal security. |
| `/login` | `LoginPage` | No | Authentication form for returning users (email & password). |
| `/signup` | `SignupPage` | No | Registration form for new users creating an isolated account. |
| `/onboarding` | `OnboardingPage` | Yes | First-time setup guiding new users through role preferences and default safety rules. |
| `/app` | `OverviewPage` | Yes | Today / Executive Dashboard: active deals, urgent review queue items, KPI metrics, recent activity. |
| `/app/deals` | `NegotiationsListPage` | Yes | Cockpit of all commercial negotiations (All, Needing Review, Active, Concluded, Declined). |
| `/app/deals/:id` | `NegotiationDetailPage` | Yes | Deep negotiation cockpit: transcripts, multi-issue price ladder, policy evaluations, approval/decline/appeal actions, PayPal/mock checkout. |
| `/app/requests/new` | `RequestCreatePage` | Yes | Buyer request creation form with budget limits, turnaround expectations, and immediate AI matchmaking. |
| `/app/marketplace` | `ListingsPage` | Yes | Public catalogue of services available for purchase from other network sellers. |
| `/app/listings` | `ListingsPage` | Yes | Seller management view: user's published service listings and draft controls. |
| `/app/listings/new` | `ListingEditorPage` | Yes | Creator for new service offerings (title, category, standard price, confidential floor, turnaround, deliverables). |
| `/app/listings/:id` | `ListingEditorPage` | Yes | Editor for existing service offerings. |
| `/app/rules` | `MemoryPage` | Yes | Human-in-the-loop governance: auto-approval price thresholds, daily spend caps, global automation pause switch, custom rules. |
| `/app/transactions` | `TransactionsPage` | Yes | Commercial ledger of completed purchases and sales, tracking payment status and escrow settlement. |
| `/app/transactions/:id` | `TransactionDetailPage`| Yes | Detailed commercial receipt and audit proof of completed transaction. |
| `/app/notifications` | `NotificationsPage` | Yes | System alerts, exception alerts, and deal status updates. |
| `/app/settings` | `SettingsPage` | Yes | Technical integration center: Google Gemini live status/latency, PayPal Sandbox health probe, server env security. |
| `/app/network` | `NetworkPage` | Yes | Agent directory & network visualizer (legacy/exploration view). |
| `/app/agents` | `AgentsPage` | Yes | User's autonomous agent representatives roster. |
| `/app/agents/new` | `AgentCreatePage` | Yes | Agent customization and role setup form. |
| `/app/analytics` | `AnalyticsPage` | Yes | Procurement savings, negotiation cycle velocity, and auto-approval rate metrics. |

---

## 2. Pages & Views Breakdown

### 2.1 Public Pages
1. **LandingPage (`/`)**:
   - **Hero Section**: Headline ("Autonomous AI Commerce Network"), subheadline, CTAs ("Start Buying", "Start Selling", "Watch How It Works"), hero graphic.
   - **Marketplace Overview / Value Proposition**: 4 key capabilities (Autonomous Matchmaking, Multi-Issue Negotiation, Human Exception Gate, Instant Settlement).
   - **Architecture & Security Teaser**: Visual summary of private budget floors and cryptographic cookie sessions.
   - **Footer**: Links to security, documentation, terms, privacy, and GitHub.
2. **HowItWorksPage (`/how-it-works`)**:
   - Step-by-step breakdown: Post Request -> AI Negotiation -> Exception Review -> Instant Settlement.
   - Interactive flow diagram comparing traditional marketplaces vs autonomous agent protocols.
3. **SecurityPage (`/security`)**:
   - Hard privacy guarantees: Buyer ceiling secrecy, Seller floor secrecy, Argon2/bcrypt password hashing, SameSite httpOnly cookies.
   - Decision Engine rule matrix explaining Auto-Approve, Human Review, and Auto-Decline conditions.
4. **AuthPages (`/login` & `/signup`)**:
   - Clean authentication card with email, password, and display name inputs.
   - Error alert banner for invalid credentials or email collisions.
   - Direct toggles between Sign In and Sign Up.
5. **OnboardingPage (`/onboarding`)**:
   - Stepper wizard: Step 1 (Identify primary intent: Buying vs Selling), Step 2 (Default approval rules preview), Step 3 (Confirmation & route to dashboard).

### 2.2 App Core Pages
1. **OverviewPage (`/app`)**:
   - **Review Queue Banner**: Prominent warning card if any deal requires human attention (e.g. price > $200 or custom scope).
   - **Quick Action Bar**: "Post a Request", "Create a Listing", "Configure Rules".
   - **Active Negotiations Widget**: Real-time status cards of active negotiations with progress indicators.
   - **KPI Metrics Ribbon**: Total Spent/Earned, Active Deals, Time Saved, Auto-Approval Rate.
   - **Autonomous Activity Stream**: Live feed of agent decisions, offers sent, counter-proposals evaluated.
2. **NegotiationsListPage (`/app/deals`)**:
   - **Filter Tabs**: All Deals, Needing Review (Action Required), In Progress, Concluded, Declined.
   - **Search Input**: Keyword filter across deal titles, counterparties, and categories.
   - **Deal Cards**: Counterparty agent name, service title, current agreed price, delivery days, status badge, "Open Cockpit" CTA.
3. **NegotiationDetailPage (`/app/deals/:id`)**:
   - **Deal Cockpit Header**: Counterparty avatar, service title, creation date, status pill.
   - **Exception Action Banner**: Appears when status is `escalated_to_human` or `auto_declined`. Contains buttons: "Approve Deal", "Counteroffer", "Decline Deal", "Submit Appeal".
   - **Payment Action Section**: Appears when deal is approved and pending payment. Includes `@paypal/react-paypal-js` button and Mock Settlement fallback button.
   - **Transcript Timeline (`ConversationalTurns`)**: Chronological chat bubbles of agent messages, rationale, and concessions.
   - **Package Offer Breakdown (`PriceLadder`)**: Visual comparison of Initial Offer vs Current Offer across Price, Delivery Time, Revisions, Scope, and Terms.
   - **Evaluator Breakdown (`EvaluatorBreakdown`)**: Decision Engine diagnostic scores (Utility score, Policy compliance check, Budget deviation check).
   - **Inspection Drawer (`InspectDetailsDrawer`)**: Raw audit metadata, agent IDs, and message hashes for compliance.
4. **RequestCreatePage (`/app/requests/new`)**:
   - **Requirement Input**: Natural language text area describing required service.
   - **Target Budget**: Maximum ceiling budget in USD.
   - **Required Delivery**: Maximum acceptable delivery days.
   - **Scope Checklist**: Must-have deliverables.
   - **Auto-Match Button**: Submits request, instantly searches active marketplace listings, triggers agent negotiation.
5. **ListingsPage (`/app/listings` & `/app/marketplace`)**:
   - **Mode Switch**: "Marketplace" (browse others' listings) vs "My Listings" (manage own published services).
   - **Listing Grid**: Service cards with pricing, delivery days, category tag, rating, and action ("Buy with AI" or "Edit Listing").
   - **Create Listing CTA**: Prominent button directing to editor.
6. **ListingEditorPage (`/app/listings/new` & `/app/listings/:id`)**:
   - Service Title, Category selector, Description.
   - Standard Asking Price ($).
   - **Confidential Floor Price ($)**: Explicitly labeled with lock icon ("Counterparties and their agents cannot see this").
   - Standard Turnaround (Days).
   - Deliverables / Scope list builder.
7. **MemoryPage (`/app/rules`)**:
   - **Global Automation Pause Switch**: Emergency master kill-switch routing 100% of deals to human review.
   - **Auto-Approval Threshold**: Numeric input (Default: $200). Deals below this auto-execute if within policy.
   - **Daily Budget Cap**: Numeric input (Default: $500). Max spend per 24 hours.
   - **Custom Human Rules List**: Add/edit custom natural-language or structured constraints (e.g. "Never accept turnaround > 5 days").
8. **TransactionsPage (`/app/transactions`)**:
   - Filterable ledger of all settled transactions.
   - Displays Date, Description, Role (Buyer / Seller), Amount ($), Payment Provider (PayPal / Mock), Status (Settled / Held in Escrow).
   - Link to printable Transaction Detail receipt.
9. **TransactionDetailPage (`/app/transactions/:id`)**:
   - Formal invoice / commercial receipt.
   - Transaction ID, Order reference ID, PayPal Capture ID / Mock Reference, Timestamps, Itemized scope, Buyer & Seller IDs.
10. **NotificationsPage (`/app/notifications`)**:
    - List of system notifications (Escalations, Deal closures, Payments settled).
    - Unread badges, "Mark All as Read" button.
11. **SettingsPage (`/app/settings`)**:
    - AI Engine Diagnostic Center: Live Gemini connection probe, latency indicator, model name.
    - Payments Diagnostic Center: PayPal Sandbox OAuth token probe, PayPal-Debug-Id inspect, Sandbox connection badge.
    - Security Notice: Server-side environment variable posture.

---

## 3. Modals, Drawers & Overlays

1. **`HumanApprovalModal`**:
   - **Trigger**: "Review & Decide" button on escalated deal or review queue.
   - **Contents**: Summary of negotiated terms, policy deviation warning (e.g. "Price of $240 exceeds your $200 auto-approval rule by $40"), counterparty rationale.
   - **Actions**: "Approve & Authorize Payment", "Request Counteroffer", "Reject Deal".
2. **`InspectDetailsDrawer`**:
   - **Trigger**: "Inspect Raw Decision Data" on negotiation page.
   - **Contents**: Full JSON telemetry, utility function coefficients, soft-floor activation logs, ZOPA calculation proofs.
3. **`AgentDetailModal`**:
   - **Trigger**: Clicking an agent card in network view.
   - **Contents**: Agent capabilities, pricing strategy, verification badges.

---

## 4. Navigation & Layout Controls

1. **`Navbar` (Desktop & Mobile)**:
   - VYRO Brand Logo & link to `/app`.
   - Primary Navigation:
     - "Overview" (`/app`)
     - "Deals" (`/app/deals`) with badge for pending reviews
     - "Marketplace" (`/app/marketplace`)
     - "My Listings" (`/app/listings`)
     - "Rules" (`/app/rules`)
     - "Transactions" (`/app/transactions`)
   - Utility Controls:
     - Notifications Bell with unread counter
     - Dark / Light Theme Toggle (`ThemeToggle`)
     - User Profile Menu: Display name, user email, link to Settings (`/app/settings`), Sign Out button.
2. **`WorkspaceSwitcher`**:
   - Dropdown allowing dual-role accounts to toggle between Buying view and Selling view context.
3. **Mobile Drawer**:
   - Slide-out responsive menu containing all navigation links for screens $\le 768$px.

---

## 5. Forms & Interactive Inputs

| Form | Fields | Validation Rules | Primary Action |
| :--- | :--- | :--- | :--- |
| **Login** | Email, Password | Required, valid email format | "Sign In" |
| **Registration** | Display Name, Email, Password | Min 8 chars, mixed case + special char | "Create Account" |
| **Procurement Request** | Title, Description, Max Budget ($), Max Days, Deliverables | Title $\ge 3$ chars, Budget $> 0$, Days $\ge 1$ | "Deploy Buyer Agent" |
| **Service Listing** | Title, Category, Description, List Price ($), Floor Price ($), Turnaround Days, Scope | Title required, List Price $\ge$ Floor Price $> 0$ | "Publish Listing" |
| **Rule / Constraint** | Rule Type (Price / Delivery / Category / Policy), Description, Threshold Value | Required, positive number if numeric | "Save Rule" |
| **Appeal Request** | Justification Note | Min 10 chars | "Submit Appeal for Human Review" |
| **Counteroffer Input** | Counter Price ($), Counter Delivery Days, Note | Positive values within bounds | "Send Counteroffer" |

---

## 6. API Endpoints

### 6.1 Authentication (`/api/v1/auth`)
- `POST /register`: Create user account, hash password with bcrypt, issue signed session cookie.
- `POST /login`: Authenticate credentials, issue signed session cookie.
- `POST /logout`: Invalidate session on server, clear cookie.
- `GET /me`: Return authenticated user object (requires valid session cookie).
- `PATCH /profile`: Update profile info (displayName, bio, avatarUrl).
- `PATCH /settings`: Update user autoApprovalLimit, dailyBudgetCap, isAutomationPaused.

### 6.2 Service Listings (`/api/v1/listings`)
- `GET /`: Query marketplace listings (filters: category, search, sellerId).
- `GET /my`: Return session user's owned listings.
- `GET /:id`: Return single listing details.
- `POST /`: Create new listing owned by session user.
- `PUT /:id`: Update owned listing (404 if not owned).
- `DELETE /:id`: Remove owned listing (404 if not owned).

### 6.3 Buyer Requests (`/api/v1/requests`)
- `GET /`: Return session user's procurement requests.
- `GET /:id`: Return single request (404 if not owned).
- `POST /`: Create new procurement request and trigger auto-negotiation pipeline.
- `DELETE /:id`: Cancel procurement request.

### 6.4 Negotiations & Deals (`/api/v1/negotiations`)
- `GET /`: Return deals where session user is either Buyer or Seller.
- `GET /:id`: Return deal cockpit view with strict projection: Buyer never sees seller floor; Seller never sees buyer ceiling.
- `POST /:id/respond`: Send human counteroffer or message.
- `POST /:id/approve`: Human approve an escalated deal.
- `POST /:id/decline`: Human decline an escalated deal.
- `POST /:id/appeal`: Appeal an auto-declined deal to reopen evaluation.
- `POST /:id/simulate`: Trigger automated next-round negotiation simulation.

### 6.5 Payments & Escrow (`/api/v1/payments`)
- `GET /health`: Admin/dev health probe verifying PayPal Sandbox OAuth token.
- `POST /create-order`: Server creates PayPal Orders v2 with intent CAPTURE, amount derived strictly from agreement, gated on buyer session & decision approval.
- `POST /capture-order`: Server captures authorized PayPal order upon `onApprove` event, credits seller internal ledger.
- `POST /mock-settle`: Instant simulated settlement for offline/mock development mode.

### 6.6 Transactions & Receipts (`/api/v1/transactions`)
- `GET /`: Return user's settled transactions.
- `GET /:id`: Return itemized commercial transaction receipt.

### 6.7 Rules & Memory (`/api/v1/memory`)
- `GET /`: Return user's custom commercial rules and constraints.
- `POST /`: Add new commercial constraint.
- `PUT /:id`: Update constraint.
- `DELETE /:id`: Remove constraint.

### 6.8 Notifications (`/api/v1/notifications`)
- `GET /`: Return notifications for session user.
- `PATCH /:id/read`: Mark single notification read.
- `POST /read-all`: Mark all notifications read.

### 6.9 System Diagnostics (`/api/v1/system`)
- `GET /status`: Health, environment, and provider modes.
- `GET /ai-status`: Gemini model connectivity, latency, and status.
- `POST /test-ai`: Execute test prompt to verify active Gemini API key.

### 6.10 Dashboard & Real-Time (`/api/v1/home`, `/api/v1/events`)
- `GET /home`: Aggregated dashboard payload for session user.
- `GET /events/stream`: Server-Sent Events (SSE) feed with 15-second heartbeat.

---

## 7. Background Timers & Jobs

1. **SSE Heartbeat Timer** (`server/src/routes/events.ts:42`):
   - Periodic 15-second `setInterval` sending ping comments (`: heartbeat\n\n`) to keep SSE connection alive across browser proxies.

---

## 8. Settings, Rules & Safety Controls

1. **Auto-Approval Limit** (`autoApprovalLimit`):
   - Numeric dollar threshold (default $200). If agreed price $\le$ threshold and all other policy criteria pass, transaction auto-approves.
2. **Daily Budget Cap** (`dailyBudgetCap`):
   - Max spend ceiling in a rolling 24-hour window (default $500). Any deal exceeding this is forcibly escalated to human review.
3. **Global Automation Pause Switch** (`isAutomationPaused`):
   - Master kill-switch. When enabled, agent auto-approval is completely disabled and all deals require manual human confirmation.
4. **AI Model Selection & API Keys**:
   - Server-only `.env` storage (`GEMINI_API_KEY`). Browser never handles raw credentials.
5. **Payment Provider Switch**:
   - `PAYMENT_PROVIDER=paypal|mock` controlling whether checkout triggers live PayPal Sandbox popup or local simulation.
