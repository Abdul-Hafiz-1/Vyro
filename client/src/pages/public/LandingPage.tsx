import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Sliders,
  Check,
  EyeOff,
  FileCheck,
  Clock
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { formatMoney } from '../../lib/present';

const HERO_HEADLINE = 'Where AI agents do the haggling and PayPal does the paying.';

const HERO_ROUNDS = [
  {
    id: 1 as const,
    tabLabel: '01 · Gap',
    statusLabel: 'Round 1 in Progress',
    chipRole: 'inProgress' as const,
    deltaBadge: 'Open gap ($60)',
    buyerPrice: 160,
    buyerDays: 4,
    sellerPrice: 220,
    sellerDays: 6,
    summary: 'Seller opened at $220 with 6 days turnaround. Your buyer agent countered at $160 for 4 days.',
    escrowNote: 'No funds moved until terms are mutually agreed and approved.'
  },
  {
    id: 2 as const,
    tabLabel: '02 · Trade',
    statusLabel: 'Round 2 · Trading',
    chipRole: 'inProgress' as const,
    deltaBadge: 'Seller -$30 trade',
    buyerPrice: 175,
    buyerDays: 5,
    sellerPrice: 190,
    sellerDays: 5,
    summary: 'Seller conceded $30 in exchange for a 5-day buffer. Buyer agent stepped up $15 toward fair middle ground.',
    escrowNote: 'Offers move in monotonic steps; private ceilings remain quarantined.'
  },
  {
    id: 3 as const,
    tabLabel: '03 · Agreed',
    statusLabel: 'Consensus Reached',
    chipRole: 'handled' as const,
    deltaBadge: 'Paid & held ($180)',
    buyerPrice: 180,
    buyerDays: 5,
    sellerPrice: 180,
    sellerDays: 5,
    summary: 'Agreement struck at $180 for 5-day delivery. Buyer funds PayPal escrow ($171 net payout after $9 disclosed fee).',
    escrowNote: 'Money stays safely held by VYRO until work is delivered and accepted.'
  }
];

