import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ListingCategory, FlexibilityTier } from '../../types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { formatMoney } from '../../lib/present';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Lock,
  Clock,
  DollarSign,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const CATEGORIES: ListingCategory[] = ['Design', 'Development', 'Security', 'Marketing', 'Hardware'];

export const ListingEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id && id !== 'new');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Design');
  const [price, setPrice] = useState<number | ''>(350);
  const [minAcceptablePrice, setMinAcceptablePrice] = useState<number | ''>(280);
  const [flexibility, setFlexibility] = useState<FlexibilityTier>('flexible');
  const [deliveryDays, setDeliveryDays] = useState<number | ''>(5);
  const [deliverables, setDeliverables] = useState<string[]>([
    'Complete primary deliverable package',
    'Interactive walkthrough and source handover',
    'Quality verification checklist'
  ]);
  const [newDeliverableText, setNewDeliverableText] = useState('');

  const sellerStretchFactor = flexibility === 'strict' ? 1 : flexibility === 'very_flexible' ? 0.8 : 0.9;
  const computedHardMin = Math.round((Number(minAcceptablePrice) || 0) * sellerStretchFactor);

  const { data: existingListing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: isEditing
  });

  useEffect(() => {
    if (existingListing) {
      setTitle(existingListing.title || '');
      setDescription(existingListing.description || '');
      setCategory(existingListing.category || 'Design');
      setPrice(existingListing.price || 350);
      setMinAcceptablePrice(existingListing.minAcceptablePrice || 280);
      if (existingListing.flexibility) setFlexibility(existingListing.flexibility);
      setDeliveryDays(existingListing.deliveryDays || 5);
      if (existingListing.deliverables?.length) {
        setDeliverables(existingListing.deliverables);
      }
    }
  }, [existingListing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        type: 'service' as const,
        price: Number(price) || 350,
        minAcceptablePrice: Number(minAcceptablePrice) || Math.round(Number(price) * 0.8),
        flexibility,
        deliveryDays: Number(deliveryDays) || 5,
        deliverables,
        isNegotiable: true,
        status: 'active' as const,
        currency: 'USD',
        pricingModel: 'fixed' as const
      };

      if (isEditing) {
        return api.updateListing(id!, payload);
      } else {
        return api.createListing(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.success(isEditing ? 'Listing updated successfully.' : 'Offering published to marketplace.');
      navigate('/app/listings');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save listing');
    }
  });

  const handleAddDeliverable = () => {
    const text = newDeliverableText.trim();
    if (!text) return;
    setDeliverables([...deliverables, text]);
    setNewDeliverableText('');
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Way back (Breadcrumb) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step > 1 ? setStep((prev) => (prev - 1) as any) : navigate('/app/listings')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step > 1 ? 'Back to previous step' : 'Back to Listings'}</span>
        </button>
      </div>

      {/* Top Stepper (Multi-step wizard) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-secondary font-medium text-text-muted">
            Step {step} of 4
          </span>
          <span className="text-secondary text-text-muted">
            {step === 1 && 'Title & category'}
            {step === 2 && 'Scope & deliverables'}
            {step === 3 && 'Price & floor'}
            {step === 4 && 'Review & publish'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 w-full">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-colors ${
                s <= step ? 'bg-volt' : 'bg-border-subtle'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Title & category */}
      {step === 1 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              {isEditing ? 'Edit your offering' : 'What are you offering?'}
            </h1>
            <p className="text-body text-text-muted">
              Give your service offering a clear title that buyers will discover.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-secondary font-medium text-text-primary">
              Offering title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Production React & Tailwind Design Tokens"
              className="w-full h-[52px] px-4 bg-surface border border-border-subtle rounded-control text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-secondary font-medium text-text-primary">
              Category
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

          <div className="flex flex-col gap-3">
            <label className="text-secondary font-medium text-text-primary">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe your experience, tooling, and what buyers can expect…"
              className="w-full bg-surface border border-border-subtle rounded-control p-4 text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate('/app/listings')}
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
              Continue to scope
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Scope & deliverables */}
      {step === 2 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              Scope and turnaround
            </h1>
            <p className="text-body text-text-muted">
              Specify your expected turnaround time and the deliverables included in this offering.
            </p>
          </div>

          {/* Turnaround Input */}
          <div className="flex flex-col gap-2">
            <label className="text-secondary font-medium text-text-primary">
              Turnaround window
            </label>
            <div className="relative max-w-xs">
              <Clock className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
              <input
                type="number"
                min={1}
                max={90}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="5"
                className="w-full h-[52px] pl-11 pr-16 bg-surface border border-border-subtle rounded-control text-body font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
              />
              <span className="text-secondary text-text-muted absolute right-4 top-4 pointer-events-none">
                days
              </span>
            </div>
            <span className="text-secondary text-text-muted">
              Your standard delivery timeline for this service.
            </span>
          </div>

          {/* Deliverables Checklist */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border-subtle">
            <span className="text-secondary font-medium text-text-primary">
              Deliverables package
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
                    aria-label="Remove item"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Deliverable */}
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
                placeholder="Add another deliverable (e.g. 1 round of revisions)"
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
              disabled={!deliveryDays}
              onClick={() => setStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Continue to pricing
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Price & lowest */}
      {step === 3 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              Pricing and flexibility
            </h1>
            <p className="text-body text-text-muted">
              Set your list price, the lowest price you’d normally take, and whether your agent can stretch for trade-offs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Public List Price */}
            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                List price
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="350"
                  className="w-full h-[52px] pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-body font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
              <span className="text-secondary text-text-muted">
                Displayed in the public marketplace.
              </span>
            </div>

            {/* Standard Lowest Price */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-secondary font-medium text-text-primary">
                  Lowest price I’d normally take
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
                  max={Number(price) || 50000}
                  value={minAcceptablePrice}
                  onChange={(e) =>
                    setMinAcceptablePrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="280"
                  className="w-full h-[52px] pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-body font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
              <span className="text-secondary text-text-muted">
                Lowest rate your agent can accept automatically.
              </span>
            </div>
          </div>

          {/* Seller Flexibility Segmented Control + Live Calculated Sentence */}
          <div className="flex flex-col gap-3 p-4 rounded-surface bg-surface border border-border-subtle">
            <span className="text-secondary font-medium text-text-primary">Flexibility</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { id: 'strict', label: 'Hold firm' },
                { id: 'flexible', label: 'Flexible, down to −10%' },
                { id: 'very_flexible', label: 'Very flexible, down to −20%' }
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFlexibility(opt.id)}
                  className={`h-11 px-3 rounded-[10px] text-secondary font-medium transition-colors cursor-pointer ${
                    flexibility === opt.id
                      ? 'bg-volt text-[#0C0E0D] font-bold'
                      : 'bg-raised border border-border-subtle text-text-muted hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-secondary text-text-muted">
              {(() => {
                const std = Number(minAcceptablePrice) || 0;
                const pct = flexibility === 'strict' ? 0 : flexibility === 'very_flexible' ? 0.2 : 0.1;
                const absMin = Math.round(std * (1 - pct));
                const flexWord = flexibility === 'strict' ? 'Hold firm' : flexibility === 'very_flexible' ? 'Very flexible' : 'Flexible';
                return flexibility === 'strict'
                  ? `With ${formatMoney(std)} lowest and Hold firm, I will never accept below ${formatMoney(std)}.`
                  : `With ${formatMoney(std)} lowest and ${flexWord}, I can negotiate trades (more days, smaller scope, or upfront pay) and ask your OK down to ${formatMoney(absMin)}.`;
              })()}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
            >
              Back
            </Button>
            <Button
              variant="volt"
              size="md"
              disabled={!price || !minAcceptablePrice || Number(minAcceptablePrice) > Number(price)}
              onClick={() => setStep(4)}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Continue to review
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & publish */}
      {step === 4 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              Review and publish
            </h1>
            <p className="text-body text-text-muted">
              Verify your commercial terms before publishing to the marketplace.
            </p>
          </div>

          <Card className="p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-5">
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-text-muted">{category} Offering</span>
                <h3 className="font-display font-bold text-[22px] text-text-primary">
                  {title}
                </h3>
              </div>
              <StatusChip label="Ready" role="neutral" size="md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-raised rounded-control flex flex-col gap-1">
                <span className="text-secondary text-text-muted">Asking price</span>
                <span className="font-display font-bold text-[28px] text-text-primary">
                  {formatMoney(Number(price))}
                </span>
                <span className="text-secondary text-text-muted">Public to buyers</span>
              </div>

              <div className="p-4 bg-raised rounded-control flex flex-col gap-1">
                <span className="text-secondary text-text-muted">Standard lowest price</span>
                <span className="font-display font-bold text-[28px] text-text-primary">
                  {formatMoney(Number(minAcceptablePrice))}
                </span>
                <span className="text-secondary text-status-handled flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Hidden from buyers ({flexibility === 'strict' ? 'Stick to lowest' : flexibility === 'very_flexible' ? `up to -20% (${formatMoney(computedHardMin)})` : `up to -10% (${formatMoney(computedHardMin)})`})</span>
                </span>
              </div>
            </div>

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

            <div className="p-4 rounded-control bg-raised border border-border-subtle flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-volt shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex flex-col gap-1">
                <span className="text-secondary font-semibold text-text-primary">
                  Autonomous seller protection
                </span>
                <p className="text-secondary text-text-muted leading-relaxed">
                  Your agent will automatically reject any offer below your floor price of {formatMoney(Number(minAcceptablePrice))}. All payments are held in escrow before you begin work.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep(3)}
              leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
            >
              Back to pricing
            </Button>
            <Button
              variant="volt"
              size="lg"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              {isEditing ? 'Save changes' : 'Publish offering'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};