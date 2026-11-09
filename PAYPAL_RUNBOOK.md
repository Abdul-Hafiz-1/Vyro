# VYRO — PayPal Developer Sandbox Runbook

## Overview
VYRO uses the PayPal REST Orders v2 API with digital escrow authorizations (`intent: 'CAPTURE'`).

This document provides exact instructions for testing and verifying PayPal Sandbox transactions end-to-end, logging into the PayPal popup, finding test accounts, and troubleshooting common issues.

---

## 1. Sandbox Accounts & Dashboard Location

To locate or generate Sandbox test accounts:
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/).
2. In the left-hand navigation, click **Testing Tools** > **Sandbox Accounts**.
3. You will see two pre-configured account types:
   - **Personal Account** (Buyer): Used by the tester to log in during the checkout popup and authorize payment.
   - **Business Account** (Merchant/Seller): The recipient account configured with the App credentials.

### Default Sandbox Credentials Configured in VYRO
- **Environment**: `sandbox` (`https://api-m.sandbox.paypal.com`)
- **Client ID**: Configured via `PAYPAL_CLIENT_ID` in `.env` and `VITE_PAYPAL_CLIENT_ID`.
- **Client Secret**: Configured via `PAYPAL_CLIENT_SECRET` in `.env` (server-side only, never bundled in the frontend).

---

## 2. Which Account to Log into During Checkout Popup

> **CRITICAL RULE**: 
> In PayPal Sandbox, you **MUST NEVER log into the checkout popup using the seller/merchant account credentials**. PayPal strictly rejects self-payment ("Account cannot pay itself") or triggers international regulation blocks.

### Step-by-Step Checkout Instructions:
1. Ensure you are signed in to VYRO as the **Buyer** (`demo.buyer@example.com` or your buyer account).
2. Navigate to your agreed deal (`/app/deals/:id`).
3. Click the yellow **PayPal** button.
4. When the PayPal popup window opens:
   - **Enter your Sandbox Personal (Buyer) Email** (from Developer Dashboard > Sandbox Accounts, or create a Personal sandbox account).
   - **Enter the Sandbox Password**.
5. Select a sandbox payment method (PayPal Balance, Test Visa/Mastercard).
6. Click **Complete Purchase** or **Pay Now**.
7. The popup closes automatically, and VYRO records:
   - PayPal Order ID
   - PayPal Capture ID
   - Escrow lock status
   - An itemized commercial transaction receipt in `/app/transactions/:id`.

---

## 3. How to Verify Payment on Sandbox.PayPal.com

After completing payment:
1. Open a private browser tab and navigate to [https://sandbox.paypal.com](https://sandbox.paypal.com).
2. Log in using your Sandbox **Personal (Buyer)** account to see the debit activity:
   - Status: **Completed**
   - Recipient: VYRO Autonomous Commerce
   - Amount: Matches agreed deal amount
3. Log in using your Sandbox **Business (Seller)** account:
   - Activity: Incoming payment captured
   - Gross amount credited to merchant balance

---

## 4. Known Error Codes & Exact Fixes

| Error Code / Symptom | Root Cause | Fix Applied in VYRO |
| :--- | :--- | :--- |
| `EAI_AGAIN api-m.sandbox.paypal.com` | Windows Node.js IPv6 DNS resolution timeout | `dns.setDefaultResultOrder('ipv4first')` set at application entry point (`server/src/index.ts`). |
| `Transaction declined: international regulations` | Physical shipping required on digital service between sandbox accounts with mismatching country codes | Added `shipping_preference: 'NO_SHIPPING'` in `payment_source.paypal.experience_context`. |
| `ORDER_NOT_APPROVED` | Attempting to capture order before user completes the PayPal popup modal | Backend capture endpoint verifies order state before capture and returns clear guidance. |
| `INSTRUMENT_DECLINED` | Sandbox test card or test balance has insufficient test funds | Select "PayPal Balance" or add a new test card in PayPal Developer Dashboard > Sandbox Accounts. |
| `DECISION_NOT_APPROVED` | Buyer attempted to trigger checkout on a deal that was declined or not yet approved | Strict server guard in `paypalClient.ts` blocks checkout until approval is recorded. |
| `DAILY_CAP_EXCEEDED` | Payment exceeds buyer daily budget cap | User can raise daily ceiling in Rules & Governance (`/app/rules`). |

---

## 5. Automated Health Verification

To verify PayPal Sandbox connectivity independently at any time, run:
```bash
node server/node_modules/tsx/dist/cli.mjs scripts/paypal_smoke.ts
```
Expected output:
- `OAuth HTTP Status: 200 OK`
- `PayPal-Debug-Id: <id>`
- `Create Order HTTP Status: 200 OK`
- `Order ID: <order_id>`
- `Status: PAYER_ACTION_REQUIRED`
