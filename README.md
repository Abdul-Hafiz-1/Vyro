# VYRO — Autonomous AI Commerce Network

> **Commerce, without the conversation gap.**  
> The network where independently configured AI agents discover, negotiate, and transact on behalf of people and businesses.

![VYRO Network](https://img.shields.io/badge/VYRO-Autonomous%20Commerce-8B7CFF?style=flat-square)
![PayPal Sandbox](https://img.shields.io/badge/Payments-PayPal%20Sandbox%20Orders%20API-0070BA?style=flat-square)
![Google Gemini](https://img.shields.io/badge/AI%20Engine-Gemini%20Structured%20Tools-4285F4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-63D6A0?style=flat-square)

---

## 1. Executive Summary

VYRO is a production-grade autonomous commerce network that replaces tedious human back-and-forth in B2B procurement with independently configured AI agents. 

Unlike simple chatbot interfaces or speculative mockups, VYRO implements a full multi-agent procurement protocol:
1. **Unstructured Prompt to Specification**: A human buyer submits a plain English requirement (e.g. *"I need a landing page for my new business. Maximum budget $150. Within five days."*).
2. **Schema-Validated Parsing**: The AI engine converts the prompt into strict JSON requirements (budget ceiling, delivery SLA, verified deliverables).
3. **Agent Discovery**: Matches suitable, active seller agents across the network registry.
4. **Structured Multi-Turn Negotiation**: Buyer and seller agents exchange bounded counteroffers (`request`, `proposal`, `counteroffer`, `acceptance`) with real backend tool execution traces.
5. **Independent Evaluator Scoring**: A dedicated Evaluator Agent scores all competing proposals across 4 weighted vectors (Price, Capabilities, Delivery, Risk).
6. **Mandatory Human Authorization**: Agents are technically barred from moving funds without an explicit human signature.
7. **PayPal Sandbox Settlement**: The backend invokes the official PayPal Orders API (`/v2/checkout/orders` and capture) with server-side amount verification and cryptographic idempotency.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion, TanStack Query, React Router v7.
- **Backend**: Node.js, Express, TypeScript, Zod request/response schema validation, UUID.
- **AI Engine**: Google Gemini API with function/tool execution traces and deterministic fallback simulator.
- **Payments**: PayPal Sandbox REST Orders API v2 (Order Creation, Capture, Server Verification, Idempotency).
- **Persistence**: Persisted disk store (`server/data/store.json`) with live Firestore-compatible schema.

---

## 3. Brand Identity & Visual System

Designed with the restraint and precision of Stripe, Linear, and Vercel:

| Token | Hex | Role |
|---|---|---|
| Main Background | `#0B0C0F` | Deep dark slate canvas |
| Secondary Background | `#111319` | Structured panel framing |
| Elevated Surfaces | `#171A21` | Elevated cards and drawers |
| Structural Borders | `#292D36` | Hairline boundaries |
| Primary Text | `#F2F2F0` | High-contrast readable typography |
| Secondary Text | `#9398A4` | Technical metadata |
| Accent Signal | `#8B7CFF` | Strategic focus |
| Success / Settled | `#63D6A0` | Consensus & verified settlements |
| Warning / Review | `#F0B66C` | Human approval required |
| Error / Alert | `#F07878` | Constraint breaches |

---

## 4. Architectural Overview

```
                                ┌────────────────────────────────────────┐
                                │             HUMAN BUYER                │
                                └───────────────────┬────────────────────┘
                                                    │ Natural Language Request
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │         VYRO PROCUREMENT PARSER        │
                                │   (Gemini Structured JSON Schema)      │
                                └───────────────────┬────────────────────┘
                                                    │ Validated Specs
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │              BUYER AGENT               │
                                │           ("Studio Buyer")             │
                                └───────┬────────────────────────┬───────┘
                                        │ Discovery              │ Discovery
                                        ▼                        ▼
┌───────────────────────────────────────────────┐        ┌───────────────────────────────────────────────┐
│                 SELLER AGENT                  │        │                 SELLER AGENT                  │
│              ("Pixel Studio")                 │        │            ("Northstar Design")               │
│ Starting: $180 | Floor: $140 | Delivery: 5d   │        │ Starting: $195 | Floor: $155 | Delivery: 4d   │
└───────────────────────┬───────────────────────┘        └───────────────────────┬───────────────────────┘
                        │ Multi-turn Proposals                   │ Multi-turn Proposals
                        └───────────────────────┬────────────────┘
                                                ▼
                                ┌────────────────────────────────────────┐
                                │        INDEPENDENT EVALUATOR           │
                                │  Composite Scoring (Price, SLA, Risk)  │
                                └───────────────────┬────────────────────┘
                                                    │ Recommended Agreement
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │       HUMAN AUTHORIZATION GATE         │
                                │    (Explicit Signature Required)       │
                                └───────────────────┬────────────────────┘
                                                    │ Verified Approval
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │       PAYPAL SANDBOX ORDERS API        │
                                │  Order Create -> Capture -> Ledger     │
                                └────────────────────────────────────────┘
```

---

## 5. Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone & Install
```bash
git clone https://github.com/your-username/vyro.git
cd vyro

# Install server and client dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To connect live external credentials:
- **Google Gemini API**: Set `GEMINI_API_KEY=your_key` (get a key from [Google AI Studio](https://aistudio.google.com/)).
- **PayPal Sandbox**: Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (get credentials from [PayPal Developer Dashboard](https://developer.paypal.com/)).

*Note: If external keys are not provided, VYRO operates seamlessly in high-fidelity sandbox simulation mode so you can evaluate the entire pipeline immediately without setup blockers.*

### 3. Run Development Servers
```bash
# Terminal 1: Backend API Engine (Port 4000)
npm run dev:server

# Terminal 2: Frontend Client (Port 5173)
npm run dev:client
```

Open your browser at **`http://localhost:5173`**.

---

## 6. Guided Hackathon Demonstration Flow

A judge or evaluator can test the entire autonomous pipeline in 60 seconds:

1. **Launch**: Navigate to `http://localhost:5173`.
2. **One-Click Demo**: Click **"Run Guided Hackathon Demo"** in the hero section or top navigation.
3. **Observation**:
   - Request created: *"I need a professionally designed landing page for my new business. My maximum budget is $150. I need it within five days."*
   - Three seller agents discovered: *Pixel Studio*, *Northstar Design*, and *LaunchCraft*.
   - Three independent negotiation dialogues executed with tactical price counteroffers.
   - Evaluator Agent analyzes all proposals and recommends *Pixel Studio* at **$143** (92/100 composite score).
4. **Human Control**: The app navigates to the **Negotiation Center** showing the agreement in `PENDING HUMAN AUTHORIZATION` state.
5. **Authorization**: Click **"Authorize Agreement ($143)"** to review deliverables and sign off.
6. **PayPal Capture**: Click **"Pay $143 with PayPal Sandbox"**. The backend captures the order, triggers celebratory visual feedback, and enters the transaction into the **Settlement Ledger** (`/app/transactions`).

---

## 7. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/system/status` | Health check & external provider connectivity |
| `POST` | `/api/v1/system/seed-demo-flow` | Runs the canonical 12-step guided multi-agent flow |
| `POST` | `/api/v1/system/reset-demo` | Resets store to initial seeded agents |
| `GET` | `/api/v1/agents` | List buyer and seller agents with category/status filters |
| `POST` | `/api/v1/agents` | Deploy a new agent with strict pricing floors |
| `POST` | `/api/v1/requests/parse` | Gemini NL purchasing prompt parser |
| `POST` | `/api/v1/requests` | Persist structured procurement request |
| `POST` | `/api/v1/negotiations/multi-agent` | Execute competitive negotiations across candidate sellers |
| `POST` | `/api/v1/negotiations/:id/step` | Advance an individual negotiation turn |
| `POST` | `/api/v1/agreements/:id/authorize` | Explicit human authorization for payment |
| `POST` | `/api/v1/payments/create-order` | Server creates PayPal order from authorized agreement |
| `POST` | `/api/v1/payments/capture-order` | Server captures and verifies PayPal payment |
| `GET` | `/api/v1/transactions` | Full immutable transaction settlement ledger |
| `GET` | `/api/v1/analytics` | Real-time computed network volume and performance metrics |

---

## 8. License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
