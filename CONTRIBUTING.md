# Contributing to VYRO

Thank you for checking out VYRO!

## Local Setup
1. Use Node.js 20+ (see `.nvmrc`).
2. Copy `.env.example` to `.env` and configure your PayPal Sandbox and Gemini keys (or leave `GEMINI_API_KEY` blank for built-in deterministic fallback).
3. Install dependencies and run tests:
   ```bash
   npm run install:all
   npm --prefix server run build
   npm --prefix client run build
   npm --prefix server test
   ```

## Pull Request Guidelines
- Keep changes focused and modular.
- Never commit `.env` files, API keys, database files (`*.db`, `*.sqlite`), or real personal emails.
- Run `npm --prefix server test` and `npm --prefix client run build` before opening a pull request.
- Do not bypass server-side escrow, budget, or `NODE_ENV=production` security gates.
