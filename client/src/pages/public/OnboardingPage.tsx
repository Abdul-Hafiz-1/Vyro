import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { toast } from 'sonner';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  DollarSign,
  Sliders
} from 'lucide-react';
import { api } from '../../api/client';
import { formatMoney } from '../../lib/present';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateOnboarding } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Default Role Preference
  const [primaryMode, setPrimaryMode] = useState<'buyer' | 'seller'>('buyer');

  // Step 2: Financial Thresholds
  const [autoApprovalLimit, setAutoApprovalLimit] = useState<number>(200);
  const [dailyBudgetCap, setDailyBudgetCap] = useState<number>(500);

  // Step 3: Negotiation Strategy
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive_cost' | 'quality_first'>('balanced');

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updateOnboarding({
        completed: true,
        primaryMode,
        autoApprovalLimit,
        dailyBudgetCap,
        strategy
      });
      toast.success('Your workspace is configured.');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-secondary text-text-muted">
            <span>Step {step} of {totalSteps}</span>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="text-text-muted hover:text-text-primary underline cursor-pointer"
            >
              Skip setup
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-colors ${
                  s <= step ? 'bg-volt' : 'bg-border-subtle'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: How will you use VYRO? */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
                How will you primarily use VYRO?
              </h1>
              <p className="text-body text-text-muted">
                You can switch between Buying and Selling at any time from the top navigation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                interactive
                onClick={() => setPrimaryMode('buyer')}
                className={`p-6 flex flex-col gap-3 text-left transition-all ${
                  primaryMode === 'buyer'
                    ? 'border-volt bg-surface'
                    : 'border-border-subtle bg-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body text-text-primary">
                    I want to procure services
                  </span>
                  {primaryMode === 'buyer' && (
                    <span className="w-5 h-5 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-secondary text-text-muted leading-relaxed">
                  Delegate purchasing to a buyer agent who will find verified sellers, negotiate pricing, and bring you terms.
                </p>
              </Card>

              <Card
                interactive
                onClick={() => setPrimaryMode('seller')}
                className={`p-6 flex flex-col gap-3 text-left transition-all ${
                  primaryMode === 'seller'
                    ? 'border-volt bg-surface'
                    : 'border-border-subtle bg-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body text-text-primary">
                    I want to sell services
                  </span>
                  {primaryMode === 'seller' && (
                    <span className="w-5 h-5 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-secondary text-text-muted leading-relaxed">
                  Publish offerings and let a seller agent negotiate scope and turnaround while enforcing your private floor.
                </p>
              </Card>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-subtle">
              <Button
                variant="volt"
                size="md"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Autonomous Financial Limits */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
                Set your financial boundaries
              </h1>
              <p className="text-body text-text-muted">
                Your agent cannot exceed these values without asking for your manual approval.
              </p>
            </div>

            <Card className="p-6 flex flex-col gap-5 bg-surface">
              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  Auto-approval price ceiling
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3 pointer-events-none" />
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={autoApprovalLimit}
                    onChange={(e) => setAutoApprovalLimit(Number(e.target.value))}
                    className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                  />
                </div>
                <span className="text-secondary text-text-muted">
                  Agreements at or under {formatMoney(autoApprovalLimit)} can settle automatically.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  Daily cumulative spend cap
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3 pointer-events-none" />
                  <input
                    type="number"
                    min={50}
                    max={20000}
                    value={dailyBudgetCap}
                    onChange={(e) => setDailyBudgetCap(Number(e.target.value))}
                    className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                  />
                </div>
                <span className="text-secondary text-text-muted">
                  Maximum total payments authorized within any 24-hour period.
                </span>
              </div>
            </Card>

            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
              >
                Back
              </Button>
              <Button
                variant="volt"
                size="md"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Agent Strategy */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
                Select negotiation style
              </h1>
              <p className="text-body text-text-muted">
                Choose how your agent prioritizes price versus turnaround during bargaining rounds.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                {
                  id: 'balanced',
                  title: 'Balanced negotiation',
                  desc: 'Aims for fair market price while keeping standard delivery timelines.'
                },
                {
                  id: 'aggressive_cost',
                  title: 'Cost minimization',
                  desc: 'Pushes aggressively for price concessions in exchange for flexible delivery buffers.'
                },
                {
                  id: 'quality_first',
                  title: 'Fast turnaround & quality priority',
                  desc: 'Prioritizes rapid delivery and verified deliverable packages over marginal discounts.'
                }
              ].map((strat) => (
                <Card
                  key={strat.id}
                  interactive
                  onClick={() => setStrategy(strat.id as any)}
                  className={`p-5 flex items-center justify-between gap-4 text-left transition-all ${
                    strategy === strat.id
                      ? 'border-volt bg-surface'
                      : 'border-border-subtle bg-surface'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-body text-text-primary">
                      {strat.title}
                    </span>
                    <span className="text-secondary text-text-muted mt-0.5">
                      {strat.desc}
                    </span>
                  </div>
                  {strategy === strat.id && (
                    <span className="w-5 h-5 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
              >
                Back
              </Button>
              <Button
                variant="volt"
                size="lg"
                isLoading={isSubmitting}
                onClick={handleComplete}
                rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
              >
                Complete setup & enter app
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};