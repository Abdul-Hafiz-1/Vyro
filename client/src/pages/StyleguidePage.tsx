import React, { useState } from 'react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Chip } from '../components/common/Chip';
import { Avatar } from '../components/common/Avatar';
import { ProgressStones } from '../components/common/ProgressStones';
import { OfferTicket } from '../components/common/OfferTicket';
import { DecisionCard } from '../components/common/DecisionCard';
import { SpotIllustration } from '../components/common/SpotIllustration';
import { EmptyState } from '../components/common/EmptyState';
import { Search, Sparkles, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const StyleguidePage: React.FC = () => {
  const [selectedChip, setSelectedChip] = useState('Landing pages');
  const [inputValue, setInputValue] = useState('');
  const [stoneStep, setStoneStep] = useState(3);

  const fireConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF6B4A', '#FFD23F', '#7FDDB0', '#9CCBFF', '#D9C8FF']
    });
  };

  return (
    <div className="min-h-screen bg-paper text-ink p-6 md:p-12 max-w-[1000px] mx-auto flex flex-col gap-12">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-ink pb-6">
        <div className="flex items-center gap-2">
          <Pill label="Design System" variant="coral" size="sm" />
          <span className="text-small text-muted font-bold">Paper & Ink Marketplace</span>
        </div>
        <h1 className="font-display font-bold text-hero text-ink">
          VYRO Styleguide
        </h1>
        <p className="text-body text-muted max-w-[600px]">
          Light-first, tactile paper-and-ink components. 2px ink outlines, hard offset shadows, zero blurred glass or gradients.
        </p>
      </div>

      {/* 1. PALETTE */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Color Palette
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { name: 'Coral', hex: '#FF6B4A', bg: 'bg-coral', role: 'Primary Action' },
            { name: 'Sun', hex: '#FFD23F', bg: 'bg-sun', role: 'Needs You' },
            { name: 'Mint', hex: '#7FDDB0', bg: 'bg-mint', role: 'Done / OK' },
            { name: 'Sky', hex: '#9CCBFF', bg: 'bg-sky', role: 'In Progress' },
            { name: 'Rose', hex: '#F6A8A8', bg: 'bg-rose', role: 'Declined' },
            { name: 'Lavender', hex: '#D9C8FF', bg: 'bg-lavender', role: 'Tag / Note' },
          ].map((c) => (
            <div key={c.name} className="border-2 border-ink rounded-[20px] p-4 flex flex-col gap-2 shadow-hard bg-card">
              <div className={`w-full h-14 rounded-[14px] border-2 border-ink ${c.bg}`} />
              <span className="font-bold text-body text-ink">{c.name}</span>
              <span className="text-small text-muted">{c.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. BUTTONS & TACTILE PRESS */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Buttons & Tactile Press
        </h2>
        <div className="flex flex-wrap items-center gap-4 p-6 bg-card border-2 border-ink rounded-[20px] shadow-hard">
          <Button variant="coral" onClick={fireConfetti}>
            Coral Primary
          </Button>
          <Button variant="white">
            White Action
          </Button>
          <Button variant="sun">
            Sun Caution
          </Button>
          <Button variant="mint">
            Mint Approved
          </Button>
          <Button variant="rose">
            Rose Decline
          </Button>
          <Button variant="ghost">
            Ghost Button
          </Button>
          <Button variant="coral" disabled>
            Disabled
          </Button>
        </div>
      </section>

      {/* 3. PILLS & STATUS BADGES */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Pills & Status Badges
        </h2>
        <div className="flex flex-wrap items-center gap-3 p-6 bg-card border-2 border-ink rounded-[20px] shadow-hard">
          <Pill label="Needs your OK" variant="sun" />
          <Pill label="In negotiation" variant="sky" />
          <Pill label="Paid & Complete" variant="mint" />
          <Pill label="Declined" variant="rose" />
          <Pill label="Design category" variant="lavender" />
          <Pill label="Interactive pill" variant="coral" onClick={() => alert('Pill tapped')} />
        </div>
      </section>

      {/* 4. CHIPS & INPUTS */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Chips & Inputs
        </h2>
        <div className="p-6 bg-card border-2 border-ink rounded-[20px] shadow-hard flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {['Landing pages', 'Logo design', 'Smart contract audit', 'Mobile UI'].map((chip) => (
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              icon={<Search className="w-5 h-5 text-ink" strokeWidth={2.5} />}
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

      {/* 5. SIGNATURE ELEMENT 1: THE OFFER TICKET */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Signature Element 1: The Offer Ticket
        </h2>
        <div className="p-6 bg-paper border-2 border-ink rounded-[20px] shadow-hard flex flex-col gap-4">
          <OfferTicket
            price={140}
            deliveryDays={5}
            authorName="Pixel Studio"
            deltaText="$15 lower, 2 days faster"
            isDeltaPositive={true}
            timestamp="10 mins ago"
          />
          <OfferTicket
            price={155}
            deliveryDays={7}
            authorName="Pixel Studio"
            deltaText="Initial offer"
            timestamp="1 hour ago"
          />
        </div>
      </section>

      {/* 6. SIGNATURE ELEMENT 2: THE DECISION CARD */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Signature Element 2: The Decision Card
        </h2>
        <DecisionCard
          title="Landing page design · Pixel Studio"
          counterpartName="Pixel Studio"
          proposedPrice={155}
          buyerCeiling={150}
          proposedDays={7}
          reasonText="Pixel Studio wants $155. Your limit is $150."
          suggestionText="Our suggestion: counter at $148 for 6 days."
          onApprove={() => alert('Approved')}
          onCounter={(price, days) => alert(`Countered: $${price} in ${days} days`)}
          onDecline={() => alert('Declined')}
        />
      </section>

      {/* 7. SIGNATURE ELEMENT 3: THE STEPPING STONES TRACKER */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Signature Element 3: The Stepping Stones Tracker
        </h2>
        <div className="p-6 bg-card border-2 border-ink rounded-[20px] shadow-hard flex flex-col gap-4">
          <ProgressStones currentStep={stoneStep} />
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={stoneStep === s ? 'coral' : 'white'}
                onClick={() => setStoneStep(s)}
              >
                Step {s}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SPOT ILLUSTRATIONS & EMPTY STATE */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-page-title text-ink">
          Spot Illustrations & Empty State
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-card border-2 border-ink rounded-[20px] shadow-hard">
          {(['empty-box', 'sparkle-search', 'all-done', 'ticket'] as const).map((ill) => (
            <div key={ill} className="flex flex-col items-center gap-2">
              <SpotIllustration name={ill} size={100} />
              <span className="font-bold text-small text-ink">{ill}</span>
            </div>
          ))}
        </div>

        <EmptyState
          illustration="empty-box"
          title="No active requests yet"
          description="Tell your assistant what you're looking for, and it will find sellers and start negotiating."
          actionLabel="Start a new request"
          onAction={() => alert('Action clicked')}
        />
      </section>
    </div>
  );
};
