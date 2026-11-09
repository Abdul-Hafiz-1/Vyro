import React, { useState } from 'react';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Chip } from '../components/common/Chip';
import { ModeSwitch } from '../components/common/ModeSwitch';
import { Avatar } from '../components/common/Avatar';
import { DecisionCard } from '../components/common/DecisionCard';
import { DealNode } from '../components/common/DealNode';
import { SummaryPanel } from '../components/common/SummaryPanel';
import { Drawer } from '../components/common/Drawer';
import { EmptyState } from '../components/common/EmptyState';
import { Search, Moon, SunMedium, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const StyleguidePage: React.FC = () => {
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
  const [selectedChip, setSelectedChip] = useState('Landing pages');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showVoltSweep, setShowVoltSweep] = useState(false);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };

  const triggerDealAgreedMoment = () => {
    setShowVoltSweep(true);
    toast.success('Deal agreed at $149! Terms locked securely.');
    setTimeout(() => setShowVoltSweep(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary p-6 md:p-12 max-w-[1120px] mx-auto flex flex-col gap-12 selection:bg-volt selection:text-[#0C0E0D]">
      {/* Header & Theme Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusChip label="Design System" role="neutral" size="sm" />
            <span className="text-secondary text-text-muted">Linear & Stripe Reference Foundation</span>
          </div>
          <h1 className="font-display font-bold text-hero text-text-primary">
            VYRO System Specs
          </h1>
          <p className="text-body text-text-muted max-w-[620px] mt-2">
            Calm and premium dark-first architecture with Volt lime accent, razor-thin 1px borders, and zero decorative noise.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={toggleTheme}
          icon={isLight ? <Moon className="w-4 h-4" /> : <SunMedium className="w-4 h-4" />}
        >
          {isLight ? 'Switch to Dark' : 'Switch to Light'}
        </Button>
      </div>

      {/* Volt Agreement Banner Showcase */}
      {showVoltSweep && (
        <div className="relative overflow-hidden h-2 rounded-full bg-raised">
          <div className="absolute inset-0 bg-volt animate-volt-sweep" />
        </div>
      )}

      {/* 1. PALETTE & CONTRAST */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Tokens & Color Discipline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[
            { name: 'Volt Lime', var: 'bg-volt', text: 'text-[#0C0E0D]', desc: 'Primary fill only' },
            { name: 'Surface', var: 'bg-surface', text: 'text-text-primary', desc: 'Cards, panels' },
            { name: 'Raised', var: 'bg-raised', text: 'text-text-primary', desc: 'Hover, secondary' },
            { name: 'Border', var: 'border border-border-subtle bg-bg', text: 'text-text-muted', desc: '1px hairlines' },
            { name: 'Handled', var: 'bg-status-handled/15 border border-status-handled/30', text: 'text-status-handled', desc: 'Paid, complete' },
            { name: 'Needs You', var: 'bg-status-needs/15 border border-status-needs/30', text: 'text-status-needs', desc: 'Exceptions' },
          ].map((c) => (
            <div key={c.name} className="p-4 rounded-surface border border-border-subtle bg-surface flex flex-col gap-2">
              <div className={`w-full h-12 rounded-control flex items-center justify-center font-bold text-secondary ${c.var} ${c.text}`}>
                Sample
              </div>
              <span className="font-semibold text-secondary text-text-primary">{c.name}</span>
              <span className="text-secondary text-text-muted">{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. BUTTONS & ACTIONS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-section text-text-primary">
            Buttons & Action Controls
          </h2>
          <Button variant="volt" size="sm" onClick={triggerDealAgreedMoment} icon={<Zap className="w-4 h-4" />}>
            Test Agreement Moment
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-6 bg-surface border border-border-subtle rounded-surface">
          <Button variant="volt" size="md">
            Volt Primary
          </Button>
          <Button variant="secondary" size="md">
            Secondary Surface
          </Button>
          <Button variant="ghost" size="md">
            Ghost Action
          </Button>
          <Button variant="destructive" size="md">
            Destructive
          </Button>
          <Button variant="volt" size="md" disabled>
            Disabled
          </Button>
          <Button variant="volt" size="md" isLoading>
            Loading
          </Button>
        </div>
      </section>

      {/* 3. STATUS CHIPS & MODESWITCH */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Status Chips & Workspace Switch
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-surface border border-border-subtle rounded-surface">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Needs your OK" role="needsYou" />
            <StatusChip label="Negotiating" role="inProgress" />
            <StatusChip label="Paid & Complete" role="handled" />
            <StatusChip label="Declined" role="declined" />
            <StatusChip label="Design tag" role="neutral" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-secondary text-text-muted">Mode Switch:</span>
            <ModeSwitch />
          </div>
        </div>
      </section>

      {/* 4. CHIPS & INPUTS */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Inputs & Filter Chips
        </h2>
        <div className="p-6 bg-surface border border-border-subtle rounded-surface flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {['Landing pages', 'Brand identity', 'Smart contract audit', 'Mobile UI'].map((chip) => (
              <Chip
                key={chip}
                label={chip}
                selected={selectedChip === chip}
                onClick={() => setSelectedChip(chip)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="What service do you need?"
              placeholder="e.g. Modern landing page in Figma"
              icon={<Search className="w-4 h-4 text-text-muted" />}
            />
            <Input
              label="Budget ceiling ($)"
              placeholder="150"
              type="number"
              helperText="We will never offer higher than this."
            />
          </div>
        </div>
      </section>

      {/* 5. DECISION CARD (RAMP APPROVAL PATTERN) */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Decision Exception Cockpit (Ramp / Linear Pattern)
        </h2>
        <DecisionCard
          title="Landing page design · Pixel Studio"
          counterpartName="Pixel Studio"
          proposedPrice={155}
          buyerCeiling={150}
          proposedDays={7}
          reasonText="Pixel Studio asked for $155. Your limit is $150."
          suggestionText="Our suggestion: counter at $148 for 6 days."
          onApprove={() => toast.success('Approved $155')}
          onCounter={(price, days) => toast.info(`Countered at $${price} for ${days} days`)}
          onDecline={() => toast.info('Declined offer')}
        />
      </section>

      {/* 6. DEAL TIMELINE NODE & SUMMARY PANEL (STRIPE CHECKOUT PATTERN) */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Deal Timeline Node & Sticky Summary Panel (Stripe Pattern)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col">
            <DealNode
              price={140}
              deliveryDays={5}
              authorName="Marlow & Finch, Lisbon"
              deltaText="$15 lower · 2 days faster"
              timestamp="12 mins ago"
              summaryText="The contractor accepted scope revisions and reduced the fee to match your timeline."
              onOpenConversation={() => setIsDrawerOpen(true)}
              onOpenDetails={() => setIsDrawerOpen(true)}
            />
            <DealNode
              price={155}
              deliveryDays={7}
              authorName="Marlow & Finch, Lisbon"
              deltaText="Opening proposal"
              timestamp="2 hours ago"
              summaryText="Initial package submitted with standard 7-day turnaround."
            />
          </div>

          <div className="lg:col-span-5">
            <SummaryPanel
              currentPrice={140}
              deliveryDays={5}
              currentStep={4}
              statusLabel="Ready for payment"
              statusRole="handled"
              counterpartName="Marlow & Finch"
              actionState="readyToPay"
              onPay={() => toast.success('Payment authorized')}
            />
          </div>
        </div>
      </section>

      {/* 7. EMPTY STATES & SPOT ART */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-section text-text-primary">
          Empty States & Geometric Spot Art
        </h2>
        <EmptyState
          type="inbox"
          title="No decisions need you right now"
          description="Your assistant handles pricing, counteroffers, and scope within your limits automatically."
          actionLabel="Start a new request"
          onAction={() => toast.info('Redirect to request creator')}
        />
      </section>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Full Negotiation Dialogue"
      >
        <div className="flex flex-col gap-4 text-secondary text-text-muted">
          <p>
            Transcript of automated negotiation exchanges between buyer agent and seller agent.
          </p>
          <div className="bg-raised p-4 rounded-control text-text-primary">
            <p className="font-medium text-body">Offer #1: $155 in 7 days</p>
            <p className="text-secondary text-text-muted mt-1">Submitted by Marlow & Finch</p>
          </div>
          <div className="bg-raised p-4 rounded-control text-text-primary">
            <p className="font-medium text-body">Counter #2: $140 in 5 days</p>
            <p className="text-secondary text-text-muted mt-1">Proposed by Your Assistant</p>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
