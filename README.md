# VYRO — The AI-Operated Marketplace

> **AI handles everything automatically. Humans handle ONLY exceptions and rejections.**  
> The Needs-you queue is the product. Everything else supports it.

![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passing-brightgreen?style=flat-square)
![Database](https://img.shields.io/badge/Database-SQLite%20(Single%20Source)-003B57?style=flat-square)
![Design System](https://img.shields.io/badge/Tokens-WCAG%20AA%20Compliant-4C7DF0?style=flat-square)
![Payments](https://img.shields.io/badge/Payments-PayPal%20Sandbox%20API-0070BA?style=flat-square)

---

## 1. Product Truth & Core Model

Traditional marketplaces burden users with endless directory browsing, proposal haggling, and manual sign-offs.

VYRO is an autonomous commercial network where:
1. **AI handles 90% of commerce**: Autonomous buyer and seller agents discover requirements, negotiate multi-round concessions on price and deliverables, evaluate competing bids, and settle payment automatically when conditions hold.
2. **Humans handle the 10% exceptions**: A human is pulled in **ONLY** for:
   - (a) Exceptions the AI cannot safely decide (e.g. price ceiling exceeded, daily spend cap reached, or seller floor impasse).
   - (b) Rejections they may want to overturn or appeal.

The best session in VYRO is one where the user opens the application, reads **"Everything is handled"**, and leaves.

---

## 2. System Architecture & Decisions

```
           [ Human Principal ]
                   │ (natural brief / exceptions only)
                   ▼
       [ Autonomous Buyer Agent ]  <─── PRIVATE: Max Budget ($350)
                   │
                   ▼  (schema-validated counteroffers)
       [ Autonomous Seller Agent ] <─── PRIVATE: Floor Price ($150)
                   │
                   ▼
        [ Decision Engine ]
          ├── AUTO-APPROVE   ──> [ PayPal Sandbox Capture ] (Idempotent)
          ├── AUTO-DECLINE   ──> [ Plain Reason + Appeal ]
          └── ESCALATE       ──> [ Needs-You Review Queue ] (One-click)
```

### 2.1 The Decision Engine
Server-enforced decision policy (`server/src/services/decision/engine.ts`):
- **AUTO-APPROVE**: Price $\le$ buyer ceiling, $\ge$ seller floor, seller verified, deterministic confidence $\ge 0.85$, amount $\le$ auto-approval limit ($200 default), and daily spend cap ($500 default) not exceeded.
- **AUTO-DECLINE**: Clear rule or prohibited category violation with plain-language explanation and an appeal button.
- **ESCALATE**: Everything else routes to the **Needs-you queue** sorted by urgency.
- **Global Pause Switch**: When enabled, immediately routes all transactions to the human review queue.

### 2.2 Privacy Canary & Injection Defense
- **Zero Budget Leaks**: Counterparties receive only their own principal's private constraints. Buyer max budgets and seller price floors are technically barred from prompts, counterparty messages, and API responses.
- **Automated Canary Tests**: Suite fails if any private canary value or number-format variant leaks in counterparty-visible output.
- **Untrusted Message Containment**: Counterparty inputs are quarantined within strict boundary tags (`<<<UNTRUSTED_COUNTERPARTY_MESSAGE>>>`) to neutralize prompt injection attacks.
- **Deterministic Confidence**: Scores are computed mathematically from verified seller badges, ratings, and price variance—never self-reported by the model.

### 2.3 Server-Enforced Idempotent Payments
- Client code has zero financial authority.
- The PayPal capture endpoint independently verifies that `Decision.status ∈ {'auto_approved', 'human_approved'}` and checks spend limits on the server before invoking the PayPal Sandbox API.
- Re-executing an existing transaction is fully idempotent.

---

## 3. Workspaces & Information Architecture

VYRO separates responsibilities into two distinct workspaces (switched via the account menu):
- **Buying Workspace**: `Today · Deals · Marketplace · Rules`
- **Selling Workspace**: `Today · Listings · Deals · Rules`

### Key Screens
- **Today (`/app`)**: Shows current status in one sentence (*"Everything is handled"* or *"2 things need your decision"*), followed by the **Needs-you queue**, in-progress deals, and a 7-day handled ledger.
- **Deal Detail (`/app/deals/:id`)**: Renders the horizontal converging price ladder, autonomous dialogue stream, commercial terms, and bottom persistent decision action bar.
- **New Request (`/app/requests/new`)**: Single purchasing entry point with natural language brief input, AI structuring, and multi-agent parallel dispatch.
- **Marketplace (`/app/marketplace`)**: Directory of verified autonomous specialist agents and active service catalog.
- **Rules (`/app/rules`)**: Centralized management of auto-approval ceilings, daily spend caps, global pause switch, and override policy suggestions.
- **Onboarding (`/onboarding`)**: Focused 3-step skippable onboarding flow (Workspace $\to$ Decision Limits $\to$ Agent Stance).

---

## 4. Local Setup & Quickstart

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)
- npm 9+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/vyro.git
cd vyro

# Install dependencies
npm install
npm --prefix client install
npm --prefix server install
```

### Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```
Key variables:
```ini
PORT=4000
NODE_ENV=development
SQLITE_DB_PATH=vyro.db
AUTO_APPROVE_LIMIT_DEFAULT=200
DAILY_BUDGET_CAP_DEFAULT=500
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash

# PayPal Developer Sandbox (Orders v2 API)
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
```

---

## 5. PayPal Sandbox Setup & Manual Dashboard Steps

To test real PayPal checkouts end to end in the sandbox environment:

### Step 1: Create a Sandbox REST App in PayPal Developer Dashboard
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Navigate to **Apps & Credentials** and ensure the toggle is set to **Sandbox**.
3. Click **Create App**:
   - **App Name**: `VYRO Marketplace Sandbox`
   - **App Type**: `Merchant`
4. Copy the generated **Client ID** and **Secret**:
   - In `.env` (server root):
     ```ini
     PAYPAL_ENV=sandbox
     PAYPAL_CLIENT_ID=<your_sandbox_client_id>
     PAYPAL_CLIENT_SECRET=<your_sandbox_client_secret>
     VITE_PAYPAL_CLIENT_ID=<your_sandbox_client_id>
     ```
   - In `client/.env` (client root):
     ```ini
     VITE_PAYPAL_CLIENT_ID=<your_sandbox_client_id>
     ```

### Step 2: Set Up Sandbox Test Accounts
1. In the PayPal Developer Dashboard sidebar, click **Testing Tools** > **Sandbox Accounts**.
2. PayPal automatically provides:
   - **Platform Business Account**: Merchant account where all captured funds are deposited (receives buyer payments).
3. Create or inspect a **Personal (Buyer) Sandbox Account**:
   - Click **Create Account** > select **Personal (Buyer Account)**.
   - Note the auto-generated **Email ID** (e.g. `sb-buyer123@personal.example.com`) and **System Generated Password** (viewable under `...` > *View/Edit account*).

### Step 3: Which Account to Use at Checkout
- When a deal is approved and you click the gold **PayPal** checkout button in VYRO, the secure PayPal popup window opens.
- **Log in strictly using the Sandbox Personal Account** (`sb-buyer...@personal.example.com` + sandbox password).
- Review the transaction terms ($ amount formatted to 2 decimals) and click **Complete Purchase**.
- The popup closes automatically, and VYRO's server securely captures the authorized order, records the seller's share in the internal ledger, and updates the deal to completed.

---

## 6. Payment Troubleshooting

| Issue / Error Code | Root Cause | Solution / Next Step |
| :--- | :--- | :--- |
| `ORDER_NOT_APPROVED` (422) | The buyer closed the popup before clicking "Complete Purchase", or the frontend attempted capture before `onApprove`. | Keep the PayPal popup open until authorization finishes. VYRO's integration now strictly gates server capture on the `onApprove` event. |
| `INSTRUMENT_DECLINED` (400) | The sandbox buyer wallet funding source or test credit card was declined. | Open [Developer Dashboard > Sandbox Accounts](https://developer.paypal.com/dashboard/accounts), edit your Personal account, and top up the sandbox balance or add a fresh test credit card. |
| `AUTHENTICATION_FAILURE` (401) | Mismatched `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET`, or live credentials configured in sandbox mode. | Verify that credentials belong to a Sandbox REST app. Test connectivity via **Settings > Advanced > Payments Sandbox Connectivity** in the app. |
| `PAYER_ACTION_REQUIRED` (400) | PayPal sandbox triggered an additional fraud check or phone verification challenge. | Follow the verification prompt presented inside the PayPal popup window. |
| `UNPROCESSABLE_ENTITY` (422) | Malformed amount, invalid currency code, or mismatched currency. | Ensure amount has strictly two decimals (e.g. `150.00`) and currency is `USD`. VYRO automatically formats all commercial figures server-side. |
| `DAILY_CAP_EXCEEDED` (400) | Buyer's cumulative daily spending exceeded their configured limit (default: $500). | Go to **Settings > Rules** and increase the daily budget cap. |

### Health Check Diagnostic Tool
Admins and developers can test PayPal sandbox connectivity at any time:
- In the UI: Navigate to **Settings > Advanced** and click **Check** next to `Payments Sandbox Connectivity`.
- Via API: Run `curl http://localhost:4000/api/v1/payments/health` to verify token issuance and retrieve your PayPal Application ID.

### Running the Application
```bash
# Start backend server (Express + SQLite migrations on port 4000)
npm run dev:server

# In a separate terminal, start client (Vite on port 5173)
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Automated Verification & Tests

Run the privacy canary and decision engine test suite:
```bash
npx tsx --test server/test/privacy_and_decision.test.ts
```

All 8 tests execute against SQLite and verify:
1. `Privacy: Buyer private budget ceiling never leaks to counterparty`
2. `Privacy: Seller operational floor price never leaks in counterparty messages`
3. `Decision Policy: AUTO-APPROVE when all strict conditions hold`
4. `Decision Policy: AUTO-DECLINE on prohibited category or extreme price deviation`
5. `Early Exit: Escalates when seller floor > buyer max budget`
6. `Global Pause Switch: Routes all transactions to Review Queue when paused`
7. `Seller-Side Exception Rules: Auto-accept vs Escalation`
8. `Server-Enforced Payment: Rejects unapproved decisions & enforces idempotency`

Build typecheck:
```bash
# Client build
npm --prefix client run build

# Server build
npm --prefix server run build
```

---

## 6. License
MIT License. Built for autonomous commerce.
