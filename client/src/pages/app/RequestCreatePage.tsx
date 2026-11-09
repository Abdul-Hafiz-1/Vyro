import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  Bot,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldCheck,
  Clock,
  DollarSign,
  Lock,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const RequestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const targetSellerId = location.state?.targetSellerId;
  const initialPrompt = location.state?.initialPrompt || location.state?.prefilledPrompt;

  const [prompt, setPrompt] = useState(
    initialPrompt || ''
  );
  const [isParsing, setIsParsing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasParsed, setHasParsed] = useState(false);

  // Structured Parameters
  const [title, setTitle] = useState(initialPrompt ? 'Commercial Service Request' : '');
  const [maxBudget, setMaxBudget] = useState<number | ''>(initialPrompt ? 250 : '');
  const [targetBudget, setTargetBudget] = useState<number | ''>(initialPrompt ? 200 : '');
  const [deadlineDays, setDeadlineDays] = useState<number | ''>(initialPrompt ? 5 : '');
  const [category, setCategory] = useState<string>('Design');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliverable, setNewDeliverable] = useState('');

  // Fetch available seller agents
  const { data: allAgents = [] } = useQuery({
    queryKey: ['sellerAgentsForProcure'],
    queryFn: () => api.getAgents({ type: 'seller' })
  });

  const samplePresets = [
    {
      label: 'Security Audit',
      badge: '$350 • 4d',
      text: 'I need an OWASP top-10 security audit of my Express API completed within 4 days for under $350 USD.'
    },
    {
      label: 'Brand Identity',
      badge: '$180 • 5d',
      text: 'I need a responsive, high-converting brand landing page with accessible Tailwind design tokens, delivery in 5 days, budget under $180 USD.'
    },
    {
      label: 'Mobile Architecture',
      badge: '$280 • 6d',
      text: 'Cross-platform mobile app architecture with clean state management, API integration, and unit tests. Budget $280 within 6 days.'
    }
  ];

  // Discovered matching sellers
  const matchingSellers = useMemo(() => {
    return allAgents.filter(a => {
      if (a.ownerId === user?.id) return false; // Strict isolation: never buy from yourself
      if (category.toLowerCase() === 'security') {
        return a.category.toLowerCase() === 'security' || a.id.includes('rosto') || a.id.includes('aether');
      }
      return a.category.toLowerCase() === category.toLowerCase() || a.category === 'General';
    }).slice(0, 3);
  }, [allAgents, category, user?.id]);

  const handleParsePrompt = async (promptOverride?: string) => {
    const textToParse = (promptOverride || prompt).trim();
    if (!textToParse) {
      toast.error('Please enter your purchasing requirements.');
      return;
    }

    setIsParsing(true);
    try {
      const result = await api.parsePurchasingPrompt(textToParse);
      setTitle(result.title);
      setMaxBudget(result.maxBudget);
      setTargetBudget(Math.round(result.maxBudget * 0.85));
      setDeadlineDays(result.deadlineDays);
      setCategory(result.category);
      setDeliverables(result.deliverables || []);
      setHasParsed(true);
      toast.success(`Specs structured: "${result.title}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse prompt');
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyPreset = (preset: typeof samplePresets[0]) => {
    setPrompt(preset.text);
    handleParsePrompt(preset.text);
  };

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  const handleLaunchAutonomousProcurement = async () => {
    const textToUse = prompt.trim();
    if (!textToUse) {
      toast.error('Please enter your purchasing requirements.');
      return;
    }

    setIsLaunching(true);
    toast.info('Dispatching buyer agent to negotiate across verified sellers...');
    try {
      // 1. Create the persistent Commerce Request
      const createdRequest = await api.createRequest({
        rawInput: textToUse,
        title: title || 'Autonomous Procurement Project',
        category: category,
        requiredCapabilities: [`${category} Architecture`, 'Quality Verification'],
        deliverables: deliverables.length > 0 ? deliverables : [`${title} Deliverable`, 'Verification Hand-off'],
        maxBudget: maxBudget === '' ? undefined : Number(maxBudget),
        currency: 'USD',
        deadlineDays: deadlineDays === '' ? undefined : Number(deadlineDays),
        qualityRequirements: 'Verified delivery, source tokens included, zero technical debt.'
      });

      // 2. Select matching sellers
      let sellerIds = targetSellerId ? [targetSellerId] : [];
      if (sellerIds.length === 0) {
        sellerIds = matchingSellers.map(s => s.id);
      }
      if (sellerIds.length === 0 && allAgents.length > 0) {
        sellerIds = allAgents.slice(0, 2).map(a => a.id);
      }

      // Ensure buyer doesn't negotiate with their own seller agent
      const myAgentIds = allAgents.filter(a => a.ownerId === user?.id).map(a => a.id);
      sellerIds = sellerIds.filter(sId => !myAgentIds.includes(sId));

      // 3. Launch multi-agent negotiation
      const result = await api.runMultiAgentNegotiation(createdRequest.id, sellerIds);

      toast.success('Negotiation initiated. Entering deal channel...');
      const recommendedNegId = result.evaluation?.recommendedNegotiationId || result.negotiations[0]?.id;
      navigate(`/app/deals/${recommendedNegId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch procurement');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-vyro-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold font-mono text-vyro-text uppercase tracking-wider">
              New Request
            </h1>
            <Badge variant="accent" size="sm">
              Autonomous Procurement
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted mt-0.5">
            Describe what you need in plain language. Your buyer agent handles search, negotiations, and pricing.
          </p>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Natural Language Input & Fine-Tuning (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Natural Language Canvas */}
          <div className="p-4 sm:p-5 rounded-xl bg-vyro-surface border border-vyro-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-vyro-text flex items-center gap-2 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Procurement Brief</span>
              </label>
              <button
                type="button"
                onClick={() => handleParsePrompt()}
                disabled={isParsing}
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium"
              >
                {isParsing ? 'Structuring Specs...' : 'Structure with AI →'}
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the service or project, budget ceiling, delivery timeline, and key requirements..."
                className="w-full bg-vyro-card border border-vyro-border rounded-lg p-3 text-xs text-vyro-text leading-relaxed focus:outline-none focus:border-vyro-accent resize-none transition-colors font-sans"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1.5">
                Sample Projects:
              </span>
              <div className="flex flex-wrap gap-2">
                {samplePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1.5 rounded-lg bg-vyro-card border border-vyro-border/60 hover:border-vyro-accent/50 text-[11px] text-vyro-muted hover:text-vyro-text transition-colors flex items-center gap-2 font-mono"
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] text-vyro-subtle font-mono">{preset.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Structured Requirements Editor */}
          <div className="p-4 sm:p-5 rounded-xl bg-vyro-surface border border-vyro-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-vyro-border/50">
              <span className="text-xs font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Structured Parameters
              </span>
              <span className="text-[10px] font-mono text-vyro-muted">
                {hasParsed ? '✓ AI Parsed' : 'Manual / Template'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-vyro-muted block mb-1">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-1.5 text-xs text-vyro-text font-medium focus:outline-none focus:border-vyro-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-vyro-muted flex items-center justify-between mb-1">
                    <span>Max Budget Ceiling</span>
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Strictly Private
                    </span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-vyro-subtle absolute left-2.5 top-2" />
                    <input
                      type="number"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(Number(e.target.value))}
                      className="w-full bg-vyro-card border border-vyro-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-vyro-text font-mono tabular-nums focus:outline-none focus:border-vyro-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-vyro-muted block mb-1">Deadline</label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-vyro-subtle absolute left-2.5 top-2" />
                    <input
                      type="number"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className="w-full bg-vyro-card border border-vyro-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-vyro-text font-mono tabular-nums focus:outline-none focus:border-vyro-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Deliverables List */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-mono text-vyro-muted block">Required Deliverables</label>
                <div className="space-y-1.5">
                  {deliverables.map((del, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-vyro-card border border-vyro-border/60 text-xs text-vyro-text"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{del}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(idx)}
                        className="text-vyro-subtle hover:text-vyro-error p-0.5 transition-colors"
                        aria-label="Remove deliverable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDeliverable())}
                    placeholder="Add specific delivery item..."
                    className="flex-1 bg-vyro-card border border-vyro-border rounded-lg px-3 py-1.5 text-xs text-vyro-text placeholder-vyro-subtle focus:outline-none focus:border-vyro-accent"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeliverable}
                    leftIcon={<Plus className="w-3 h-3" />}
                    className="text-xs h-8 px-3"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Matched Sellers & Launch Dispatch (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-vyro-surface border border-vyro-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-vyro-border/50">
              <span className="text-xs font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Matching Sellers
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {matchingSellers.length} Ready
              </span>
            </div>

            <p className="text-xs text-vyro-muted">
              Your buyer agent will initiate parallel negotiations with these verified counterparties.
            </p>

            <div className="space-y-2">
              {matchingSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="p-3 rounded-lg bg-vyro-card border border-vyro-border/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-vyro-text">{seller.businessName}</span>
                      {seller.verificationStatus === 'verified' && (
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-vyro-muted block">
                      {seller.category} · Starts ~${seller.pricingConstraints.startingPrice || 150}
                    </span>
                  </div>
                  <Badge variant="default" size="sm">
                    {seller.negotiationStrategy.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Private Leaks Guarantee</span>
              </div>
              <p className="text-[11px] text-vyro-muted font-sans">
                Your ceiling of ${maxBudget} is never transmitted to seller prompts or logs.
              </p>
            </div>

            {/* Primary Dispatch Action */}
            <Button
              variant="primary"
              size="lg"
              isLoading={isLaunching}
              onClick={handleLaunchAutonomousProcurement}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full justify-center text-xs font-semibold py-3 rounded-lg"
            >
              Dispatch Autonomous Procurement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
