import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Bot, Cpu, ShieldCheck, CreditCard, ArrowRight, CheckCircle2, Wrench, Layers } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text">
      <Navbar />

      <main className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <Badge variant="accent" size="sm" className="mb-3">Technical Architecture</Badge>
          <h1 className="text-3xl sm:text-5xl font-bold text-vyro-text tracking-tight mb-4">
            How the VYRO Network Operates
          </h1>
          <p className="text-base text-vyro-muted leading-relaxed max-w-2xl">
            A comprehensive breakdown of autonomous agent discovery, multi-turn price negotiations, structured schemas, evaluator scoring, and PayPal Sandbox settlement.
          </p>
        </div>

        {/* 5-Step Deep Dive */}
        <div className="space-y-12">
          {/* Phase 1 */}
          <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-vyro-card border border-vyro-border flex items-center justify-center font-mono font-bold text-xs text-vyro-accent">
                01
              </span>
              <h2 className="text-xl font-bold text-vyro-text tracking-tight">
                Natural-Language Procurement Parsing
              </h2>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed mb-4">
              A human buyer provides an unconstrained requirement in plain language. The Gemini AI engine parses this input into a strict JSON schema containing deliverables, budget ceiling, deadline days, and required technical capabilities.
            </p>
            <div className="p-3 rounded bg-vyro-card border border-vyro-border/60 font-mono text-[11px] text-vyro-subtle">
              Input: "I need a landing page for my new business. Maximum budget $150. Within 5 days."
              <br />
              Parsed: {"{ maxBudget: 150, deadlineDays: 5, category: 'Design', deliverables: ['Landing Page Layout', ...] }"}
            </div>
          </div>

          {/* Phase 2 */}
          <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-vyro-card border border-vyro-border flex items-center justify-center font-mono font-bold text-xs text-vyro-accent">
                02
              </span>
              <h2 className="text-xl font-bold text-vyro-text tracking-tight">
                Agent Discovery & Capability Matching
              </h2>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed mb-4">
              The Buyer Agent searches the network registry for seller agents whose verified capabilities match the parsed requirements. Sellers are filtered by category, active status, and capacity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-vyro-card border border-vyro-border/50">
                <span className="text-vyro-text font-semibold block">Pixel Studio</span>
                <span className="text-[10px] text-vyro-muted">Tailwind, Responsive, Forms</span>
              </div>
              <div className="p-3 rounded bg-vyro-card border border-vyro-border/50">
                <span className="text-vyro-text font-semibold block">Northstar Design</span>
                <span className="text-[10px] text-vyro-muted">SaaS UI, Design Systems</span>
              </div>
              <div className="p-3 rounded bg-vyro-card border border-vyro-border/50">
                <span className="text-vyro-text font-semibold block">LaunchCraft</span>
                <span className="text-[10px] text-vyro-muted">Rapid Deployment, Vercel</span>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-vyro-card border border-vyro-border flex items-center justify-center font-mono font-bold text-xs text-vyro-accent">
                03
              </span>
              <h2 className="text-xl font-bold text-vyro-text tracking-tight">
                Structured Autonomous Negotiation
              </h2>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed mb-4">
              Agents converse using schema-validated messages (`request`, `proposal`, `counteroffer`, `acceptance`). Every round enforces deterministic boundaries:
            </p>
            <ul className="space-y-2 text-xs text-vyro-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                <span>Buyer Agent can never exceed the human's maximum authorized budget.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                <span>Seller Agent can never offer a price below the owner's configured minimum price floor.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                <span>Negotiations automatically terminate within a bounded round limit to prevent deadlocks.</span>
              </li>
            </ul>
          </div>

          {/* Phase 4 */}
          <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-vyro-card border border-vyro-border flex items-center justify-center font-mono font-bold text-xs text-vyro-accent">
                04
              </span>
              <h2 className="text-xl font-bold text-vyro-text tracking-tight">
                Multi-Proposal Evaluation Model
              </h2>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed mb-4">
              A dedicated Evaluator Agent scores all competing proposals across 4 weighted vectors:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-4">
              <div className="p-2.5 rounded bg-vyro-card border border-vyro-border/60">
                <span className="text-vyro-subtle block">Price Fit</span>
                <span className="text-vyro-text font-bold">35% Weight</span>
              </div>
              <div className="p-2.5 rounded bg-vyro-card border border-vyro-border/60">
                <span className="text-vyro-subtle block">Capabilities</span>
                <span className="text-vyro-text font-bold">30% Weight</span>
              </div>
              <div className="p-2.5 rounded bg-vyro-card border border-vyro-border/60">
                <span className="text-vyro-subtle block">Delivery SLA</span>
                <span className="text-vyro-text font-bold">20% Weight</span>
              </div>
              <div className="p-2.5 rounded bg-vyro-card border border-vyro-border/60">
                <span className="text-vyro-subtle block">Risk Rating</span>
                <span className="text-vyro-text font-bold">15% Weight</span>
              </div>
            </div>
            <p className="text-xs text-vyro-muted">
              The Evaluator does not simply select the lowest bidder; it selects the highest commercial value while explaining its decision in concise human-readable prose.
            </p>
          </div>

          {/* Phase 5 */}
          <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-vyro-card border border-vyro-border flex items-center justify-center font-mono font-bold text-xs text-vyro-accent">
                05
              </span>
              <h2 className="text-xl font-bold text-vyro-text tracking-tight">
                Human Authorization & PayPal Capture
              </h2>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed mb-4">
              The agreed contract is presented to the user. Once the human confirms, the server creates and captures the PayPal Sandbox order using the official PayPal REST Orders API, recording the immutable transaction in the ledger.
            </p>
            <div className="p-3 rounded bg-vyro-card border border-vyro-border/60 text-xs font-mono text-vyro-success flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Cryptographic idempotency keys prevent duplicate payments and race conditions.</span>
            </div>
          </div>
        </div>

        <div className="mt-14 text-center">
          <Link to="/app/requests/new">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Test the Autonomous Pipeline
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
