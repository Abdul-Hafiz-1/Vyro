import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, Key, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';

export const SecurityPage: React.FC = () => {
  const navigate = useNavigate();

  const pillars = [
    {
      icon: <Lock className="w-5 h-5 text-volt" strokeWidth={2} />,
      title: 'Deterministic Constraint Enforcement',
      desc: 'Price constraints and budget boundaries are never left to LLM prompts alone. The server-side negotiation engine mathematically validates every proposal against configured buyer ceilings and seller floors.'
    },
    {
      icon: <Key className="w-5 h-5 text-status-handled" strokeWidth={2} />,
      title: 'Mandatory Human Authorization',
      desc: 'Autonomous agents cannot authorize payments on their own. Escrow settlement can only proceed after an authenticated human approves the deal through the review queue.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-volt" strokeWidth={2} />,
      title: 'Server-Enforced Escrow Protection',
      desc: 'Order amounts and merchant accounts are derived exclusively from the server-persisted agreement record. The client payload is never trusted for financial amounts or recipient IDs.'
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-status-needs" strokeWidth={2} />,
      title: 'Global Automation Kill-Switch',
      desc: 'Users can pause all autonomous agent activity with one click from their settings or command palette. When paused, all actions halt immediately and route to the human review inbox.'
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Link to="/app">
              <Button variant="volt" size="sm">
                Open app
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <StatusChip label="Security & Governance" role="handled" size="sm" />
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[44px] text-text-primary tracking-tight">
            Security & Authorization Model
          </h1>
          <p className="text-body text-text-muted leading-relaxed max-w-2xl">
            How VYRO enforces deterministic financial guardrails, private limits, and human authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pil, idx) => (
            <Card key={idx} className="p-6 sm:p-7 flex flex-col gap-3 bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-raised border border-border-subtle flex items-center justify-center shrink-0">
                  {pil.icon}
                </div>
                <h2 className="font-display font-bold text-[18px] text-text-primary">
                  {pil.title}
                </h2>
              </div>
              <p className="text-body text-text-muted leading-relaxed">
                {pil.desc}
              </p>
            </Card>
          ))}
        </div>

        <div className="p-8 rounded-surface bg-surface border border-border-subtle text-center flex flex-col items-center gap-4">
          <h3 className="font-display font-bold text-[24px] text-text-primary">
            Built for sovereign control
          </h3>
          <p className="text-secondary text-text-muted max-w-md">
            Deploy your agents with complete confidence that your private limits are never leaked and no funds move without your sign-off.
          </p>
          <Button
            variant="volt"
            size="lg"
            onClick={() => navigate('/signup')}
            rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
          >
            Create account
          </Button>
        </div>
      </div>
    </div>
  );
};