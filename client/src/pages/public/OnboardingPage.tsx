import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  DollarSign,
  ShoppingBag,
  Store,
  Layers,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { api } from '../../api/client';
import { formatMoney } from '../../lib/present';
import { EASE_STANDARD } from '../../lib/motion';

type RoleChoice = 'buy' | 'sell' | 'both';

interface SampleStep {
  title: string;
  actor: string;
  price?: number;
  summary: string;
  note: string;
}

const SAMPLE_DEAL_STEPS: SampleStep[] = [
  {
    title: '1. Describe what you need',
    actor: 'You',
    price: 200,
    summary: '"Design a crisp 1-page landing site, budget around $200, 5 days."',
    note: 'AI structures deliverables, budget comfort limit, and hard cap.',
  },
  {
    title: '2. Matching seller replies',
    actor: 'Seller agent',
    price: 240,
    summary: 'Seller asks $240 with 5-day turnaround.',
    note: 'Matched against verified sellers; your private budget stays hidden.',
  },
  {
    title: '3. Your agent opens inside range',
    actor: 'Your agent',
    price: 185,
    summary: 'Your agent bids $185 for 5 days delivery.',
    note: 'Offers stay strictly below seller asks and move monotonically.',
  },
  {
    title: '4. Seller makes a concession',
    actor: 'Seller agent',
    price: 215,
    summary: 'Seller lowers their ask by $25 to $215.',
    note: 'Every price change compares to that same side’s previous turn.',
  },
  {
    title: '5. Offer enters your stretch zone',
    actor: 'Seller agent',
    price: 210,
    summary: 'Seller proposes $210 — $10 above your $200 comfort budget.',
    note: 'Under Flexible (+10%, up to $220), your agent pauses and asks you.',
  },
  {
    title: '6. You approve or counter in 1 click',
    actor: 'Needs your OK',
    price: 210,
    summary: 'Approve $210, Counter at $205, or Decline — with 10s Undo.',
    note: 'Nothing binds above your comfort budget without your OK.',
  },
  {
    title: '7. Escrow holds funds until accepted',
    actor: 'PayPal escrow',
    price: 210,
    summary: 'Paid with PayPal · held until you accept the finished work.',
    note: 'Sellers get paid automatically right after you click Accept work.',
  },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateOnboarding, switchWorkspace } = useAuth();
  const isReplay = new URLSearchParams(location.search).get('replay') === '1';

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Screen 2: Role choice
  const [roleChoice, setRoleChoice] = useState<RoleChoice>('both');

  // Screen 3: Interactive 7-step sample walkthrough
  const [sampleIdx, setSampleIdx] = useState<number>(0);

  // Screen 4: Plain-language safety limits
  const [autoApprovalLimit, setAutoApprovalLimit] = useState<number>(200);
  const [dailyBudgetCap, setDailyBudgetCap] = useState<number>(500);
  const [buyerFlex, setBuyerFlex] = useState<'strict' | 'flexible' | 'very_flexible'>('flexible');
  const [sellerFlex, setSellerFlex] = useState<'strict' | 'flexible' | 'very_flexible'>('flexible');
  const [maxConcurrentDeals, setMaxConcurrentDeals] = useState<number>(3);

  // Screen 5: Seller payout email (optional / skippable)
  const [paypalEmail, setPaypalEmail] = useState<string>('');
  const [payoutEmailError, setPayoutEmailError] = useState<string | null>(null);
  const [payoutSaved, setPayoutSaved] = useState<boolean>(false);

  const totalSteps = 5;
  const includesBuyer = roleChoice === 'buy' || roleChoice === 'both';
  const includesSeller = roleChoice === 'sell' || roleChoice === 'both';

  const flexPercentText = buyerFlex === 'strict' ? '0%' : buyerFlex === 'flexible' ? '10%' : '20%';
  const hardCapPreview = Math.round(
    autoApprovalLimit * (buyerFlex === 'strict' ? 1 : buyerFlex === 'flexible' ? 1.1 : 1.2)
  );

  const goStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const buildOnboardingPayload = () => {
    const capabilities = {
      buying: roleChoice === 'buy' || roleChoice === 'both',
      selling: roleChoice === 'sell' || roleChoice === 'both',
    };
    const activeWorkspace: 'buyer' | 'seller' = roleChoice === 'sell' ? 'seller' : 'buyer';
    return {
      completed: true,
      step: 5,
      capabilities,
      activeWorkspace,
      primaryMode: activeWorkspace,
      autoApprovalLimit,
      dailyBudgetCap,
      strategy: 'balanced',
      buyerPreferences: {
        budgetFlexibility: buyerFlex,
      },
      sellerProfile: {
        priceFlexibility: sellerFlex,
        maxConcurrentProjects: maxConcurrentDeals,
      },
    };
  };

  const handleSkipAll = async () => {
    setIsSubmitting(true);
    try {
      await updateOnboarding(buildOnboardingPayload());
      navigate('/app');
    } catch {
      navigate('/app');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSellerEmail = async () => {
    const cleaned = paypalEmail.trim();
    if (!cleaned) {
      setPayoutEmailError('Enter a PayPal email or continue without one for now.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setPayoutEmailError('Please enter a valid email address (like name@example.com).');
      return;
    }
    setPayoutEmailError(null);
    setIsSubmitting(true);
    try {
      await api.saveSellerPayoutAccount(cleaned);
      setPayoutSaved(true);
      toast.success('PayPal payout email saved.');
    } catch (err: any) {
      setPayoutEmailError(err.message || 'Could not verify payout email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const cleaned = paypalEmail.trim();
      if (includesSeller && cleaned && !payoutSaved) {
        try {
          await api.saveSellerPayoutAccount(cleaned);
          setPayoutSaved(true);
        } catch (err: any) {
          setPayoutEmailError(err.message || 'Check your PayPal email or clear it to skip.');
          setIsSubmitting(false);
          return;
        }
      }

      const payload = buildOnboardingPayload();
      await updateOnboarding(payload);
      if (switchWorkspace) {
        try {
          await switchWorkspace(payload.activeWorkspace);
        } catch {}
      }
      toast.success(isReplay ? 'Setup updated.' : 'Workspace ready.');
      navigate('/app?focusPrompt=1');
    } catch (err: any) {
      toast.error(err.message || 'Could not finish onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSample = SAMPLE_DEAL_STEPS[sampleIdx];

  return (
    <div className="min-h-screen bg-bg text-text-primary py-10 px-4 sm:px-6 overflow-x-hidden">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Progress Header */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-secondary text-text-muted">
            <span>Step {step} of {totalSteps}</span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSkipAll}
              className="text-text-muted hover:text-text-primary underline cursor-pointer"
            >
              Skip setup
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 w-full" aria-label="Setup progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  s <= step ? 'bg-volt' : 'bg-border-subtle'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Sliding Step Viewport */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.2, ease: EASE_STANDARD }}
            className="flex flex-col gap-6"
          >
            {/* SCREEN 1: Welcome */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <Card className="p-6 sm:p-8 flex flex-col gap-5 bg-surface">
                  {/* Flat Calm SVG Line Illustration */}
                  <div className="w-full py-4 flex items-center justify-center bg-raised/60 rounded-control border border-border-subtle">
                    <svg
                      width="260"
                      height="76"
                      viewBox="0 0 260 76"
                      fill="none"
                      aria-hidden="true"
                      className="text-text-primary"
                    >
                      <rect x="8" y="16" width="60" height="44" rx="10" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
                      <path d="M22 34H54M22 44H42" stroke="#D4FF3A" strokeWidth="2" strokeLinecap="round" />
                      <motion.path
                        d="M74 38H106"
                        stroke="currentColor"
                        strokeOpacity="0.45"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <circle cx="130" cy="38" r="20" fill="#D4FF3A" fillOpacity="0.14" stroke="#D4FF3A" strokeWidth="1.75" />
                      <path d="M123 38L128 43L138 33" stroke="#D4FF3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M154 38H186" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 4" />
                      <rect x="192" y="16" width="60" height="44" rx="10" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
                      <path d="M206 34H238M206 44H228" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h1 className="font-display font-bold text-[30px] sm:text-[34px] text-text-primary tracking-tight leading-tight">
                      Tell AI what you need. It negotiates. You approve the important parts.
                    </h1>
                    <p className="text-body text-text-muted leading-relaxed">
                      Type what you want to buy or sell in plain words. Your agent handles matching, rounds of negotiation, and PayPal escrow while respecting your hard limits.
                    </p>
                  </div>
                </Card>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="volt"
                    size="lg"
                    onClick={() => goStep(2)}
                    rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
                  >
                    Get started
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 2: Role (Buy / Sell / Both) */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="font-display font-bold text-[30px] text-text-primary tracking-tight">
                    How will you use VYRO?
                  </h1>
                  <p className="text-body text-text-muted">
                    You can switch between Buying and Selling anytime from the top bar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      id: 'buy' as const,
                      title: 'Buy services',
                      desc: 'Post requests in plain language and let your agent negotiate fair prices and timelines.',
                      icon: ShoppingBag,
                    },
                    {
                      id: 'sell' as const,
                      title: 'Sell services',
                      desc: 'Publish listings and let your seller agent handle quotes while protecting your lowest price.',
                      icon: Store,
                    },
                    {
                      id: 'both' as const,
                      title: 'Both buy and sell',
                      desc: 'Hire talent and sell your own services from one account with clear workspace tabs.',
                      icon: Layers,
                    },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const selected = roleChoice === opt.id;
                    return (
                      <Card
                        key={opt.id}
                        interactive
                        onClick={() => setRoleChoice(opt.id)}
                        className={`p-5 flex items-center justify-between gap-4 border-2 text-left transition-colors ${
                          selected ? 'border-volt bg-surface' : 'border-border-subtle bg-surface'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-control bg-raised border border-border-subtle flex items-center justify-center text-volt shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display font-semibold text-body text-text-primary">
                              {opt.title}
                            </span>
                            <span className="text-secondary text-text-muted leading-snug">
                              {opt.desc}
                            </span>
                          </div>
                        </div>
                        {selected && (
                          <span className="w-6 h-6 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </span>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                  <Button type="button" variant="ghost" size="md" onClick={() => goStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                  </Button>
                  <Button type="button" variant="volt" size="md" onClick={() => goStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 3: Interactive Sample Deal Walkthrough */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="font-display font-bold text-[30px] text-text-primary tracking-tight">
                        How a deal unfolds
                      </h1>
                      <StatusChip label="Sample, not real" role="inProgress" size="sm" />
                    </div>
                    <p className="text-body text-text-muted">
                      Step through a typical 7-step negotiation and escrow handoff.
                    </p>
                  </div>
                </div>

                <Card className="p-6 flex flex-col gap-5 bg-surface">
                  <div className="flex items-center justify-between gap-2 text-secondary text-text-muted">
                    <span className="font-medium text-text-primary">{activeSample.actor}</span>
                    <span>Step {sampleIdx + 1} of {SAMPLE_DEAL_STEPS.length}</span>
                  </div>

                  <motion.div
                    key={sampleIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE_STANDARD }}
                    className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display font-semibold text-section text-text-primary">
                        {activeSample.title}
                      </span>
                      {typeof activeSample.price === 'number' && (
                        <span className="font-display font-bold text-[24px] text-volt shrink-0">
                          {formatMoney(activeSample.price)}
                        </span>
                      )}
                    </div>
                    <p className="text-body text-text-primary font-medium">{activeSample.summary}</p>
                    <p className="text-secondary text-text-muted">{activeSample.note}</p>
                  </motion.div>

                  {/* 7-step interactive scrubber */}
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sampleIdx === 0}
                      onClick={() => setSampleIdx((i) => Math.max(0, i - 1))}
                    >
                      Previous step
                    </Button>
                    <div className="flex items-center gap-1.5">
                      {SAMPLE_DEAL_STEPS.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`Sample step ${idx + 1}`}
                          onClick={() => setSampleIdx(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === sampleIdx ? 'w-5 bg-volt' : 'w-2 bg-border-subtle hover:bg-text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={sampleIdx === SAMPLE_DEAL_STEPS.length - 1}
                      onClick={() => setSampleIdx((i) => Math.min(SAMPLE_DEAL_STEPS.length - 1, i + 1))}
                    >
                      Next step
                    </Button>
                  </div>
                </Card>

                <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                  <Button type="button" variant="ghost" size="md" onClick={() => goStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                  </Button>
                  <Button type="button" variant="volt" size="md" onClick={() => goStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 4: Safety Limits (by Role) */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-volt text-secondary font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Safety limits</span>
                  </div>
                  <h1 className="font-display font-bold text-[30px] text-text-primary tracking-tight">
                    Set clear boundaries for your agents
                  </h1>
                  <p className="text-body text-text-muted">
                    Nothing agrees outside these limits without your explicit OK.
                  </p>
                </div>

                {includesBuyer && (
                  <Card className="p-6 flex flex-col gap-4 bg-surface">
                    <span className="font-display font-semibold text-section text-text-primary">
                      Buying limits
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-secondary font-medium text-text-primary">
                          Auto-approve budget
                        </label>
                        <div className="relative">
                          <DollarSign className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5 pointer-events-none" />
                          <input
                            type="number"
                            min={10}
                            max={5000}
                            value={autoApprovalLimit}
                            onChange={(e) => setAutoApprovalLimit(Math.max(10, Number(e.target.value)))}
                            className="w-full h-11 pl-9 pr-3 bg-raised border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-secondary font-medium text-text-primary">
                          Daily spend limit
                        </label>
                        <div className="relative">
                          <DollarSign className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5 pointer-events-none" />
                          <input
                            type="number"
                            min={50}
                            max={20000}
                            value={dailyBudgetCap}
                            onChange={(e) => setDailyBudgetCap(Math.max(50, Number(e.target.value)))}
                            className="w-full h-11 pl-9 pr-3 bg-raised border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-secondary font-medium text-text-primary">
                        Budget flexibility
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'strict' as const, label: 'Stick to budget' },
                          { id: 'flexible' as const, label: 'Flexible (+10%)' },
                          { id: 'very_flexible' as const, label: 'Very flexible (+20%)' },
                        ].map((tier) => (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setBuyerFlex(tier.id)}
                            className={`px-3 py-2 rounded-control border text-secondary font-medium cursor-pointer transition-colors ${
                              buyerFlex === tier.id
                                ? 'bg-volt text-[#0C0E0D] border-volt font-semibold'
                                : 'bg-raised border-border-subtle text-text-primary hover:border-volt/50'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-secondary text-text-muted">
                        With a {formatMoney(autoApprovalLimit)} budget and {flexPercentText} stretch, your agent can ask for your OK up to {formatMoney(hardCapPreview)}.
                      </p>
                    </div>
                  </Card>
                )}

                {includesSeller && (
                  <Card className="p-6 flex flex-col gap-4 bg-surface">
                    <span className="font-display font-semibold text-section text-text-primary">
                      Selling limits
                    </span>
                    <div className="flex flex-col gap-2">
                      <span className="text-secondary font-medium text-text-primary">
                        Lowest price flexibility
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'strict' as const, label: 'Hold firm' },
                          { id: 'flexible' as const, label: 'Flexible (-10%)' },
                          { id: 'very_flexible' as const, label: 'Very flexible (-20%)' },
                        ].map((tier) => (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSellerFlex(tier.id)}
                            className={`px-3 py-2 rounded-control border text-secondary font-medium cursor-pointer transition-colors ${
                              sellerFlex === tier.id
                                ? 'bg-volt text-[#0C0E0D] border-volt font-semibold'
                                : 'bg-raised border-border-subtle text-text-primary hover:border-volt/50'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-secondary font-medium text-text-primary">
                        Max active orders at once
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={maxConcurrentDeals}
                        onChange={(e) => setMaxConcurrentDeals(Math.max(1, Number(e.target.value)))}
                        className="w-32 h-11 px-3 bg-raised border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt"
                      />
                    </div>
                  </Card>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                  <Button type="button" variant="ghost" size="md" onClick={() => goStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                  </Button>
                  <Button type="button" variant="volt" size="md" onClick={() => goStep(5)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 5: Payments by Role + Ready */}
            {step === 5 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="font-display font-bold text-[30px] text-text-primary tracking-tight">
                    How payments work
                  </h1>
                  <p className="text-body text-text-muted">
                    One final check before entering your Today workspace.
                  </p>
                </div>

                {includesBuyer && (
                  <Card className="p-5 flex items-start gap-3.5 bg-surface">
                    <CreditCard className="w-5 h-5 text-volt shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-body text-text-primary">
                        For buyers: PayPal escrow protection
                      </span>
                      <p className="text-secondary text-text-muted leading-relaxed">
                        You approve payment in PayPal after a deal is finalized. Funds stay held until you click Accept work. Test mode: no real money moves.
                      </p>
                    </div>
                  </Card>
                )}

                {includesSeller && (
                  <Card className="p-6 flex flex-col gap-4 bg-surface">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-display font-semibold text-section text-text-primary">
                        Where should we send your earnings?
                      </span>
                      <span className="text-secondary px-2.5 py-0.5 rounded-control bg-raised border border-border-subtle text-text-muted">
                        Test mode: no real money moves
                      </span>
                    </div>
                    <p className="text-secondary text-text-muted leading-relaxed">
                      When a buyer pays, we hold the money until the work is accepted, then send your share to this PayPal account. Service fee: 5%. Payouts release right after buyer acceptance.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label htmlFor="onboarding-paypal-email" className="text-secondary font-medium text-text-primary">
                          Your PayPal email
                        </label>
                        <input
                          id="onboarding-paypal-email"
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => {
                            setPaypalEmail(e.target.value);
                            setPayoutSaved(false);
                            if (payoutEmailError) setPayoutEmailError(null);
                          }}
                          placeholder="name@example.com"
                          className="w-full h-11 px-4 bg-raised border border-border-subtle rounded-control text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        className="h-11 shrink-0"
                        isLoading={isSubmitting}
                        onClick={handleSaveSellerEmail}
                      >
                        {payoutSaved ? 'Saved' : 'Verify email'}
                      </Button>
                    </div>

                    {payoutEmailError && (
                      <div className="p-3 rounded-control bg-status-declined/10 border border-status-declined/30 text-secondary text-status-declined flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{payoutEmailError}</span>
                      </div>
                    )}

                    {payoutSaved && (
                      <p className="text-secondary text-status-handled font-medium">
                        Ready — payouts will be sent to {paypalEmail.trim()}.
                      </p>
                    )}

                    {!payoutSaved && (
                      <p className="text-secondary text-text-muted">
                        Optional for now — you can still publish listings and negotiate, though buyers cannot confirm a deal until you add your payout email.
                      </p>
                    )}
                  </Card>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                  <Button type="button" variant="ghost" size="md" onClick={() => goStep(4)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="volt"
                    size="lg"
                    isLoading={isSubmitting}
                    onClick={handleFinish}
                    rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
                  >
                    You&apos;re ready — go to Today
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
