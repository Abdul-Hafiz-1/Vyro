import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Lock,
  Sparkles,
  Clock,
  ChevronRight,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { DealNode } from '../../components/common/DealNode';
import { formatMoney } from '../../lib/present';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Interactive Live Demo State
  const [demoRound, setDemoRound] = useState<1 | 2 | 3>(2);

  const demoRoundsData = {
    1: {
      sellerPrice: 220,
      sellerDays: 6,
      buyerPrice: 160,
      buyerDays: 4,
      status: 'Open gap ($60)',
      summary: 'Seller opened at $220 with 6 days delivery. Buyer countered at $160 for 4 days.'
    },
    2: {
      sellerPrice: 190,
      sellerDays: 5,
      buyerPrice: 175,
      buyerDays: 5,
      status: 'Converging (-$30 concession)',
      summary: 'Seller conceded $30 for a 5-day delivery window. Buyer moved up $15.'
    },
    3: {
      sellerPrice: 180,
      sellerDays: 5,
      buyerPrice: 180,
      buyerDays: 5,
      status: 'Consensus reached',
      summary: 'Agreement struck at $180 with 5 days turnaround. Escrow authorized.'
    }
  };

  const currentDemo = demoRoundsData[demoRound];

  return (
    <div className="min-h-screen bg-bg text-text-primary selection:bg-volt/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-surface/90 border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-[22px] text-text-primary tracking-tight">
              VYRO
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-secondary text-text-muted">
            <Link to="/marketplace" className="hover:text-text-primary transition-colors">
              Marketplace
            </Link>
            <Link to="/how-it-works" className="hover:text-text-primary transition-colors">
              How it works
            </Link>
            <Link to="/security" className="hover:text-text-primary transition-colors">
              Security
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="volt" size="sm">
                Open app
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border-subtle text-secondary text-text-muted">
            <span className="w-2 h-2 rounded-full bg-status-handled" />
            <span className="text-text-primary font-semibold">AI Freelance Marketplace</span>
            <span>·</span>
            <span>PayPal Sandbox</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-bold text-[40px] sm:text-[64px] text-text-primary leading-[1.08] tracking-tight">
            Where AI agents do the haggling and PayPal does the paying.
          </h1>

          {/* Subtitle */}
          <p className="text-body text-text-muted max-w-2xl leading-relaxed">
            Sellers describe a service in plain words and AI drafts the listing. Buyers type what they need with a budget and deadline. Two independent AI agents negotiate price, delivery time, and scope while keeping private limits private, and a human only steps in when it matters.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              variant="volt"
              size="lg"
              onClick={() => navigate('/app/requests/new')}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Start a request
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/marketplace')}
            >
              Explore marketplace
            </Button>
          </div>
        </div>
      </section>

      {/* Live Interactive Negotiation Preview */}
      <section className="py-12 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-secondary font-semibold text-text-primary">
                Live Bilateral Negotiation Simulator
              </span>
              <p className="text-secondary text-text-muted">
                Observe how two autonomous agents dynamically trade price and turnaround days.
              </p>
            </div>

            {/* Round Switcher */}
            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-control border border-border-subtle self-start sm:self-auto">
              {[1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDemoRound(r as any)}
                  className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
                    demoRound === r
                      ? 'bg-volt text-[#0C0E0D] font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Round {r}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Cockpit Card */}
          <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-surface">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div className="flex items-center gap-3">
                <StatusChip
                  label={demoRound === 3 ? 'Consensus Struck' : `Round ${demoRound} in Progress`}
                  role={demoRound === 3 ? 'handled' : 'inProgress'}
                  size="md"
                />
                <span className="text-secondary text-text-muted">
                  Brand Identity & Token Architecture
                </span>
              </div>
              <span className="text-secondary text-status-handled font-medium">
                {currentDemo.status}
              </span>
            </div>

            {/* Bilateral Comparison Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Buyer Agent Position */}
              <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-semibold text-text-primary">
                    Buyer Agent
                  </span>
                  <span className="text-secondary text-text-muted">Budget: $250</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-[32px] text-text-primary">
                    {formatMoney(currentDemo.buyerPrice)}
                  </span>
                  <span className="text-secondary text-text-muted">
                    · {currentDemo.buyerDays} days turnaround
                  </span>
                </div>
                <p className="text-secondary text-text-muted">
                  Authorized to negotiate within 4–6 day delivery window.
                </p>
              </div>

              {/* Seller Agent Position */}
              <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-semibold text-text-primary">
                    Seller Agent
                  </span>
                  <span className="text-secondary text-text-muted">Lowest: $160</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-[32px] text-text-primary">
                    {formatMoney(currentDemo.sellerPrice)}
                  </span>
                  <span className="text-secondary text-text-muted">
                    · {currentDemo.sellerDays} days turnaround
                  </span>
                </div>
                <p className="text-secondary text-text-muted">
                  Authorized to concede down to standard lowest in exchange for production buffer.
                </p>
              </div>
            </div>

            {/* Explanation Sentence */}
            <div className="p-4 rounded-control bg-raised border border-border-subtle text-secondary text-text-muted leading-relaxed">
              {currentDemo.summary}
            </div>
          </Card>
        </div>
      </section>

      {/* 3 Key Benefits */}
      <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border-subtle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 flex flex-col gap-4 bg-surface">
            <div className="w-10 h-10 rounded-full bg-status-handled/15 text-status-handled flex items-center justify-center">
              <Lock className="w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="font-display font-bold text-[20px] text-text-primary">
              Zero-Knowledge Privacy
            </h3>
            <p className="text-secondary text-text-muted leading-relaxed">
              Buyer budgets and seller lowest prices stay strictly quarantined on the server. Counterparty messages are treated as untrusted data and never see private limits.
            </p>
          </Card>

          <Card className="p-6 flex flex-col gap-4 bg-surface">
            <div className="w-10 h-10 rounded-full bg-volt/20 text-[#0C0E0D] dark:text-volt flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="font-display font-bold text-[20px] text-text-primary">
              Multi-Issue Negotiation
            </h3>
            <p className="text-secondary text-text-muted leading-relaxed">
              Agents negotiate price, delivery time, and scope in measured steps, with clear trades like &ldquo;$138 if we use 7 days&rdquo; and plain-language &ldquo;Why?&rdquo; explanations.
            </p>
          </Card>

          <Card className="p-6 flex flex-col gap-4 bg-surface">
            <div className="w-10 h-10 rounded-full bg-status-handled/15 text-status-handled flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="font-display font-bold text-[20px] text-text-primary">
              Server-Enforced Limits
            </h3>
            <p className="text-secondary text-text-muted leading-relaxed">
              Spending limits and a daily cap are enforced on the server. Deals slightly over budget route to &ldquo;Needs your OK&rdquo; instead of failing silently.
            </p>
          </Card>
        </div>
      </section>

      {/* Proof & Safeguards Callout */}
      <section className="py-16 px-4 sm:px-6 bg-raised border-y border-border-subtle">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[40px] text-text-primary">
              $0
            </span>
            <span className="text-secondary text-text-muted">
              Agreed above your hard limit without your OK
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[40px] text-text-primary">
              5%
            </span>
            <span className="text-secondary text-text-muted">
              Service fee disclosed before payment
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[40px] text-text-primary">
              100%
            </span>
            <span className="text-secondary text-text-muted">
              Per-account session and data isolation
            </span>
          </div>
        </div>
      </section>

      {/* How It Works (4 Stepping Stones) */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-secondary font-semibold text-text-primary">
            The 4-Step Process
          </span>
          <h2 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
            How autonomous procurement works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'State what you need',
              desc: 'Describe your requirements in plain language and set a private target, comfortable budget, and flexibility.'
            },
            {
              step: '02',
              title: 'Agent discovery',
              desc: 'Your buyer agent contacts verified sellers and evaluates proposals against your criteria.'
            },
            {
              step: '03',
              title: 'Autonomous bargaining',
              desc: 'Agents negotiate terms, turnaround, and price until a mutually beneficial consensus is reached.'
            },
            {
              step: '04',
              title: 'PayPal Checkout & Payout',
              desc: 'Buyers pay via PayPal Orders API (sandbox). The platform holds the seller share and releases it via real PayPal Payouts API calls in sandbox (with a clearly labeled simulated fallback in test mode only, refused in production) once work is accepted. Refunds work before payout release.'
            }
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-2 p-5 bg-surface rounded-control border border-border-subtle">
              <span className="text-secondary font-bold text-volt">
                {item.step}
              </span>
              <span className="font-semibold text-body text-text-primary">
                {item.title}
              </span>
              <p className="text-secondary text-text-muted leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto p-10 sm:p-14 rounded-surface bg-surface border border-border-subtle text-center flex flex-col items-center gap-6">
          <h2 className="font-display font-bold text-[32px] sm:text-[44px] text-text-primary tracking-tight">
            Ready to let AI handle your commerce?
          </h2>
          <p className="text-body text-text-muted max-w-xl leading-relaxed">
            Create an empty account in seconds. Buy and sell with full isolation and guaranteed escrow protection.
          </p>
          <Button
            variant="volt"
            size="lg"
            onClick={() => navigate('/signup')}
            rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
          >
            Create free account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-border-subtle bg-surface">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-secondary text-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-text-primary text-[18px]">
              VYRO
            </span>
            <span>· Autonomous Commerce Network</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="hover:text-text-primary transition-colors">
              Marketplace
            </Link>
            <Link to="/help" className="hover:text-text-primary transition-colors">
              Help
            </Link>
            <Link to="/terms" className="hover:text-text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};