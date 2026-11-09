import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  Lock,
  Clock,
  DollarSign,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { StatusChip } from '../../components/common/StatusChip';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../lib/present';

const CATEGORIES = ['Design', 'Engineering', 'Security', 'Mobile', 'Writing'];

const PRESETS = [
  {
    label: 'Security Audit',
    budget: 350,
    days: 4,
    category: 'Security',
    title: 'OWASP Security Audit & Vulnerability Review',
    deliverables: ['OWASP Top 10 Audit Report', 'Fix Recommendations', 'Verification Call'],
    prompt: 'I need an OWASP top-10 security audit of my Express API completed within 4 days for under $350 USD.'
  },
  {
    label: 'Brand Identity',
    budget: 180,
    days: 5,
    category: 'Design',
    title: 'Brand Landing Page & Design Tokens',
    deliverables: ['Responsive Landing Page', 'Tailwind Design Tokens', 'Accessibility Check'],
    prompt: 'I need a responsive, high-converting brand landing page with accessible Tailwind design tokens, delivery in 5 days, budget under $180 USD.'
  },
  {
    label: 'Mobile Architecture',
    budget: 280,
    days: 6,
    category: 'Mobile',
    title: 'Cross-Platform Mobile App Foundation',
    deliverables: ['Clean State Architecture', 'API Client Integration', 'Core Unit Tests'],
    prompt: 'Cross-platform mobile app architecture with clean state management, API integration, and unit tests. Budget $280 within 6 days.'
  }
];

