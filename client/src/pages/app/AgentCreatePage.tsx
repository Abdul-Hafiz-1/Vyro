import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowLeft, ArrowRight, ShieldCheck, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AgentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState<'buyer' | 'seller'>('seller');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Design');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>(['Responsive UI', 'Landing Page']);
  const [capInput, setCapInput] = useState('');
  
  // Pricing Constraints
  const [startingPrice, setStartingPrice] = useState(180);
  const [minAcceptablePrice, setMinAcceptablePrice] = useState(140);
  const [maxBudget, setMaxBudget] = useState(200);
  const [flexibilityPercent, setFlexibilityPercent] = useState(20);
  const [negotiationStrategy, setNegotiationStrategy] = useState<'balanced' | 'aggressive_cost' | 'quality_first' | 'expedited'>('balanced');

  // Service Catalog
  const [catalogItems, setCatalogItems] = useState([
    {
      id: 'cat_custom_1',
      name: 'Custom Professional Landing Page',
      description: 'Full bespoke landing page layout with responsive mobile navigation and interactive sections.',
      startingPrice: 180,
      minPrice: 140,
      deliveryDays: 5,
      includedDeliverables: ['Responsive Layout', 'Contact Form', 'Component Animations']
    }
  ]);

  const addCapability = () => {
    if (capInput.trim() && !capabilities.includes(capInput.trim())) {
      setCapabilities([...capabilities, capInput.trim()]);
      setCapInput('');
    }
  };

  const removeCapability = (item: string) => {
    setCapabilities(capabilities.filter(c => c !== item));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.createAgent({
        name: name || (type === 'buyer' ? 'Strategic Buyer' : `${businessName} Agent`),
        businessName: businessName || 'Autonomous Ventures Co',
        type,
        category,
        description: description || 'Autonomous network agent configured with strict pricing constraints.',
        capabilities,
        status: 'active',
        verificationStatus: 'verified',
        catalog: type === 'seller' ? catalogItems : [],
        pricingConstraints: {
          startingPrice,
          minAcceptablePrice,
          maxBudget,
          flexibilityPercent
        },
        negotiationStrategy,
        approvalPolicy: 'explicit_human_required'
      });
      navigate('/app/agents');
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-vyro-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/agents')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-vyro-text tracking-tight">Deploy Network Agent</h1>
            <p className="text-xs text-vyro-muted">Step {step} of 3 • Autonomous Parameters</p>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className={`p-2.5 rounded border text-center ${step === 1 ? 'border-vyro-accent bg-vyro-surface text-vyro-text font-bold' : 'border-vyro-border text-vyro-muted'}`}>
          1. Role & Identity
        </div>
        <div className={`p-2.5 rounded border text-center ${step === 2 ? 'border-vyro-accent bg-vyro-surface text-vyro-text font-bold' : 'border-vyro-border text-vyro-muted'}`}>
          2. Pricing Guardrails
        </div>
        <div className={`p-2.5 rounded border text-center ${step === 3 ? 'border-vyro-accent bg-vyro-surface text-vyro-text font-bold' : 'border-vyro-border text-vyro-muted'}`}>
          3. Catalog & Strategy
        </div>
      </div>

      {/* Step 1: Role & Identity */}
      {step === 1 && (
        <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-5">
          <div>
            <label className="text-xs font-mono uppercase text-vyro-muted block mb-2">Agent Role Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('seller')}
                className={`p-4 rounded-[6px] border text-left transition-colors ${
                  type === 'seller' ? 'bg-vyro-hover border-vyro-accent text-vyro-text' : 'bg-vyro-card border-vyro-border text-vyro-muted'
                }`}
              >
                <div className="font-bold text-sm text-vyro-text">Seller Agent</div>
                <div className="text-xs text-vyro-muted mt-1 leading-snug">Represents a service business, quotes prices, and defends profit floors.</div>
              </button>

              <button
                type="button"
                onClick={() => setType('buyer')}
                className={`p-4 rounded-[6px] border text-left transition-colors ${
                  type === 'buyer' ? 'bg-vyro-hover border-vyro-accent text-vyro-text' : 'bg-vyro-card border-vyro-border text-vyro-muted'
                }`}
              >
                <div className="font-bold text-sm text-vyro-text">Buyer Agent</div>
                <div className="text-xs text-vyro-muted mt-1 leading-snug">Autonomous procurement officer enforcing budget limits and deliverable verification.</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Agent Name</label>
              <input
                type="text"
                placeholder={type === 'buyer' ? 'Studio Buyer' : 'Pixel Studio Agent'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Business / Entity Name</label>
              <input
                type="text"
                placeholder="Pixel Studio Collective"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
            >
              <option value="Design">Design</option>
              <option value="Development">Development</option>
              <option value="Security">Security</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Description & Scope</label>
            <textarea
              rows={3}
              placeholder="Describe this agent's core commercial focus..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => setStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Configure Pricing Guardrails
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Pricing Guardrails */}
      {step === 2 && (
        <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-5">
          <div className="p-3 rounded bg-vyro-card border border-vyro-border text-xs text-vyro-muted flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-vyro-success shrink-0 mt-0.5" />
            <p>
              Deterministic Boundary: These prices are hard-coded constraints. The AI model is strictly prohibited from proposing or accepting amounts outside these thresholds.
            </p>
          </div>

          {type === 'seller' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Starting Quote Price ($ USD)</label>
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm font-mono text-vyro-text focus:outline-none focus:border-vyro-accent"
                />
                <span className="text-[10px] text-vyro-subtle font-mono block mt-1">Initial counteroffer anchor</span>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Minimum Acceptable Price ($ USD)</label>
                <input
                  type="number"
                  value={minAcceptablePrice}
                  onChange={(e) => setMinAcceptablePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm font-mono text-vyro-text focus:outline-none focus:border-vyro-accent"
                />
                <span className="text-[10px] text-vyro-warning font-mono block mt-1">Absolute bottom floor; cannot be breached</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Maximum Authorized Budget ($ USD)</label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(parseFloat(e.target.value) || 0)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm font-mono text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
              <span className="text-[10px] text-vyro-warning font-mono block mt-1">Buyer agent will reject any proposal exceeding this value</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-vyro-border">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Service Catalog & Policy
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Catalog & Policy */}
      {step === 3 && (
        <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-5">
          <div>
            <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Negotiation Strategy</label>
            <select
              value={negotiationStrategy}
              onChange={(e) => setNegotiationStrategy(e.target.value as any)}
              className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent font-mono"
            >
              <option value="balanced">Balanced (Pragmatic compromise)</option>
              <option value="aggressive_cost">Aggressive Cost (Firm pricing anchor)</option>
              <option value="quality_first">Quality First (Defend deliverables & SLA)</option>
              <option value="expedited">Expedited (Fast closing turnarounds)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">Capabilities / Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add capability (e.g. Tailwind CSS, Security Audit)"
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                className="flex-1 bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addCapability}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-vyro-card border border-vyro-border text-vyro-text flex items-center gap-1.5"
                >
                  {cap}
                  <button type="button" onClick={() => removeCapability(cap)} className="text-vyro-subtle hover:text-vyro-error">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded bg-vyro-card border border-vyro-border text-xs font-mono text-vyro-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Human Approval Policy: Mandatory explicit authorization locked in.</span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-vyro-border">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="accent" size="lg" isLoading={isSubmitting} onClick={handleSubmit}>
              Deploy Agent to Network
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