const ESCROW_STAGES = [
  {
    id: 'paid_held',
    step: 'Stage 01',
    label: 'Paid, held',
    role: 'inProgress' as const,
    title: 'Buyer funds held safely before work begins',
    buyerPowers: 'Can cancel anytime for an instant full PayPal refund.',
    sellerPowers: 'Sees confirmed payment before clicking Start work.',
    refundRule: '100% refundable immediately before work starts'
  },
  {
    id: 'in_progress',
    step: 'Stage 02',
    label: 'In progress',
    role: 'inProgress' as const,
    title: 'Seller is actively building deliverables',
    buyerPowers: 'Can submit a cancellation request if plans change.',
    sellerPowers: 'Uploads deliverables or responds to cancellation (full, partial, decline).',
    refundRule: 'Requires mutual agreement or mediation'
  },
  {
    id: 'delivered',
    step: 'Stage 03',
    label: 'Delivered',
    role: 'needsYou' as const,
    title: 'Buyer reviews files within 72-hour protection window',
    buyerPowers: 'Accept work, Request changes (revisions), or Report a problem.',
    sellerPowers: 'Protected from unilateral buyer self-refund after delivery.',
    refundRule: 'Self-refund locked — disputes freeze escrow for review'
  },
  {
    id: 'completed',
    step: 'Stage 04',
    label: 'Released',
    role: 'handled' as const,
    title: 'Buyer accepts (or review window completes)',
    buyerPowers: 'Receives itemized receipt and full delivery access.',
    sellerPowers: 'Receives automatic PayPal Payout ($171 net after $9 fee).',
    refundRule: 'Payout settled via PayPal Payouts API'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);

  const [demoRound, setDemoRound] = useState<1 | 2 | 3>(2);
  const [simMode, setSimMode] = useState<'negotiate' | 'escrow'>('negotiate');
  const [activeStageIdx, setActiveStageIdx] = useState<number>(2);
  const [heroHoverOffset, setHeroHoverOffset] = useState<{ x: number; y: number } | null>(null);

  const currentDemo = HERO_ROUNDS.find((r) => r.id === demoRound) || HERO_ROUNDS[1];
  const currentStage = ESCROW_STAGES[activeStageIdx] || ESCROW_STAGES[2];

  // Shared IntersectionObserver for animate-on-scroll reveals (runs once per element)
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;

    const nodes = Array.from(container.querySelectorAll('.animate-on-scroll'));
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((el) => el.classList.add('animate'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
    );

    nodes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96) {
        el.classList.add('animate');
      } else {
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, [prefersReduced]);

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== 'mouse' || !heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setHeroHoverOffset({ x: nx, y: ny });
  };

  const headlineWords = HERO_HEADLINE.split(' ');

  return (
    <div ref={rootRef} className="min-h-screen bg-bg text-text-primary selection:bg-volt selection:text-[#0C0E0D]">
      {/* Scoped scroll & entrance animation rules (GPU transform + opacity only, <= 360ms) */}
      <style>{`
        @keyframes vyroScrollReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 18px, 0) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes vyroWordRise {
          0% {
            opacity: 0;
            transform: translate3d(0, 95%, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translate3d(0, 18px, 0) scale(0.985);
          will-change: transform, opacity;
        }
        .animate-on-scroll.animate {
          animation: vyroScrollReveal 340ms cubic-bezier(0.23, 1, 0.32, 1) var(--vyro-delay, 0ms) forwards;
        }
        .vyro-word-rise {
          display: inline-block;
          animation: vyroWordRise 320ms cubic-bezier(0.23, 1, 0.32, 1) var(--vyro-word-delay, 0ms) both;
        }
        .vyro-card-lift {
          transition: transform 0.18s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.18s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          .vyro-card-lift:hover {
            transform: translate3d(0, -3px, 0);
            border-color: rgba(212, 255, 58, 0.45);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-on-scroll,
          .animate-on-scroll.animate,
          .vyro-word-rise {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
          .vyro-card-lift:hover {
            transform: none !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="font-display font-bold text-[22px] text-text-primary tracking-tight">
              VYRO
            </span>
            <span className="w-2 h-2 rounded-full bg-volt" aria-hidden="true" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-secondary text-text-muted">
            <Link to="/marketplace" className="hover:text-text-primary transition-colors duration-150">
              Marketplace
            </Link>
            <Link to="/how-it-works" className="hover:text-text-primary transition-colors duration-150">
              How it works
            </Link>
            <Link to="/security" className="hover:text-text-primary transition-colors duration-150">
              Security
            </Link>
            <Link to="/dispute-policy" className="hover:text-text-primary transition-colors duration-150">
              Dispute policy
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

      {/* SECTION 1: ASYMMETRIC EDITORIAL HERO */}
      <section className="relative border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Editorial Headline & Value Prop */}
            <div className="lg:col-span-7 flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle text-secondary text-text-muted">
                <span className="vyro-live-indicator" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="text-text-primary font-semibold">AI Freelance Marketplace</span>
                <span aria-hidden="true">·</span>
                <span>PayPal Sandbox</span>
              </div>

              {/* Accessible Masked Word-by-Word Reveal */}
              <h1
                aria-label={HERO_HEADLINE}
                className="font-display font-bold text-[40px] sm:text-[56px] lg:text-[62px] text-text-primary leading-[1.06] tracking-tight"
              >
                {headlineWords.map((word, idx) => {
                  const isHighlight = word.startsWith('AI') || word.startsWith('PayPal');
                  return (
                    <span key={idx} className="inline-block overflow-hidden align-bottom mr-[0.26em] pb-[0.04em]" aria-hidden="true">
                      <span
                        className={`vyro-word-rise ${isHighlight ? 'text-volt' : ''}`}
                        style={{ '--vyro-word-delay': `${Math.min(idx * 35, 320)}ms` } as React.CSSProperties}
                      >
                        {word}
                      </span>
                    </span>
                  );
                })}
              </h1>

              <p className="text-body text-text-muted max-w-2xl leading-relaxed">
                Sellers describe a service in plain words and AI drafts the listing. Buyers type what they need with a budget and deadline. Independent AI agents negotiate price, delivery time, and scope while private limits remain quarantined on the server — and a human only steps in for exceptions.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
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

              {/* Compact Grounding Strip */}
              <div className="w-full pt-5 mt-2 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4 text-secondary">
                <div className="flex items-center gap-2 text-text-muted">
                  <EyeOff className="w-4 h-4 text-status-handled shrink-0" />
                  <span>Private limits stay hidden</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <ShieldCheck className="w-4 h-4 text-volt shrink-0" />
                  <span>Stage-locked refund shield</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Clock className="w-4 h-4 text-status-handled shrink-0" />
                  <span>72h review auto-release</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Framed Deal Card */}
            <div className="lg:col-span-5">
              <div
                ref={heroCardRef}
                onPointerMove={handleHeroPointerMove}
                onPointerLeave={() => setHeroHoverOffset(null)}
                style={
                  heroHoverOffset && !prefersReduced
                    ? {
                        transform: `translate3d(${(heroHoverOffset.x * 4).toFixed(1)}px, ${(heroHoverOffset.y * 4).toFixed(1)}px, 0)`,
                        transitionProperty: 'transform',
                        transitionDuration: '180ms',
                        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)'
                      }
                    : {
                        transform: 'translate3d(0, 0, 0)',
                        transitionProperty: 'transform',
                        transitionDuration: '240ms',
                        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)'
                      }
                }
                className="relative bg-surface border border-border-subtle rounded-surface p-6 flex flex-col gap-5"
              >
                {/* Structural Corner Brackets */}
                <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-volt" aria-hidden="true" />
                <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-volt" aria-hidden="true" />
                <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-volt" aria-hidden="true" />
                <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-volt" aria-hidden="true" />

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                  <div className="flex flex-col">
                    <span className="text-secondary font-semibold text-text-primary">
                      Brand Identity &amp; Design System
                    </span>
                    <span className="text-secondary text-text-muted">
                      Interactive negotiation snapshot
                    </span>
                  </div>
                  <StatusChip label={currentDemo.statusLabel} role={currentDemo.chipRole} size="sm" />
                </div>

                {/* Round Stepper Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-raised p-1 rounded-control border border-border-subtle">
                  {HERO_ROUNDS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDemoRound(r.id)}
                      className={`py-1.5 px-2 rounded-control text-secondary font-medium cursor-pointer transition-colors duration-150 ${
                        demoRound === r.id
                          ? 'bg-volt text-[#0C0E0D] font-bold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {r.tabLabel}
                    </button>
                  ))}
                </div>

                {/* Bilateral Animated Values */}
                <motion.div
                  key={demoRound}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, transform: 'translate3d(0, 6px, 0)' }}
                  animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                  transition={{ duration: prefersReduced ? 0.01 : 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="p-4 rounded-control bg-raised border border-border-subtle flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-secondary">
                      <span className="font-semibold text-text-primary">Buyer agent</span>
                      <Lock className="w-3.5 h-3.5 text-text-muted" aria-label="Private budget protected" />
                    </div>
                    <span className="font-display font-bold text-[28px] text-text-primary leading-tight">
                      {formatMoney(currentDemo.buyerPrice)}
                    </span>
                    <span className="text-secondary text-text-muted">
                      {currentDemo.buyerDays} days · Max $250 hidden
                    </span>
                  </div>

                  <div className="p-4 rounded-control bg-raised border border-border-subtle flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-secondary">
                      <span className="font-semibold text-text-primary">Seller agent</span>
                      <Lock className="w-3.5 h-3.5 text-text-muted" aria-label="Private floor protected" />
                    </div>
                    <span className="font-display font-bold text-[28px] text-text-primary leading-tight">
                      {formatMoney(currentDemo.sellerPrice)}
                    </span>
                    <span className="text-secondary text-text-muted">
                      {currentDemo.sellerDays} days · Floor $160 hidden
                    </span>
                  </div>
                </motion.div>

                {/* Outcome Explanation */}
                <div className="p-3.5 rounded-control bg-bg border border-border-subtle flex flex-col gap-1.5 text-secondary">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-status-handled">{currentDemo.deltaBadge}</span>
                    <span className="text-text-muted">5% disclosed fee</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{currentDemo.summary}</p>
                  <span className="text-text-muted">{currentDemo.escrowNote}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: INTERACTIVE PROTOCOL SIMULATOR (NEGOTIATION + ESCROW LIFECYCLE) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="animate-on-scroll flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border-subtle">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="text-secondary font-semibold text-volt">
                01 · Protocol Explorer
              </span>
              <h2 className="font-display font-bold text-[30px] sm:text-[36px] text-text-primary tracking-tight">
                See how agents converge — and how escrow stays safe after payment
              </h2>
            </div>

            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-control border border-border-subtle self-start">
              <button
                type="button"
                onClick={() => setSimMode('negotiate')}
                className={`px-3.5 py-2 rounded-control text-secondary font-medium cursor-pointer transition-colors duration-150 ${
                  simMode === 'negotiate' ? 'bg-volt text-[#0C0E0D] font-bold' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Agent Bargaining
              </button>
              <button
                type="button"
                onClick={() => setSimMode('escrow')}
                className={`px-3.5 py-2 rounded-control text-secondary font-medium cursor-pointer transition-colors duration-150 ${
                  simMode === 'escrow' ? 'bg-volt text-[#0C0E0D] font-bold' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Escrow &amp; Refund Rules
              </button>
            </div>
          </div>

          {simMode === 'negotiate' ? (
            <div className="bg-surface border border-border-subtle rounded-surface p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <StatusChip label={currentDemo.statusLabel} role={currentDemo.chipRole} size="md" />
                  <span className="text-secondary text-text-muted">Bilateral price &amp; deadline trade engine</span>
                </div>
                <div className="flex items-center gap-1.5 bg-raised p-1 rounded-control border border-border-subtle self-start">
                  {[1, 2, 3].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDemoRound(r as 1 | 2 | 3)}
                      className={`px-3 py-1.5 rounded-control text-secondary font-medium cursor-pointer transition-colors duration-150 ${
                        demoRound === r ? 'bg-volt text-[#0C0E0D] font-bold' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Round {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-body text-text-primary">Buyer Agent Offer</span>
                    <span className="text-secondary text-text-muted">Ceiling: $250 (Hidden)</span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display font-bold text-[34px] text-text-primary">
                      {formatMoney(currentDemo.buyerPrice)}
                    </span>
                    <span className="text-secondary text-text-muted">· {currentDemo.buyerDays} days turnaround</span>
                  </div>
                  <p className="text-secondary text-text-muted">
                    Concedes monotonically toward the intersection of price, delivery window, and included revisions.
                  </p>
                </div>

                <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-body text-text-primary">Seller Agent Ask</span>
                    <span className="text-secondary text-text-muted">Lowest: $160 (Hidden)</span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display font-bold text-[34px] text-text-primary">
                      {formatMoney(currentDemo.sellerPrice)}
                    </span>
                    <span className="text-secondary text-text-muted">· {currentDemo.sellerDays} days turnaround</span>
                  </div>
                  <p className="text-secondary text-text-muted">
                    Treats every buyer message as untrusted data while protecting minimum acceptable margin.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-control bg-bg border border-border-subtle text-secondary text-text-primary">
                {currentDemo.summary}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border-subtle rounded-surface p-6 sm:p-8 flex flex-col gap-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {ESCROW_STAGES.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveStageIdx(idx)}
                    className={`p-3.5 rounded-control border text-left cursor-pointer transition-colors duration-150 flex flex-col gap-1 ${
                      activeStageIdx === idx
                        ? 'bg-raised border-volt text-text-primary'
                        : 'bg-bg border-border-subtle text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span className={`text-secondary font-semibold ${activeStageIdx === idx ? 'text-volt' : 'text-text-muted'}`}>
                      {st.step}
                    </span>
                    <span className="font-display font-bold text-body text-text-primary">{st.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                  <span className="font-display font-bold text-[20px] text-text-primary">{currentStage.title}</span>
                  <StatusChip label={currentStage.refundRule} role={currentStage.role} size="sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-secondary">
                  <div className="p-4 rounded-control bg-surface border border-border-subtle flex flex-col gap-1">
                    <span className="font-semibold text-text-primary">Buyer Controls</span>
                    <span className="text-text-muted leading-relaxed">{currentStage.buyerPowers}</span>
                  </div>
                  <div className="p-4 rounded-control bg-surface border border-border-subtle flex flex-col gap-1">
                    <span className="font-semibold text-text-primary">Seller Protections</span>
                    <span className="text-text-muted leading-relaxed">{currentStage.sellerPowers}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: CORE GUARANTEES GRID */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border-subtle">
        <div className="animate-on-scroll flex flex-col gap-2 mb-10">
          <span className="text-secondary font-semibold text-volt">02 · Core Architecture</span>
          <h2 className="font-display font-bold text-[30px] sm:text-[36px] text-text-primary tracking-tight">
            Built so neither side gets burned
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              tag: 'Privacy Quarantine',
              title: 'Zero-Knowledge Privacy',
              body: 'Buyer budgets and seller lowest prices stay strictly quarantined on the server. Counterparty messages are treated as untrusted data and never see private limits.',
              delay: '0ms'
            },
            {
              icon: Sliders,
              tag: 'Multi-Issue Engine',
              title: 'Price, Speed & Scope Trades',
              body: 'Agents negotiate price, turnaround days, and included revisions in integer-cent steps, with plain-language "Why?" explanations for every decision.',
              delay: '60ms'
            },
            {
              icon: FileCheck,
              tag: 'Refund Fail-Safe',
              title: 'Stage-Locked Escrow Shield',
              body: 'Before work starts, buyers can cancel for a full refund. After delivery, self-refund locks and SHA-256 hashed delivery evidence backs a 72-hour review & dispute flow.',
              delay: '120ms'
            }
          ].map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                style={{ '--vyro-delay': pillar.delay } as React.CSSProperties}
                className="animate-on-scroll vyro-card-lift p-6 rounded-surface bg-surface border border-border-subtle flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-raised border border-border-subtle text-volt flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-secondary text-text-muted">{pillar.tag}</span>
                </div>
                <h3 className="font-display font-bold text-[20px] text-text-primary">
                  {pillar.title}
                </h3>
                <p className="text-secondary text-text-muted leading-relaxed">
                  {pillar.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: ARCHITECTURAL METRICS STRIP */}
      <section className="bg-surface border-y border-border-subtle">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          {[
            { metric: '$0', desc: 'Agreed above your hard limit without your OK', delay: '0ms' },
            { metric: '5%', desc: 'Service fee disclosed before PayPal checkout', delay: '40ms' },
            { metric: '72h', desc: 'Buyer inspection window before auto-release', delay: '80ms' },
            { metric: '100%', desc: 'Per-account session and data isolation', delay: '120ms' }
          ].map((item) => (
            <div
              key={item.metric + item.desc}
              style={{ '--vyro-delay': item.delay } as React.CSSProperties}
              className="animate-on-scroll px-6 py-10 flex flex-col gap-2 text-center"
            >
              <span className="font-display font-bold text-[42px] text-text-primary leading-none">
                {item.metric}
              </span>
              <span className="text-secondary text-text-muted">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: 4-STEP PROCUREMENT & ESCROW WORKFLOW */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="animate-on-scroll flex flex-col items-start sm:items-center sm:text-center gap-2 mb-12">
          <span className="text-secondary font-semibold text-volt">
            03 · End-to-End Lifecycle
          </span>
          <h2 className="font-display font-bold text-[30px] sm:text-[38px] text-text-primary tracking-tight">
            How autonomous procurement works
          </h2>
          <p className="text-body text-text-muted max-w-xl">
            Every step from initial request to PayPal settlement runs under server-verified rules and an append-only ledger.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: '01',
              title: 'State what you need',
              desc: 'Describe your requirements in plain words and set your private budget, deadline, and flexibility.',
              delay: '0ms'
            },
            {
              step: '02',
              title: 'Agent discovery & intake',
              desc: 'Your agent matches active listings respecting seller capacity limits and seller intake rules.',
              delay: '50ms'
            },
            {
              step: '03',
              title: 'Autonomous bargaining',
              desc: 'Agents trade price, turnaround, and revisions monotonically until reaching consensus or routing to Needs your OK.',
              delay: '100ms'
            },
            {
              step: '04',
              title: 'PayPal Checkout & Escrow Payout',
              desc: 'Buyers pay via PayPal Orders API (sandbox). VYRO holds seller funds until work is delivered and accepted, then releases via PayPal Payouts API (with test-only simulated fallback).',
              delay: '150ms'
            }
          ].map((item) => (
            <div
              key={item.step}
              style={{ '--vyro-delay': item.delay } as React.CSSProperties}
              className="animate-on-scroll vyro-card-lift p-6 bg-surface rounded-surface border border-border-subtle flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-2.5">
                <span className="text-secondary font-bold text-volt">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-[18px] text-text-primary">
                  {item.title}
                </h3>
                <p className="text-secondary text-text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="pt-3 border-t border-border-subtle flex items-center gap-1.5 text-secondary text-status-handled">
                <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                <span>Server enforced</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: FRAMED CLOSING CTA MONOLITH */}
      <section className="pb-20 pt-4 px-4 sm:px-6">
        <div className="animate-on-scroll relative max-w-5xl mx-auto p-10 sm:p-16 rounded-surface bg-surface border border-border-subtle text-center flex flex-col items-center gap-6">
          <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-volt" aria-hidden="true" />
          <span className="pointer-events-none absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-volt" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-volt" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-volt" aria-hidden="true" />

          <h2 className="font-display font-bold text-[32px] sm:text-[46px] text-text-primary tracking-tight max-w-2xl leading-[1.1]">
            Ready to let AI handle your commerce?
          </h2>
          <p className="text-body text-text-muted max-w-xl leading-relaxed">
            Create an isolated account in seconds. Buy or sell services with automated bargaining, delivery proofs, and PayPal escrow protection.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              variant="volt"
              size="lg"
              onClick={() => navigate('/signup')}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Create free account
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/dispute-policy')}
            >
              Read escrow &amp; dispute rules
            </Button>
          </div>
        </div>
      </section>

      {/* Semantic Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-border-subtle bg-surface">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-secondary text-text-muted">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-text-primary text-[18px]">
              VYRO
            </span>
            <span aria-hidden="true">·</span>
            <span>Autonomous AI Commerce &amp; PayPal Escrow</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/marketplace" className="hover:text-text-primary transition-colors duration-150">
              Marketplace
            </Link>
            <Link to="/how-it-works" className="hover:text-text-primary transition-colors duration-150">
              How it works
            </Link>
            <Link to="/dispute-policy" className="hover:text-text-primary transition-colors duration-150">
              Dispute policy
            </Link>
            <Link to="/help" className="hover:text-text-primary transition-colors duration-150">
              Help
            </Link>
            <Link to="/terms" className="hover:text-text-primary transition-colors duration-150">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-text-primary transition-colors duration-150">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
