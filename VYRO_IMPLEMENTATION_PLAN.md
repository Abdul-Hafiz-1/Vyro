# VYRO Implementation Master Plan

## Overview
This plan operationalizes the complete rebuild of VYRO into a production-oriented, AI-native autonomous commerce network where every user has a unified account with independent buyer and seller capabilities.

---

## Phase 1 — Shared Identity, Data Models & Firestore Architecture
- **Goal:** Establish single-user dual-role identity and Firestore-compatible data schemas.
- **Affected Files:**
  - `server/src/types/index.ts` (Extend with `User`, `Listing`, `AgentPolicy`, `MemoryItem`, `Notification`)
  - `server/src/db/store.ts` (Re-architect into collection-based repository mirroring Firestore)
  - `server/src/db/firestore.rules` (Create comprehensive security rules)
  - `client/src/types/index.ts` (Synchronize TypeScript contracts)
- **Verification Criteria:**
  - Single user record holds `capabilities: { buying: boolean, selling: boolean }`.
  - User can own both buyer agents and seller agents.
  - Listings belong to user UID and are queryable by category and status.

---

## Phase 2 — Authentication & Multi-Step Onboarding
- **Goal:** Real session management and interactive capability onboarding.
- **Affected Files:**
  - `client/src/context/AuthContext.tsx` (Create real auth context replacing static persona switcher)
  - `client/src/pages/public/AuthPages.tsx` (Implement real login, registration, password recovery)
  - `client/src/pages/public/OnboardingPage.tsx` (7-step onboarding: Welcome, Profile, Capabilities, Buyer Preferences, Seller Setup, First Agent, Launch)
  - `server/src/routes/auth.ts` (User registration, login, profile updates, capability toggling)
- **Verification Criteria:**
  - User can register with email/password.
  - Onboarding captures capabilities and persists preferences to database.
  - Session persists across page reloads.

---

## Phase 3 — Personal AI Context & Memory System
- **Goal:** Structured memory for buyer preferences and seller business constraints.
- **Affected Files:**
  - `server/src/services/ai/memory.ts` (Buyer memory & seller memory management)
  - `server/src/routes/memory.ts` (Inspect, edit, delete memory items)
  - `client/src/pages/app/MemoryPage.tsx` (User interface to inspect and correct AI assumptions)
- **Verification Criteria:**
  - Buyer preferences (budget, quality, constraints) retrieved during procurement.
  - Seller business policies (floors, SLAs, delivery) retrieved during bidding.
  - Memory items can be inspected and deleted by the user.

---

## Phase 4 — Seller Workspace & Listing Management
- **Goal:** Professional business operations suite for human sellers.
- **Affected Files:**
  - `client/src/pages/app/seller/SellerOverviewPage.tsx` (Active listings, inquiries, orders, revenue)
  - `client/src/pages/app/seller/ListingsPage.tsx` (Manage products & services)
  - `client/src/pages/app/seller/ListingEditorPage.tsx` (Create & edit listings with pricing, deliverables, conditions)
  - `client/src/pages/app/seller/InquiriesPage.tsx` (Review incoming buyer agent bids)
  - `server/src/routes/listings.ts` (CRUD for listings with owner authorization)
- **Verification Criteria:**
  - User can create physical product, digital product, or service listings.
  - Listings appear in the discovery search engine.
  - Listings can be published, paused, or edited.

---

## Phase 5 — Agent Studio
- **Goal:** Comprehensive creation and calibration center for AI agents.
- **Affected Files:**
  - `client/src/pages/app/agents/AgentStudioPage.tsx` (Active agents, performance, activity)
  - `client/src/pages/app/agents/AgentWizardPage.tsx` (Guided agent creation: Buyer, Seller, Specialist)
  - `client/src/pages/app/agents/AgentConfigPage.tsx` (Calibrate min price, target price, negotiation rules, human escalation)
  - `server/src/routes/agents.ts` (Agent CRUD, policy validation)
- **Verification Criteria:**
  - User can create multiple agents under their account.
  - Seller agents have hard minimum price floors and negotiation flexibility.
  - Buyer agents have budget ceilings and quality constraints.

---

## Phase 6 — AI Engine & Real Gemini Function Calling
- **Goal:** Native Gemini Function Calling and controlled orchestration loop.
- **Affected Files:**
  - `server/src/services/ai/gemini.ts` (Declare Gemini tools: `searchListings`, `getBuyerContext`, `createCounterOffer`, `requestHumanApproval`, etc.)
  - `server/src/services/ai/orchestrator.ts` (Tool execution loop, backend DB operations, privacy barrier)
- **Verification Criteria:**
  - Gemini outputs actual tool call requests.
  - Backend executes tools and injects structured results back to the model.
  - Strict privacy: Buyer agent cannot see seller floor; seller agent cannot see buyer private history.

---

## Phase 7 — Buyer Workspace & Natural Language Discovery
- **Goal:** Conversational discovery matching real listings and seller agents.
- **Affected Files:**
  - `client/src/pages/app/buyer/BuyerOverviewPage.tsx` (AI discovery input, active negotiations, recommendations)
  - `client/src/pages/app/buyer/DiscoveryResultsPage.tsx` (Matched listings & seller agents with transparent explanations)
  - `server/src/services/discovery/matching.ts` (Deterministic filtering + AI ranking)
- **Verification Criteria:**
  - Natural language input parsed into structured criteria.
  - Real database listings returned with match score and explanation.
  - User can initiate multi-agent procurement from search results.

---

## Phase 8 — Multi-Agent Negotiation & Human Approval
- **Goal:** Real state machine with bilateral review and transaction proposal.
- **Affected Files:**
  - `server/src/services/negotiation/stateMachine.ts` (Enforce transitions: DISCOVERY -> NEGOTIATING -> AGREEMENT_PROPOSED -> HUMAN_APPROVAL_REQUIRED -> APPROVED -> COMPLETED)
  - `client/src/pages/app/negotiations/NegotiationRoomPage.tsx` (Real-time timeline, speech bubbles, offer cards, human escalation banner)
  - `client/src/components/negotiation/ApprovalModal.tsx` (Two-party authorization sheet)
- **Verification Criteria:**
  - Buyer and seller agents exchange offers respecting configured limits.
  - Human approval gate halts auto-execution until buyer authorizes and seller ratifies.
  - Agreement triggers PayPal Sandbox capture readiness.

---

## Phase 9 — Navigation, Settings, Notifications & Design Refinement
- **Goal:** Cohesive application shell with seamless workspace switching and Dieter Rams/Apple visual polish.
- **Affected Files:**
  - `client/src/components/common/AppLayout.tsx` (Workspace switcher: Buyer / Seller / Studio)
  - `client/src/pages/app/SettingsPage.tsx` (Profile, capabilities, security, AI API diagnostics)
  - `client/src/pages/app/NotificationsPage.tsx` (Real-time system events, approval requests)
- **Verification Criteria:**
  - Switching between Buyer and Seller workspaces maintains same logged-in user.
  - Light and dark themes render cleanly across all viewports.
  - Zero TypeScript or lint errors.
