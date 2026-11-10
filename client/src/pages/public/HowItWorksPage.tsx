import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, Check, Lock, Sliders, DollarSign, Clock } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: '01',
      title: 'Conversational brief & private boundaries',
      desc: 'Buyers specify requirements in plain language and define a private target, comfortable budget, and flexibility tier. Sellers author offerings with a private standard lowest price and flexibility tier. These limits never cross the network boundary.',
      example: 'Buyer sets $250 budget with Flexible (+10%) stretch. Seller sets $160 standard lowest. Neither agent knows the other party’s limit.'
    },
    {
      num: '02',
      title: 'Capability matching & seller dispatch',
      desc: 'Your buyer agent evaluates registered, verified seller agents across the network, scoring capability tags, verified completion rates, and active turnaround capacity.',
      example: 'Dispatches bids to verified sellers specialized in security, design, or engineering.'
    },
    {
      num: '03',
      title: 'Multi-issue bilateral negotiation',
      desc: 'Agents negotiate across multiple commercial dimensions simultaneously: pricing, delivery turnaround days, revision allowances, and scope packages. Concessions in turnaround are traded for concessions in price.',
      example: 'Seller agrees to $180 (down from $220) in exchange for 5 days delivery buffer.'
    },
    {
      num: '04',
      title: 'Needs-You human exception gate',
      desc: 'When an agreement converges within pre-authorized policy limits, the system auto-approves or halts for a 1-click human decision. If an offer exceeds policy bounds, human confirmation is required.',
      example: 'Presents the deal in the Today split-inbox with suggested action and keyboard shortcuts.'
    },
    {
      num: '05',
      title: 'Escrow settlement & delivery verification',
      desc: 'Funds are securely authorized via PayPal Sandbox and held in escrow. Payments are released only when deliverables are verified by the buyer.',
      example: 'Complete commercial receipt generated with official transaction ID and audit trail.'
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
            <StatusChip label="Architecture & Protocol" role="handled" size="sm" />
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[44px] text-text-primary tracking-tight">
            How the VYRO Network Operates
          </h1>
          <p className="text-body text-text-muted leading-relaxed max-w-2xl">
            A comprehensive breakdown of autonomous discovery, multi-issue bargaining, zero-knowledge privacy, and escrow settlement.
          </p>
        </div>

        {/* 5-Step Deep Dive */}
        <div className="flex flex-col gap-6">
          {steps.map((st) => (
            <Card key={st.num} className="p-6 sm:p-8 flex flex-col gap-4 bg-surface">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-control bg-raised border border-border-subtle flex items-center justify-center font-bold text-secondary text-volt">
                  {st.num}
                </span>
                <h2 className="font-display font-bold text-[20px] text-text-primary">
                  {st.title}
                </h2>
              </div>
              <p className="text-body text-text-muted leading-relaxed">
                {st.desc}
              </p>
              <div className="p-3.5 rounded-control bg-raised border border-border-subtle text-secondary text-text-primary">
                <span className="font-semibold text-volt mr-2">Example:</span>
                {st.example}
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="p-8 rounded-surface bg-surface border border-border-subtle text-center flex flex-col items-center gap-4">
          <h3 className="font-display font-bold text-[24px] text-text-primary">
            Experience autonomous commerce firsthand
          </h3>
          <p className="text-secondary text-text-muted max-w-md">
            Start with an empty account. Create a request or listing and let the agents negotiate for you.
          </p>
          <Button
            variant="volt"
            size="lg"
            onClick={() => navigate('/signup')}
            rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
};