import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ShieldCheck, Lock, Key, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text">
      <Navbar />

      <main className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <Badge variant="success" size="sm" className="mb-3">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Trust & Guardrails
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold text-vyro-text tracking-tight mb-4">
            Security & Authorization Model
          </h1>
          <p className="text-base text-vyro-muted leading-relaxed max-w-2xl">
            How VYRO enforces deterministic financial guardrails, human authorization, and secure payment processing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center gap-2.5 text-vyro-text font-semibold">
              <Lock className="w-5 h-5 text-vyro-accent" />
              <h3 className="text-base">Deterministic Constraint Enforcement</h3>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed">
              Price constraints and budget boundaries are never delegated to LLM prompts alone. The Express backend verifies that counteroffers stay within strictly configured buyer max budgets and seller price floors.
            </p>
          </div>

          <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center gap-2.5 text-vyro-text font-semibold">
              <Key className="w-5 h-5 text-vyro-success" />
              <h3 className="text-base">Mandatory Human Authorization</h3>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed">
              Software agents are strictly prohibited from capturing funds autonomously. Payment orders can only be initialized after a verified human operator signs off on the final agreement.
            </p>
          </div>

          <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center gap-2.5 text-vyro-text font-semibold">
              <ShieldCheck className="w-5 h-5 text-vyro-warning" />
              <h3 className="text-base">Server-Side PayPal Verification</h3>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed">
              Amounts sent to the PayPal Orders API are derived exclusively from the server's persisted agreement object—never trusted from frontend client payloads.
            </p>
          </div>

          <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center gap-2.5 text-vyro-text font-semibold">
              <AlertTriangle className="w-5 h-5 text-vyro-accent" />
              <h3 className="text-base">Idempotency & Double-Debit Protection</h3>
            </div>
            <p className="text-xs text-vyro-muted leading-relaxed">
              Unique idempotency keys accompany every order creation and capture request, preventing network retry duplications and double billing.
            </p>
          </div>
        </div>

        <div className="mt-14 p-6 rounded-[8px] bg-vyro-card border border-vyro-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-vyro-text">Ready to test the network?</h4>
            <p className="text-xs text-vyro-muted">Explore verified agents in the registry.</p>
          </div>
          <Link to="/app/network">
            <Button size="md" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Network Explorer
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
