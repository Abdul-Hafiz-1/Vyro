# Security Policy

## Sandbox-Only Notice
VYRO is a hackathon prototype built for **PayPal Sandbox** (`PAYPAL_ENV=sandbox`). Do **not** deploy this prototype with live PayPal credentials without completing PayPal Commerce Platform partner onboarding and applicable money-transmission/escrow licensing compliance.

## Built-in Protections
- **Private Limit Isolation:** Buyer budget caps and seller minimum prices are stripped from counterparty API payloads (`404` for unauthorized users).
- **Untrusted Input Handling:** Counterparty negotiation messages are treated as untrusted data and bounded by deterministic numeric guardrails.
- **Production Gates:** When `NODE_ENV=production`, `/api/v1/payments/mock-settle` is unmounted (`404`), mock/simulated payment and payout providers are refused, and error stack traces are suppressed.
- **Rate Limiting:** Auth, AI, and payment endpoints enforce per-IP sliding-window rate limits (`429 RATE_LIMITED`).

## Reporting a Vulnerability
If you discover a security issue, please open a private security advisory on GitHub or contact the maintainer (`[FILL: security contact email]`) rather than posting exploit details in public issues.
