import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ListingCategory, ListingType, ListingStatus } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Shield,
  Layers,
  Sparkles,
  Bot
} from 'lucide-react';

export const ListingEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = Boolean(id && id !== 'new');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Design');
  const [type, setType] = useState<ListingType>('service');
  const [price, setPrice] = useState<number>(350);
  const [minAcceptablePrice, setMinAcceptablePrice] = useState<number>(280);
  const [deliveryDays, setDeliveryDays] = useState<number>(5);
  const [deliverables, setDeliverables] = useState<string[]>([
    'Figma design system files with autolayout',
    'Interactive desktop & mobile prototype',
    'Design token export and developer handoff documentation'
  ]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [isNegotiable, setIsNegotiable] = useState<boolean>(true);
  const [status, setStatus] = useState<ListingStatus>('active');

  const { data: existingListing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: isEditing
  });

  useEffect(() => {
    if (existingListing) {
      setTitle(existingListing.title || '');
      setDescription(existingListing.description || '');
      setCategory(existingListing.category || 'Design');
      setType(existingListing.type || 'service');
      setPrice(existingListing.price || 350);
      setMinAcceptablePrice(existingListing.minAcceptablePrice || 280);
      setDeliveryDays(existingListing.deliveryDays || 5);
      setDeliverables(existingListing.deliverables || []);
      setIsNegotiable(existingListing.isNegotiable ?? true);
      setStatus(existingListing.status || 'active');
    }
  }, [existingListing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        category,
        type,
        price,
        minAcceptablePrice,
        deliveryDays,
        deliverables,
        isNegotiable,
        status,
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
      toast.success(isEditing ? 'Listing updated successfully' : 'Listing published to marketplace');
      navigate('/app/listings');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save listing');
    }
  });

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  if (isEditing && isLoading) {
    return (
      <div className="p-12 text-center text-xs text-vyro-muted">
        Loading listing specifications...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-vyro-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/listings')}
            className="p-1.5 rounded bg-vyro-surface hover:bg-vyro-hover border border-vyro-border text-vyro-muted hover:text-vyro-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-vyro-text">
              {isEditing ? 'Edit Commercial Listing' : 'Publish New Offering'}
            </h1>
            <p className="text-xs text-vyro-muted mt-0.5">
              Define scope, price limits, and negotiation bounds for your seller agent.
            </p>
          </div>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title}
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Listing' : 'Publish Offering'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
            <div>
              <label className="text-xs font-medium text-vyro-text block mb-1.5">Listing Title</label>
              <input
                type="text"
                placeholder="e.g. Production Web & Mobile Design System"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-vyro-text block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ListingCategory)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
                >
                  <option value="Design">Design</option>
                  <option value="Development">Development</option>
                  <option value="Security">Security</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-vyro-text block mb-1.5">Offering Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ListingType)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
                >
                  <option value="service">Freelance Service</option>
                  <option value="physical_product">Physical Product</option>
                  <option value="digital_product">Digital Asset / License</option>
                  <option value="custom_project">Custom Project</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-text block mb-1.5">Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Describe what is included, your methodology, technical stack, and prerequisites..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent leading-relaxed"
              />
            </div>
          </div>

          {/* Scope Deliverables */}
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-vyro-text block">Scope Deliverables Checklist</span>
                <span className="text-[10px] text-vyro-muted">Included in contractual agreements</span>
              </div>
              <Badge variant="neutral" size="sm">{deliverables.length} Items</Badge>
            </div>

            <div className="space-y-1.5">
              {deliverables.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-vyro-card border border-vyro-border text-xs text-vyro-text">
                  <span className="truncate pr-2">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(idx)}
                    className="text-vyro-muted hover:text-vyro-error transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add another deliverable item..."
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDeliverable())}
                className="flex-1 bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddDeliverable}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Pricing & AI Policy (1 col) */}
        <div className="space-y-4">
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
            <span className="text-xs font-semibold text-vyro-text block pb-2 border-b border-vyro-border/60">
              Commercial Pricing Parameters
            </span>

            <div>
              <label className="text-xs font-medium text-vyro-text block mb-1">List Price ($ USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text font-mono focus:outline-none focus:border-vyro-accent pl-7"
                />
                <DollarSign className="w-3.5 h-3.5 text-vyro-subtle absolute left-2.5 top-2.5" />
              </div>
              <span className="text-[10px] text-vyro-muted mt-1 block">Starting asking price</span>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-text block mb-1">
                Minimum Floor Price ($ USD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={minAcceptablePrice}
                  onChange={(e) => setMinAcceptablePrice(Number(e.target.value))}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text font-mono focus:outline-none focus:border-vyro-accent pl-7"
                />
                <DollarSign className="w-3.5 h-3.5 text-vyro-accent absolute left-2.5 top-2.5" />
              </div>
              <span className="text-[10px] text-vyro-accent mt-1 block">
                Agent rejects any offer under this floor
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-text block mb-1">Turnaround Days</label>
              <div className="relative">
                <input
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(Number(e.target.value))}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-2 text-xs text-vyro-text font-mono focus:outline-none focus:border-vyro-accent pl-7"
                />
                <Clock className="w-3.5 h-3.5 text-vyro-subtle absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="pt-2 border-t border-vyro-border/60">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="rounded border-vyro-border text-vyro-accent focus:ring-0"
                />
                <span className="text-xs font-medium text-vyro-text">Enable AI Agent Negotiation</span>
              </label>
              <p className="text-[10px] text-vyro-muted mt-1 pl-5">
                Allows buyer agents to counter-offer within your minimum price floor.
              </p>
            </div>
          </div>

          {/* AI Guardian Card */}
          <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-vyro-text">
              <Bot className="w-4 h-4 text-vyro-accent" />
              <span>Seller Agent Defense</span>
            </div>
            <p className="text-[11px] text-vyro-muted leading-relaxed">
              When a buyer agent initiates contact, your agent defends your ${minAcceptablePrice} floor and checks that your delivery schedule ({deliveryDays} days) can be met without schedule conflicts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
