import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  DollarSign,
  ShieldCheck,
  ShoppingBag,
  Store,
  Layers
} from 'lucide-react';
import { api } from '../../api/client';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateOnboarding, updateCapabilities, switchWorkspace } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Workspace Choice
  const [primaryMode, setPrimaryMode] = useState<'buyer' | 'seller'>('buyer');

  // Step 2: Decision Thresholds
  const [autoApprovalLimit, setAutoApprovalLimit] = useState<number>(200);
  const [dailyBudgetCap, setDailyBudgetCap] = useState<number>(500);

  // Step 3: Agent Stance
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive_cost' | 'quality_first' | 'expedited'>('balanced');

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

  const handleSkip = () => {
    navigate('/app');
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // 1. Update user workspace & capabilities
      await updateCapabilities({
        buying: primaryMode === 'buyer',
        selling: primaryMode === 'seller'
      });
      await switchWorkspace(primaryMode);

      // 2. Persist decision limits
      await api.updateLimits(autoApprovalLimit, dailyBudgetCap);

      // 3. Mark onboarding complete
      await updateOnboarding({
        step: 3,
        completed: true
      });

      toast.success('Setup complete. Welcome to VYRO.');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message || 'Setup failed');
      navigate('/app');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col justify-between p-4 sm:p-8 selection:bg-vyro-accent/20">
      {/* Top Bar */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4C7DF0] to-[#2B54C4] flex items-center justify-center shadow-xs">
            <span className="text-white font-black text-xs font-mono">V</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-vyro-text font-mono">VYRO</span>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs font-mono text-vyro-muted hover:text-vyro-text transition-colors"
        >
          Skip to app →
        </button>
      </div>

      {/* Main Form Container */}
      <div className="max-w-xl w-full mx-auto my-auto py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step
                    ? 'w-8 bg-vyro-accent'
                    : s < step
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-vyro-border'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-vyro-muted">
            Step {step} of {totalSteps}
          </span>
        </div>

        {/* Step 1: Choose Primary Workspace */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-lg font-bold text-vyro-text tracking-tight font-mono">
                Choose your primary workspace
              </h1>
              <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                VYRO separates buying and selling into dedicated workspaces. You can switch between them anytime in your account menu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPrimaryMode('buyer')}
                className={`p-5 rounded-xl border text-left transition-all ${
                  primaryMode === 'buyer'
                    ? 'bg-vyro-surface border-vyro-accent shadow-sm ring-1 ring-vyro-accent/50'
                    : 'bg-vyro-surface border-vyro-border hover:border-vyro-border-light'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-vyro-text">Buying Workspace</h3>
                <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                  Post requirements, automate seller negotiations, compare proposals, and auto-approve deals.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPrimaryMode('seller')}
                className={`p-5 rounded-xl border text-left transition-all ${
                  primaryMode === 'seller'
                    ? 'bg-vyro-surface border-vyro-accent shadow-sm ring-1 ring-vyro-accent/50'
                    : 'bg-vyro-surface border-vyro-border hover:border-vyro-border-light'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-vyro-text">Selling Workspace</h3>
                <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                  Publish commercial services and listings. Your seller agent negotiates against your floor price.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Decision Thresholds */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-lg font-bold text-vyro-text tracking-tight font-mono">
                Set autonomous decision boundaries
              </h1>
              <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                VYRO's AI operates autonomously within these limits. Anything higher escalates to your Needs-you review queue.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-vyro-surface border border-vyro-border space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-vyro-text flex items-center justify-between">
                  <span>Auto-Approval Ceiling:</span>
                  <span className="font-bold tabular-nums text-vyro-accent">${autoApprovalLimit} USD</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={autoApprovalLimit}
                  onChange={(e) => setAutoApprovalLimit(Number(e.target.value))}
                  className="w-full accent-vyro-accent"
                />
                <span className="text-[11px] text-vyro-muted block">
                  Transactions under this amount will auto-approve when all policies hold.
                </span>
              </div>

              <div className="pt-3 border-t border-vyro-border/60 space-y-2">
                <label className="text-xs font-mono text-vyro-text flex items-center justify-between">
                  <span>Daily Spend Cap:</span>
                  <span className="font-bold tabular-nums text-emerald-400">${dailyBudgetCap} USD</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="2500"
                  step="50"
                  value={dailyBudgetCap}
                  onChange={(e) => setDailyBudgetCap(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[11px] text-vyro-muted block">
                  Daily cumulative limit before routing all purchases to human sign-off.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Agent Negotiation Stance */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-lg font-bold text-vyro-text tracking-tight font-mono">
                Choose agent negotiation stance
              </h1>
              <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                How should your buyer agent make price concessions across rounds?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'balanced',
                  title: 'Balanced',
                  desc: 'Even trade-off between price and speed. Concedes incrementally across rounds.'
                },
                {
                  id: 'quality_first',
                  title: 'Quality First',
                  desc: 'Prioritizes verified seller reputation and verified delivery history over discount.'
                },
                {
                  id: 'aggressive_cost',
                  title: 'Cost Focused',
                  desc: 'Opens low and makes small concessions, pushing counterparties toward their floor.'
                },
                {
                  id: 'expedited',
                  title: 'Expedited',
                  desc: 'Fast convergence within 2 rounds to lock in immediate turnaround.'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStrategy(opt.id as any)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    strategy === opt.id
                      ? 'bg-vyro-surface border-vyro-accent ring-1 ring-vyro-accent/50 shadow-xs'
                      : 'bg-vyro-surface border-vyro-border hover:border-vyro-border-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-vyro-text font-mono">{opt.title}</span>
                    {strategy === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-vyro-accent" />}
                  </div>
                  <p className="text-[11px] text-vyro-muted leading-relaxed font-sans">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 border-t border-vyro-border/60 mt-8">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Previous
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs px-5"
          >
            {step === totalSteps ? 'Enter Workspace' : 'Continue'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[11px] font-mono text-vyro-subtle">
        VYRO Autonomous Commerce · All data stored locally in SQLite
      </div>
    </div>
  );
};
