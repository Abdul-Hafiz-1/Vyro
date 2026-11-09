import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Play,
  Scale,
  DollarSign,
  Clock,
  Terminal,
  Zap
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Interactive Live Price Ladder Simulator state
  const [simBudget, setSimBudget] = useState<number>(200);
  const [simRound, setSimRound] = useState<number>(2);

  const samplePrompts = [
    {
      title: 'OWASP Security Audit',
      budget: '$350',
      days: '4d',
      text: 'I need an OWASP top-10 security audit of my Express API completed within 4 days for under $350 USD.'
    },
    {
      title: 'Brand Design System',
      budget: '$180',
      days: '5d',
      text: 'I need a responsive, high-converting brand landing page with accessible Tailwind design tokens, delivery in 5 days, budget under $180 USD.'
    },
    {
      title: 'Mobile Architecture',
      budget: '$280',
      days: '6d',
      text: 'Cross-platform mobile app architecture with clean state management, API integration, and unit tests. Budget $280 within 6 days.'
    }
  ];

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text selection:bg-vyro-accent/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vyro-surface border border-vyro-border shadow-xs text-xs font-mono text-vyro-muted"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
              <span className="text-vyro-text font-semibold">Autonomous Commerce</span>
              <span className="text-vyro-subtle">·</span>
              <span>Needs-You Review Model</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-bold tracking-tight text-vyro-text leading-[1.1] font-mono"
            >
              The AI-operated marketplace. <br />
              <span className="text-vyro-accent">Humans handle only exceptions.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-vyro-muted leading-relaxed max-w-2xl mx-auto font-sans"
            >
              Autonomous buyer and seller agents discover, negotiate, compare, and settle deals. You step in only when an edge case or rejection requires human judgment.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
            >
              <Link to="/app">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />} className="px-6">
                  Launch Workspace
                </Button>
              </Link>
              <Link to="/app/requests/new">
                <Button size="lg" variant="outline" className="px-5 font-mono text-xs">
                  Start New Request
                </Button>
              </Link>
            </motion.div>

            {/* Quick Presets */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
              <span className="text-vyro-subtle text-[11px] uppercase mr-1">Sample Requests:</span>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate('/app/requests/new', { state: { initialPrompt: p.text } })}
                  className="px-2.5 py-1 rounded-lg bg-vyro-surface border border-vyro-border hover:border-vyro-accent/50 text-vyro-muted hover:text-vyro-text transition-colors flex items-center gap-1.5"
                >
                  <span>{p.title}</span>
                  <span className="text-vyro-accent font-semibold">{p.budget}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Core Truth: 90% Autonomous vs 10% Exception Queue */}
      <section className="py-20 border-t border-vyro-border/60 bg-vyro-surface/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent font-semibold block">
              The Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight font-mono">
              The Needs-you queue is the product.
            </h2>
            <p className="text-xs text-vyro-muted leading-relaxed font-sans">
              The best session is one where you open VYRO, see <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">"Everything is handled"</code>, and leave.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: 90% Autonomous */}
            <div className="p-6 rounded-2xl bg-vyro-surface border border-vyro-border shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-vyro-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold font-mono text-vyro-text">90% Autonomous Flow</h3>
                    <span className="text-[10px] text-vyro-muted font-mono">Zero Human Attention Required</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">Auto-Approved</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">Scout & Match</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      Buyer agent parses requirements and queries verified seller agents.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">Converging Concessions</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      Multi-round price ladder negotiates deliverables and delivery without leaking budget ceilings or floor prices.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">Server Decision & Settlement</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      Auto-approved if price $\le$ buyer ceiling, $\ge$ seller floor, amount $\le$ $200, and daily spend cap holds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Result: Everything handled silently. Money captures via PayPal Sandbox.</span>
              </div>
            </div>

            {/* Right Card: 10% Exception Queue */}
            <div className="p-6 rounded-2xl bg-vyro-surface border border-amber-500/30 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-vyro-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold font-mono text-vyro-text">10% Needs-You Review Queue</h3>
                    <span className="text-[10px] text-vyro-muted font-mono">Humans Handle ONLY Exceptions</span>
                  </div>
                </div>
                <Badge variant="warning" size="sm">Escalated</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    !
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">Threshold or Cap Exceeded</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      Deal exceeds your $200 auto-approval ceiling or would breach your daily spend cap.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    !
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">Operational Impasse</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      Seller absolute floor exceeds buyer max budget, or delivery timeframe is incompatible.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-vyro-card border border-vyro-border flex items-center justify-center font-mono text-[10px] font-bold text-vyro-text shrink-0 mt-0.5">
                    !
                  </span>
                  <div>
                    <span className="font-semibold text-vyro-text block">One-Click Human Decisions</span>
                    <p className="text-vyro-muted text-[11px] mt-0.5">
                      One-click Approve, Decline, or Counter with inline price. Overrides generate suggested rules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Result: You decide only what matters. 10-second undo window on all actions.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Price Convergence Proof */}
      <section className="py-20 border-t border-vyro-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent font-semibold block">
              Deterministic Convergence
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight font-mono">
              Watch agents converge without leaking budgets
            </h2>
            <p className="text-xs text-vyro-muted max-w-xl mx-auto">
              Simulate an autonomous procurement negotiation below. Neither party ever reveals their private floor or ceiling.
            </p>
          </div>

          {/* Interactive Simulation Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-vyro-surface border border-vyro-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-vyro-border/60">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-vyro-accent" />
                <span className="text-xs font-mono font-semibold text-vyro-text">
                  Simulation: Express API Security Audit
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-vyro-muted">Your Private Ceiling:</span>
                <span className="px-2 py-0.5 rounded bg-vyro-card border border-vyro-border font-bold text-vyro-text tabular-nums">
                  ${simBudget} USD
                </span>
              </div>
            </div>

            {/* Simulated Horizontal Convergence Track */}
            <div className="space-y-3 font-mono text-xs">
              {/* Round 1 */}
              <div className="p-3 rounded-lg bg-vyro-card border border-vyro-border space-y-2">
                <div className="flex justify-between items-center text-[11px] text-vyro-muted">
                  <span>Round 1: Opening Positions</span>
                  <span>Spread: $80</span>
                </div>
                <div className="relative h-8 bg-vyro-bg rounded flex items-center px-3 border border-vyro-border/60">
                  <div className="flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-[#4C7DF0]" />
                    <span className="text-xs font-bold text-vyro-text">$160 Buyer</span>
                  </div>
                  <div className="mx-auto z-10">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-vyro-surface border border-vyro-border text-vyro-muted">
                      $80 gap
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 z-10 ml-auto">
                    <span className="text-xs font-bold text-vyro-text">$240 Seller</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Round 2 */}
              <div className="p-3 rounded-lg bg-vyro-card border border-vyro-border space-y-2">
                <div className="flex justify-between items-center text-[11px] text-vyro-muted">
                  <div className="flex items-center gap-2">
                    <span>Round 2: Mutual Concessions</span>
                    <span className="text-blue-400 text-[10px]">Buyer +$25</span>
                    <span className="text-emerald-400 text-[10px]">Seller -$30</span>
                  </div>
                  <span>Spread: $25</span>
                </div>
                <div className="relative h-8 bg-vyro-bg rounded flex items-center px-3 border border-vyro-border/60">
                  <div className="flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-[#4C7DF0]" />
                    <span className="text-xs font-bold text-vyro-text">$185 Buyer</span>
                  </div>
                  <div className="mx-auto z-10">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-vyro-surface border border-vyro-border text-vyro-muted">
                      $25 gap
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 z-10 ml-auto">
                    <span className="text-xs font-bold text-vyro-text">$210 Seller</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Consensus */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-vyro-text">Consensus Reached: $195 USD</span>
                </div>
                <Badge variant="success" size="sm">
                  {195 <= simBudget ? 'Auto-Approved (under limit)' : 'Needs-You Review (exceeds limit)'}
                </Badge>
              </div>
            </div>

            {/* Privacy verification footer */}
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-vyro-muted">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Canary Privacy Check: PASS (0 Leaks)</span>
              </span>
              <span>Validated against strict JSON schema</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Architectural Invariants */}
      <section className="py-20 border-t border-vyro-border/60 bg-vyro-surface/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent font-semibold block">
              Engineering Proof
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight font-mono">
              Four Non-Negotiable Invariants
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-vyro-surface border border-vyro-border space-y-2">
              <div className="w-7 h-7 rounded-lg bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent font-mono text-xs font-bold">
                01
              </div>
              <h3 className="text-xs font-semibold text-vyro-text font-mono">Zero Budget Leaks</h3>
              <p className="text-xs text-vyro-muted leading-relaxed font-sans">
                Buyer ceilings and seller floor prices are never passed into counterparty prompts, logs, or APIs. Verified by automated canary tests.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-vyro-surface border border-vyro-border space-y-2">
              <div className="w-7 h-7 rounded-lg bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent font-mono text-xs font-bold">
                02
              </div>
              <h3 className="text-xs font-semibold text-vyro-text font-mono">Untrusted Containment</h3>
              <p className="text-xs text-vyro-muted leading-relaxed font-sans">
                Counterparty messages are quarantined with boundary tags to neutralize prompt injection attacks.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-vyro-surface border border-vyro-border space-y-2">
              <div className="w-7 h-7 rounded-lg bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent font-mono text-xs font-bold">
                03
              </div>
              <h3 className="text-xs font-semibold text-vyro-text font-mono">Deterministic Signals</h3>
              <p className="text-xs text-vyro-muted leading-relaxed font-sans">
                Confidence is calculated mathematically from verified seller badges, ratings, and price delta—never self-reported by the model.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-vyro-surface border border-vyro-border space-y-2">
              <div className="w-7 h-7 rounded-lg bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent font-mono text-xs font-bold">
                04
              </div>
              <h3 className="text-xs font-semibold text-vyro-text font-mono">Server Payment Gate</h3>
              <p className="text-xs text-vyro-muted leading-relaxed font-sans">
                PayPal Sandbox capture checks server decision status and daily spend caps independently. The client is never trusted with payment release.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 border-t border-vyro-border/60 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-bold text-vyro-text tracking-tight font-mono">
            Autonomous commerce is here.
          </h2>
          <p className="text-xs sm:text-sm text-vyro-muted leading-relaxed">
            Open the app, delegate your first request, and let your agents handle the rest.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch Workspace
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button size="lg" variant="outline" className="text-xs font-mono">
                Guided Setup (3 steps)
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
