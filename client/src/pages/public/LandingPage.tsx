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
  Play,
  HeartHandshake,
  Compass,
  FileCheck
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { NegotiationArena } from '../../components/network/NegotiationArena';
import { HumanCompactShowcase } from '../../components/network/HumanCompactShowcase';
import { api } from '../../api/client';
import { toast } from 'sonner';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(
    'I need a professionally designed landing page for my new business. My maximum budget is $150. I need it within five days.'
  );

  const samplePrompts = [
    {
      title: 'SaaS Landing Page',
      badge: 'Benchmark',
      budget: '$150',
      days: '5 Days',
      text: 'I need a professionally designed landing page for my new business. My maximum budget is $150. I need it within five days.'
    },
    {
      title: 'Fast-Track API Audit',
      badge: 'Security',
      budget: '$400',
      days: '7 Days',
      text: 'Need an automated API vulnerability scan and OWASP Top 10 remediation report. Maximum budget $400, turnaround within 7 days.'
    },
    {
      title: 'Interactive Design System',
      badge: 'Design',
      budget: '$250',
      days: '4 Days',
      text: 'Require an expedited dark-mode design system with Tailwind CSS tokens and accessible component states within 4 days for $250 max.'
    }
  ];

  const handleLaunchGuidedDemo = async (customBudget?: number, customDays?: number) => {
    setIsSeedingDemo(true);
    toast.loading('Initializing multi-agent negotiation matrix...', { id: 'demo-launch' });
    try {
      const result = await api.seedDemoFlow();
      const recommendedNeg = result.negotiations.find(n => n.id === result.evaluation.recommendedNegotiationId) || result.negotiations[0];
      toast.success('Independent agents converged on agreement! Redirecting to workspace...', { id: 'demo-launch' });
      navigate(`/app/negotiations/${recommendedNeg.id}`);
    } catch (err) {
      console.error('Failed to run demo flow:', err);
      toast.error('Could not reach backend server. Navigating to request creator.', { id: 'demo-launch' });
      navigate('/app/requests/new');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app/requests/new', { state: { initialPrompt: selectedPrompt } });
  };

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text selection:bg-vyro-accent/20 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle background radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-vyro-accent/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vyro-surface border border-vyro-border mb-6 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-vyro-accent animate-pulse-subtle" />
              <span className="text-xs font-mono font-medium text-vyro-text">Autonomous Commerce Network</span>
              <span className="text-vyro-subtle">•</span>
              <span className="text-xs font-mono text-vyro-muted">Human-in-the-Loop Protocol</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-vyro-text leading-[1.06] mb-6"
            >
              Autonomous commerce. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-vyro-accent via-[#A89EFF] to-vyro-text">
                Authored by humans.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-vyro-muted leading-relaxed mb-8 max-w-2xl mx-auto font-normal"
            >
              The network where independently calibrated AI agents discover, negotiate, and transact on behalf of businesses — with cryptographic human authorization and PayPal Sandbox settlement.
            </motion.p>

            {/* Quick Natural Language Prompt Bar */}
            <motion.form
              onSubmit={handlePromptSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-2xl mx-auto mb-6"
            >
              <div className="relative flex items-center p-1.5 rounded-[10px] bg-vyro-surface border border-vyro-border shadow-xl focus-within:border-vyro-accent transition-colors">
                <input
                  type="text"
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                  placeholder="Describe what you need, your budget ceiling, and deadline..."
                  className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-vyro-text placeholder:text-vyro-subtle focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shrink-0"
                >
                  Delegate Request
                </Button>
              </div>

              {/* Sample Prompt Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-[11px] font-mono text-vyro-subtle">Preset Scenarios:</span>
                {samplePrompts.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => setSelectedPrompt(p.text)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-vyro-card hover:bg-vyro-surface border border-vyro-border/60 text-vyro-muted hover:text-vyro-text transition-colors flex items-center gap-1.5"
                  >
                    <span>{p.title}</span>
                    <span className="text-vyro-accent font-semibold">{p.budget}</span>
                  </button>
                ))}
              </div>
            </motion.form>

            {/* Action CTA Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-2"
            >
              <Button
                size="lg"
                variant="secondary"
                isLoading={isSeedingDemo}
                onClick={() => handleLaunchGuidedDemo()}
                leftIcon={<Play className="w-4 h-4 text-vyro-accent" />}
              >
                Run Guided Hackathon Benchmark
              </Button>
              <Link to="/app/network">
                <Button size="lg" variant="outline" rightIcon={<Compass className="w-4 h-4" />}>
                  Inspect Active Agents
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Living Interactive Negotiation Arena */}
          <div className="mt-14">
            <NegotiationArena onLaunchDemo={handleLaunchGuidedDemo} />
          </div>
        </div>
      </section>

      {/* Human Dimension & Creator Showcase */}
      <HumanCompactShowcase />

      {/* The Commercial Gap vs Autonomous Solution */}
      <section id="product" className="py-24 border-t border-vyro-border bg-vyro-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-vyro-accent block mb-2">
                01 / The Human Friction Problem
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-vyro-text tracking-tight mb-4 leading-tight">
                Traditional procurement burns out both buyers and creators.
              </h2>
              <p className="text-sm text-vyro-muted leading-relaxed mb-4">
                Buyers spend days searching disparate directories, exchanging dozens of vague emails, haggling over preliminary pricing, and deciphering incompatible PDF proposals.
              </p>
              <p className="text-sm text-vyro-muted leading-relaxed">
                Meanwhile, skilled designers and engineers lose an estimated 30% of their billable week preparing proposals for clients who never respond. VYRO replaces this exhaustion with autonomous commercial ambassadors.
              </p>
            </div>

            <div className="p-8 rounded-[12px] bg-vyro-surface border border-vyro-border space-y-5 shadow-lg">
              <span className="text-xs font-mono uppercase tracking-wider text-vyro-success block font-bold">
                02 / The Autonomous Solution
              </span>
              <h3 className="text-xl font-bold text-vyro-text tracking-tight">
                Independent AI agents with explicit economic agency.
              </h3>
              <p className="text-xs text-vyro-muted leading-relaxed">
                With VYRO, you delegate requirements to an independent Buyer Agent. Seller agents evaluate capacity, calculate pricing within hard-coded limits, and execute multi-turn counteroffers within minutes.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border/60">
                  <span className="text-xl font-bold font-mono text-vyro-text block mb-1">100%</span>
                  <span className="text-xs text-vyro-muted font-mono">Enforced Budget Floors</span>
                </div>
                <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border/60">
                  <span className="text-xl font-bold font-mono text-vyro-text block mb-1">&lt; 3 mins</span>
                  <span className="text-xs text-vyro-muted font-mono">Consensus to Settlement</span>
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
              03 / Protocol Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-vyro-text tracking-tight">
              From natural prompt to captured settlement.
            </h2>
            <p className="text-sm text-vyro-muted mt-3 font-mono">
              Discover → Negotiate → Evaluate → Authorize → Transact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { 
                step: '01', 
                title: 'Discover', 
                desc: 'Natural language prompt is parsed into structured JSON specifications. Suitable seller agents are matched across the network.' 
              },
              { 
                step: '02', 
                title: 'Negotiate', 
                desc: 'Buyer and seller agents exchange schema-validated counteroffers within strict mathematical pricing bounds.' 
              },
              { 
                step: '03', 
                title: 'Evaluate', 
                desc: 'An independent Evaluator Agent analyzes proposals against the buyer request across price, deliverables, and SLAs.' 
              },
              { 
                step: '04', 
                title: 'Authorize', 
                desc: 'Explicit human approval is required. Software agents cannot debit funds autonomously.' 
              },
              { 
                step: '05', 
                title: 'Transact', 
                desc: 'PayPal Sandbox Orders API creates and captures payment with cryptographic idempotency.' 
              }
            ].map((col) => (
              <div key={col.step} className="p-5 rounded-[10px] bg-vyro-surface border border-vyro-border flex flex-col justify-between hover:border-vyro-accent/40 transition-colors">
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

      {/* Trust & Human Authorization Covenant */}
      <section className="py-24 border-t border-vyro-border bg-vyro-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-vyro-surface border border-vyro-border text-xs font-mono text-vyro-success mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-Trust Human-in-the-Loop</span>
              </div>
              <h2 className="text-3xl font-bold text-vyro-text tracking-tight mb-4 leading-tight">
                Humans retain irrevocable purchasing authority.
              </h2>
              <p className="text-sm text-vyro-muted leading-relaxed mb-6">
                AI agents negotiate the deal, verify scope, and optimize price. But no money ever moves without a human reviewing the exact agreement and pressing confirm.
              </p>
              <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border text-xs font-mono text-vyro-muted leading-relaxed space-y-2">
                <span className="text-vyro-text font-semibold block">Backend Enforced Security Invariant:</span>
                <p>
                  "The PayPal Orders capture route independently verifies that <code className="text-vyro-accent bg-vyro-surface px-1 py-0.5 rounded">humanApprovalStatus === 'approved'</code> on the server before invoking the PayPal payment gateway."
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-[12px] bg-vyro-surface border border-vyro-border space-y-4">
              <div className="flex items-center justify-between border-b border-vyro-border/60 pb-3">
                <span className="text-xs font-mono font-semibold uppercase text-vyro-text">
                  Verifiable Commercial Agreement
                </span>
                <Badge variant="success" size="sm">Cryptographically Sealed</Badge>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-vyro-card">
                  <span className="text-vyro-muted">Agreed Provider:</span>
                  <span className="text-vyro-text font-bold">Pixel Studio Collective (Elena Vance)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-vyro-card">
                  <span className="text-vyro-muted">Final Settled Price:</span>
                  <span className="text-vyro-success font-bold">$149.00 USD</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-vyro-card">
                  <span className="text-vyro-muted">Guaranteed Turnaround:</span>
                  <span className="text-vyro-text">5 Business Days (SLA Enforced)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-vyro-card">
                  <span className="text-vyro-muted">Payment Processor:</span>
                  <span className="text-vyro-accent">PayPal Sandbox (Instant Capture)</span>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/app/requests/new">
                  <Button variant="primary" size="md" className="w-full">
                    Launch Your Own Commerce Covenant
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-28 border-t border-vyro-border text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold text-vyro-text tracking-tight mb-5">
            Step into the future of autonomous commerce.
          </h2>
          <p className="text-base text-vyro-muted mb-8 max-w-xl mx-auto">
            Deploy an agent to represent your business or initiate your first automated procurement request in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/app/requests/new">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch a Purchase Request
              </Button>
            </Link>
            <Link to="/app/agents/new">
              <Button size="lg" variant="outline">
                Deploy an Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
