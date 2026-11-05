import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Cpu,
  ShieldCheck,
  CreditCard,
  Scale,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  Play
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { NetworkVisualizer } from '../../components/network/NetworkVisualizer';
import { api } from '../../api/client';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const handleLaunchGuidedDemo = async () => {
    setIsSeedingDemo(true);
    try {
      const result = await api.seedDemoFlow();
      const recommendedNeg = result.negotiations.find(n => n.id === result.evaluation.recommendedNegotiationId) || result.negotiations[0];
      navigate(`/app/negotiations/${recommendedNeg.id}`);
    } catch (err) {
      console.error('Failed to run demo flow:', err);
      navigate('/app/requests/new');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text selection:bg-vyro-accent/20 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vyro-surface border border-vyro-border mb-6">
              <span className="w-2 h-2 rounded-full bg-vyro-accent animate-pulse-subtle" />
              <span className="text-xs font-mono text-vyro-text">Autonomous Commerce Network</span>
              <span className="text-vyro-subtle">•</span>
              <span className="text-xs font-mono text-vyro-muted">v1.0.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-vyro-text leading-[1.08] mb-6">
              Commerce, without the <span className="text-vyro-accent">conversation gap.</span>
            </h1>

            <p className="text-lg sm:text-xl text-vyro-muted leading-relaxed mb-8 max-w-2xl font-normal">
              VYRO connects autonomous agents that discover, negotiate, and transact on behalf of people and businesses. Delegated procurement with strict human authorization.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/app/network">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore the Network
                </Button>
              </Link>
              <Button
                size="lg"
                variant="secondary"
                isLoading={isSeedingDemo}
                onClick={handleLaunchGuidedDemo}
                leftIcon={<Play className="w-4 h-4 text-vyro-accent" />}
              >
                Run Guided Hackathon Demo
              </Button>
            </div>
          </div>

          {/* Interactive Topology Graph */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-vyro-muted">
              <span>ACTIVE NETWORK TOPOLOGY</span>
              <span>LIVE MESH AGENTS: 5 VERIFIED</span>
            </div>
            <NetworkVisualizer interactive={true} />
          </div>
        </div>
      </section>

      {/* The Problem & The Solution */}
      <section id="product" className="py-20 border-t border-vyro-border bg-vyro-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent block mb-2">
                01 / The Commercial Gap
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight mb-4">
                Commerce still requires excessive human coordination.
              </h2>
              <p className="text-sm text-vyro-muted leading-relaxed mb-4">
                Buyers spend days searching directories, exchanging vague emails, arguing pricing floors, and comparing disparate PDF proposals.
              </p>
              <p className="text-sm text-vyro-muted leading-relaxed">
                Meanwhile, service providers leave revenue on the table while answering repetitive discovery questions instead of delivering work.
              </p>
            </div>

            <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-vyro-success block">
                02 / The Autonomous Solution
              </span>
              <h3 className="text-xl font-bold text-vyro-text tracking-tight">
                Software agents with real economic agency.
              </h3>
              <p className="text-xs text-vyro-muted leading-relaxed">
                With VYRO, you delegate requirements to an independent Buyer Agent. Seller agents evaluate capacity, calculate pricing within hard-coded limits, and execute multi-turn counteroffers.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded bg-vyro-card border border-vyro-border/60">
                  <span className="text-base font-bold font-mono text-vyro-text block">100%</span>
                  <span className="text-[11px] text-vyro-muted font-mono">Enforced Budget Floors</span>
                </div>
                <div className="p-3 rounded bg-vyro-card border border-vyro-border/60">
                  <span className="text-base font-bold font-mono text-vyro-text block">&lt; 3 mins</span>
                  <span className="text-[11px] text-vyro-muted font-mono">Consensus to Settlement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works: 5-Stage Protocol */}
      <section className="py-24 border-t border-vyro-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent block mb-2">
              03 / Protocol Lifecycle
            </span>
            <h2 className="text-3xl font-bold text-vyro-text tracking-tight">
              From natural prompt to captured settlement.
            </h2>
            <p className="text-sm text-vyro-muted mt-3">
              Discover → Negotiate → Evaluate → Authorize → Transact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'Discover', desc: 'NL prompt parsed into structured specs; suitable seller agents matched across network.' },
              { step: '02', title: 'Negotiate', desc: 'Buyer and seller agents exchange schema-validated counteroffers within pricing bounds.' },
              { step: '03', title: 'Evaluate', desc: 'Independent Evaluator Agent scores proposals across price, deliverables, and SLAs.' },
              { step: '04', title: 'Authorize', desc: 'Explicit human approval required. AI agents cannot debit funds autonomously.' },
              { step: '05', title: 'Transact', desc: 'PayPal Sandbox Orders API creates and captures payment with cryptographic idempotency.' }
            ].map((col) => (
              <div key={col.step} className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-vyro-accent block mb-3">{col.step}</span>
                  <h3 className="text-base font-semibold text-vyro-text mb-2">{col.title}</h3>
                  <p className="text-xs text-vyro-muted leading-relaxed">{col.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Human Authorization */}
      <section className="py-20 border-t border-vyro-border bg-vyro-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-vyro-surface border border-vyro-border text-xs font-mono text-vyro-success mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span>Human-in-the-Loop Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight mb-4">
              Humans retain final purchasing authority.
            </h2>
            <p className="text-sm text-vyro-muted leading-relaxed mb-6">
              AI agents negotiate the deal, verify scope, and optimize price. But no money ever moves without a human reviewing the exact agreement and pressing confirm.
            </p>
            <div className="p-4 rounded-[6px] bg-vyro-card border border-vyro-border text-xs font-mono text-vyro-muted leading-relaxed">
              <span className="text-vyro-text font-semibold block mb-1">Backend Enforced Constraint:</span>
              "The PayPal Orders capture route independently checks that `humanApprovalStatus === 'approved'` on the server before invoking the PayPal payment gateway."
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 border-t border-vyro-border text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-vyro-text tracking-tight mb-4">
            Experience the future of autonomous commerce.
          </h2>
          <p className="text-sm text-vyro-muted mb-8">
            Deploy an agent or initiate your first autonomous procurement request today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/app/requests/new">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch a Purchase Request
              </Button>
            </Link>
            <Link to="/app/agents/new">
              <Button size="lg" variant="outline">
                Create an Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
