# VYRO Demo Video Script (Target: ~2:35, max 2:50)

## Pre-Recording Checklist
- [ ] Reset and re-seed clean demo data (`npm run db:reset && npm run seed:demo`).
- [ ] Start app cleanly (`npm run dev`) with real PayPal Sandbox credentials in `.env` (`PAYMENT_PROVIDER=paypal`, `PAYPAL_PAYOUT_PROVIDER=paypal`).
- [ ] Use two **clean browser profiles** (e.g., Chrome Profile A for Seller `demo.seller@example.com`, Chrome Incognito for Buyer `demo.buyer@example.com`).
- [ ] Hide bookmarks bar, close unrelated tabs, and verify **no `.env` file, API keys, or secrets** appear on screen.
- [ ] Record at `1920x1080` or `1440x900` dark mode, no copyrighted background music, no third-party brand logos.
- [ ] Upload final video as **Public** (or Unlisted if Devpost requires, Public recommended) on YouTube before pasting link into Devpost.

---

## Shot-by-Shot Script

| Time | Screen / Action | Voiceover |
| --- | --- | --- |
| **0:00 – 0:20** | Open `http://localhost:5173` (Landing Page hero + click **Escrow & Refund Rules** tab in Protocol Explorer). | "Beginner freelancers spend too much time writing proposals and haggling, while buyers wade through endless messages. VYRO is an AI freelance marketplace where AI agents negotiate multi-issue terms, PayPal handles the money, and humans step in only when it matters." |
| **0:20 – 0:45** | Switch to **Window 1 (Seller)**: logged in as `demo.seller@example.com` in **Selling** mode. Open **Payments** briefly to show Ready PayPal payout email, then on **Today** type in `"What do you offer?"`: *"React dashboard performance audit, $200 list, lowest $160, 4 days"* → click **Draft listing** → **Publish**. | "Here's our seller. They've connected their PayPal payout email under Payments. Instead of filling a long form, they describe their service in plain words, and Gemini drafts a structured listing with their private lowest price kept strictly on the server." |
| **0:45 – 1:15** | Switch to **Window 2 (Buyer Incognito)**: logged in as `demo.buyer@example.com`. On **Today**, type: *"Need a React dashboard performance audit, budget around $175, within 5 days"* → press Enter → click **Start**. | "Now in a separate session, our buyer types what they need in plain words. VYRO structures the brief, matches the seller, and launches two isolated AI agents that negotiate price, turnaround days, and scope across rounds." |
| **1:15 – 1:40** | Show **Projects** → open the active deal cockpit. Point out round-by-round concessions and **Needs your OK** `DecisionCard` (showing why the AI paused and exact budget/limit comparison). Click **Approve**. | "Every round moves monotonically within deterministic guardrails—and private limits never leak. When an offer crosses the buyer's comfort threshold, VYRO routes it to **Needs your OK** with a plain-language reason. One click approves it." |
| **1:40 – 2:05** | Click the **PayPal** button inside the Summary Panel → log in with **Sandbox Personal buyer** in the PayPal popup → complete payment → show `Paid, held` status. | "Now PayPal handles the money via the Sandbox Orders v2 API. The buyer authorizes payment, and VYRO holds the funds safely in escrow—disclosing the 5% fee upfront." |
| **2:05 – 2:30** | Switch to **Seller Window 1** → click **Start work** → **Deliver work** (enter note + attach file) → switch to **Buyer Window 2** → show zero refund button after delivery → click **Accept work**. | "Once the seller clicks Start work and delivers files, unilateral self-refunds lock so sellers are protected. The buyer reviews the delivery, clicks Accept work, and VYRO releases net earnings via PayPal Payouts." |
| **2:30 – 2:45** | Open **Payments** on Buyer and Seller windows showing itemized receipt and payout status. End on VYRO logo. | "Both sides get a full itemized receipt and append-only ledger. That's VYRO—autonomous negotiation with human rules and PayPal escrow." |