export const RequestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const targetSellerId = location.state?.targetSellerId;
  const initialPrompt = location.state?.initialPrompt || location.state?.prefilledPrompt;

  // Step state: 1 = What, 2 = Budget & Timing, 3 = Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form data
  const [title, setTitle] = useState(initialPrompt || '');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [category, setCategory] = useState<string>('Design');
  const [maxBudget, setMaxBudget] = useState<number | ''>(250);
  const [deadlineDays, setDeadlineDays] = useState<number | ''>(5);
  const [deliverables, setDeliverables] = useState<string[]>([
    'Primary deliverable ready for review',
    'Verification and handover checklist'
  ]);
  const [newDeliverableText, setNewDeliverableText] = useState('');

  const [isParsing, setIsParsing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Available sellers
  const { data: allAgents = [] } = useQuery({
    queryKey: ['sellerAgentsForProcure'],
    queryFn: () => api.getAgents({ type: 'seller' })
  });

  const matchingSellers = useMemo(() => {
    return allAgents
      .filter((a) => {
        if (a.ownerId === user?.id) return false;
        if (category.toLowerCase() === 'security') {
          return a.category.toLowerCase() === 'security' || a.id.includes('rosto') || a.id.includes('aether');
        }
        return a.category.toLowerCase() === category.toLowerCase() || a.category === 'General';
      })
      .slice(0, 3);
  }, [allAgents, category, user?.id]);

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setTitle(p.title);
    setPrompt(p.prompt);
    setCategory(p.category);
    setMaxBudget(p.budget);
    setDeadlineDays(p.days);
    setDeliverables(p.deliverables);
    toast.success(`Selected "${p.label}"`);
  };

  const handleAddDeliverable = () => {
    const text = newDeliverableText.trim();
    if (!text) return;
    setDeliverables([...deliverables, text]);
    setNewDeliverableText('');
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  const handleParsePrompt = async () => {
    const text = (prompt || title).trim();
    if (!text) {
      toast.error('Please describe what you need done.');
      return;
    }
    setIsParsing(true);
    try {
      const result = await api.parsePurchasingPrompt(text);
      if (result.title) setTitle(result.title);
      if (result.maxBudget) setMaxBudget(result.maxBudget);
      if (result.deadlineDays) setDeadlineDays(result.deadlineDays);
      if (result.category) setCategory(result.category);
      if (result.deliverables?.length) setDeliverables(result.deliverables);
      toast.success('Your requirements have been structured.');
    } catch {
      toast.error('Could not parse requirements. You can enter them manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLaunch = async () => {
    const projectTitle = title.trim() || prompt.trim() || 'Custom Project';
    setIsLaunching(true);
    toast.info('Starting search across verified sellers...');

    try {
      const createdRequest = await api.createRequest({
        rawInput: prompt.trim() || projectTitle,
        title: projectTitle,
        category,
        requiredCapabilities: [`${category} Delivery`, 'Quality Verification'],
        deliverables: deliverables.length > 0 ? deliverables : [projectTitle, 'Handover checklist'],
        maxBudget: maxBudget === '' ? undefined : Number(maxBudget),
        currency: 'USD',
        deadlineDays: deadlineDays === '' ? undefined : Number(deadlineDays),
        qualityRequirements: 'Verified delivery with satisfaction guarantee.'
      });

      let sellerIds = targetSellerId ? [targetSellerId] : matchingSellers.map((s) => s.id);
      if (sellerIds.length === 0 && allAgents.length > 0) {
        sellerIds = allAgents.slice(0, 2).map((a) => a.id);
      }
      const myAgentIds = allAgents.filter((a) => a.ownerId === user?.id).map((a) => a.id);
      sellerIds = sellerIds.filter((sId) => !myAgentIds.includes(sId));

      const result = await api.runMultiAgentNegotiation(createdRequest.id, sellerIds);
      toast.success('Negotiation started. Your agent is negotiating with sellers.');

      const recommendedNegId = result.evaluation?.recommendedNegotiationId || result.negotiations[0]?.id;
      if (recommendedNegId) {
        navigate(`/app/deals/${recommendedNegId}`);
      } else {
        navigate('/app/deals');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start negotiation');
      setIsLaunching(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8">
      {/* Top Stepping Bar (Airbnb booking flow reference) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-secondary font-medium text-text-muted">
            Step {step} of 3
          </span>
          <span className="text-secondary text-text-muted">
            {step === 1 && 'What you need'}
            {step === 2 && 'Budget & timing'}
            {step === 3 && 'Review & start'}
          </span>
        </div>
        {/* Progress Bar Segments */}
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

      {/* STEP 1: What do you need done? */}
      {step === 1 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              What do you need done?
            </h1>
            <p className="text-body text-text-muted">
              Describe your project in plain words. Your agent will negotiate terms on your behalf.
            </p>
          </div>

          {/* Large Primary Input */}
          <div className="flex flex-col gap-3">
            <label className="text-secondary font-medium text-text-primary">
              Project title or description
            </label>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audit my Express backend API before our launch next week"
              className="w-full bg-surface border border-border-subtle rounded-control p-4 text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-secondary text-text-muted">
                Be as specific or simple as you like.
              </span>
              <button
                type="button"
                onClick={handleParsePrompt}
                disabled={isParsing || !title.trim()}
                className="text-secondary font-medium text-text-primary hover:text-text-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-volt" strokeWidth={2} />
                <span>{isParsing ? 'Organizing…' : 'Refine with AI'}</span>
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-col gap-3">
            <span className="text-secondary font-medium text-text-primary">
              Select category
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-volt text-[#0C0E0D] font-bold'
                        : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Ideas */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border-subtle">
            <span className="text-secondary text-text-muted">
              Or pick an example request to see how it works:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <Card
                  key={p.label}
                  interactive
                  onClick={() => handleApplyPreset(p)}
                  className="p-4 flex flex-col justify-between gap-3 text-left"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-body text-text-primary">
                      {p.label}
                    </span>
                    <span className="text-secondary text-text-muted line-clamp-2">
                      {p.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary pt-2 border-t border-border-subtle">
                    <span className="font-bold text-text-primary">{formatMoney(p.budget)}</span>
                    <span className="text-text-muted">{p.days}&nbsp;days</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate('/app')}
            >
              Cancel
            </Button>
            <Button
              variant="volt"
              size="md"
              disabled={!title.trim()}
              onClick={() => setStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Continue to budget
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: What is your budget ceiling and deadline? */}
      {step === 2 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              What is your budget and deadline?
            </h1>
            <p className="text-body text-text-muted">
              Set your maximum budget and timeline. Your budget ceiling stays strictly private.
            </p>
          </div>

          {/* Budget & Deadline Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Budget */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-secondary font-medium text-text-primary">
                  Maximum budget ceiling
                </label>
                <div className="flex items-center gap-1 text-secondary text-status-handled">
                  <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Private</span>
                </div>
              </div>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="250"
                  className="w-full h-[52px] pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-body font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
              <span className="text-secondary text-text-muted">
                Sellers never see this number. Your agent aims to negotiate lower.
              </span>
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Turnaround deadline
              </label>
              <div className="relative">
                <Clock className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5"
                  className="w-full h-[52px] pl-11 pr-14 bg-surface border border-border-subtle rounded-control text-body font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
                <span className="text-secondary text-text-muted absolute right-4 top-4 pointer-events-none">
                  days
                </span>
              </div>
              <span className="text-secondary text-text-muted">
                Target delivery window from deal confirmation.
              </span>
            </div>
          </div>

          {/* Deliverables Checklist */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border-subtle">
            <span className="text-secondary font-medium text-text-primary">
              Required deliverables
            </span>
            <div className="flex flex-col gap-2">
              {deliverables.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 bg-surface border border-border-subtle rounded-control"
                >
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-status-handled shrink-0" strokeWidth={2.5} />
                    <span className="text-secondary text-text-primary">{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(idx)}
                    className="text-secondary text-text-muted hover:text-status-declined cursor-pointer p-1"
                    aria-label="Remove deliverable"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Deliverable Row */}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newDeliverableText}
                onChange={(e) => setNewDeliverableText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliverable();
                  }
                }}
                placeholder="Add another deliverable (e.g. Unit tests with 90% coverage)"
                className="flex-1 h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleAddDeliverable}
                leftIcon={<Plus className="w-4 h-4" strokeWidth={2} />}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
            >
              Back
            </Button>
            <Button
              variant="volt"
              size="md"
              disabled={!maxBudget || !deadlineDays}
              onClick={() => setStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Continue to review
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review and start */}
      {step === 3 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              Ready to find and negotiate
            </h1>
            <p className="text-body text-text-muted">
              Here is what your buyer agent will do. Review the parameters before starting.
            </p>
          </div>

          {/* Summary Card */}
          <Card className="p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-5">
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-text-muted">{category} Request</span>
                <h3 className="font-display font-bold text-[22px] text-text-primary">
                  {title}
                </h3>
              </div>
              <StatusChip label="Ready" role="neutral" size="md" />
            </div>

            {/* Key Commercial Boundaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-4 bg-raised rounded-control">
                <span className="text-secondary text-text-muted">Private budget ceiling</span>
                <span className="font-display font-bold text-[28px] text-text-primary">
                  {formatMoney(Number(maxBudget))}
                </span>
                <span className="text-secondary text-status-handled flex items-center gap-1 mt-0.5">
                  <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Hidden from sellers</span>
                </span>
              </div>

              <div className="flex flex-col gap-1 p-4 bg-raised rounded-control">
                <span className="text-secondary text-text-muted">Target turnaround</span>
                <span className="font-display font-bold text-[28px] text-text-primary">
                  {deadlineDays}&nbsp;days
                </span>
                <span className="text-secondary text-text-muted mt-0.5">
                  Delivery window from agreement
                </span>
              </div>
            </div>

            {/* Deliverables List */}
            <div className="flex flex-col gap-2">
              <span className="text-secondary font-medium text-text-primary">
                Included deliverables ({deliverables.length})
              </span>
              <div className="flex flex-col gap-1.5">
                {deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-secondary text-text-primary">
                    <Check className="w-4 h-4 text-status-handled shrink-0" strokeWidth={2.5} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matching Sellers Preview */}
            {matchingSellers.length > 0 && (
              <div className="flex flex-col gap-2 pt-4 border-t border-border-subtle">
                <span className="text-secondary font-medium text-text-primary">
                  Verified sellers to be contacted
                </span>
                <div className="flex flex-wrap gap-3">
                  {matchingSellers.map((seller) => (
                    <div
                      key={seller.id}
                      className="flex items-center gap-2.5 px-3 py-2 bg-raised rounded-control border border-border-subtle"
                    >
                      <Avatar name={seller.businessName} size="sm" />
                      <div className="flex flex-col">
                        <span className="text-secondary font-semibold text-text-primary">
                          {seller.businessName}
                        </span>
                        <span className="text-secondary text-text-muted">
                          Verified Seller
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What Happens Next Explainer */}
            <div className="p-4 rounded-control bg-raised border border-border-subtle flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-volt shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex flex-col gap-1">
                <span className="text-secondary font-semibold text-text-primary">
                  How autonomous negotiation works
                </span>
                <p className="text-secondary text-text-muted leading-relaxed">
                  Your buyer agent will contact verified sellers, negotiate pricing within your ceiling, and optimize turnaround. You will only be asked to approve the final agreed deal.
                </p>
              </div>
            </div>
          </Card>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
            >
              Back to budget
            </Button>
            <Button
              variant="volt"
              size="lg"
              isLoading={isLaunching}
              onClick={handleLaunch}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Find and negotiate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};