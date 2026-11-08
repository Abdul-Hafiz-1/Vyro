import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  Edit2,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const RequestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const targetSellerId = location.state?.targetSellerId;
  const initialPrompt = location.state?.initialPrompt;

  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isParsing, setIsParsing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  // Editable parsed fields
  const [title, setTitle] = useState('');
  const [maxBudget, setMaxBudget] = useState(150);
  const [deadlineDays, setDeadlineDays] = useState(5);
  const [category, setCategory] = useState('Design');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliv, setNewDeliv] = useState('');

  const { data: aiStatus } = useQuery({
    queryKey: ['aiStatusRequest'],
    queryFn: api.getAIStatus,
  });

  const samplePresets = [
    {
      label: 'SaaS Landing Page ($150, 5d)',
      text: 'I need a landing page for my SaaS business. My budget is $150 and I need delivery within five days.'
    },
    {
      label: 'Smart Contract & API Audit ($400, 7d)',
      text: 'Need a fast-track security audit for our smart contracts and REST API auth with vulnerability report for $400 within 7 days.'
    },
    {
      label: 'Interactive Design System ($250, 4d)',
      text: 'Need a dark-mode design system with Tailwind CSS tokens and accessible component states within 4 days for $250 max.'
    }
  ];

  const handleParsePrompt = async (promptOverride?: string) => {
    const textToParse = (promptOverride || prompt).trim();
    if (!textToParse) {
      toast.error('Please enter your purchasing requirements.');
      return;
    }

    setIsParsing(true);
    try {
      const result = await api.parsePurchasingPrompt(textToParse);
      setParsedData(result);
      setTitle(result.title);
      setMaxBudget(result.maxBudget);
      setDeadlineDays(result.deadlineDays);
      setCategory(result.category);
      setDeliverables(result.deliverables || []);
      if (result.isAiGenerated) {
        toast.success(`Gemini AI structured requirements: "${result.title}"`);
      } else {
        toast.success(`Structured requirements generated: "${result.title}"`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse prompt');
    } finally {
      setIsParsing(false);
    }
  };

  // Automatically parse initialPrompt if passed from Landing Page or Navigation
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleParsePrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleApplyPreset = (presetText: string) => {
    setPrompt(presetText);
    handleParsePrompt(presetText);
  };

  const handleLaunchMultiAgent = async () => {
    const textToUse = prompt.trim();
    if (!textToUse) {
      toast.error('Please enter your purchasing requirements.');
      return;
    }

    setIsLaunching(true);
    toast.info('Dispatching Buyer Agent to negotiate across network...');
    try {
      let currentTitle = title;
      let currentCategory = category;
      let currentBudget = maxBudget;
      let currentDeadline = deadlineDays;
      let currentDeliverables = deliverables;
      let currentCapabilities = parsedData?.requiredCapabilities;
      let currentQuality = parsedData?.qualityRequirements;

      // If user hasn't explicitly clicked Analyze yet, auto-parse now so their text is honored
      if (!parsedData || !currentTitle) {
        const parsed = await api.parsePurchasingPrompt(textToUse);
        currentTitle = parsed.title;
        currentCategory = parsed.category;
        currentBudget = parsed.maxBudget;
        currentDeadline = parsed.deadlineDays;
        currentDeliverables = parsed.deliverables;
        currentCapabilities = parsed.requiredCapabilities;
        currentQuality = parsed.qualityRequirements;
      }

      // 1. Create the persistent Commerce Request
      const createdRequest = await api.createRequest({
        buyerAgentId: 'agent_buyer_studio',
        rawInput: textToUse,
        title: currentTitle,
        category: currentCategory,
        requiredCapabilities: currentCapabilities || [`${currentCategory} Architecture`, 'Quality Assurance QA'],
        deliverables: currentDeliverables && currentDeliverables.length > 0 
          ? currentDeliverables 
          : [`${currentTitle} Core Implementation`, 'Quality Assurance Verification'],
        maxBudget: currentBudget,
        currency: 'USD',
        deadlineDays: currentDeadline,
        qualityRequirements: currentQuality || 'Clean verified delivery, zero console warnings.'
      });

      // 2. Select matching sellers based on category
      let sellerIds = targetSellerId ? [targetSellerId] : [];
      if (sellerIds.length === 0) {
        if (currentCategory.toLowerCase() === 'security') {
          sellerIds = ['agent_seller_aether', 'agent_seller_launchcraft', 'agent_seller_pixel'];
        } else {
          sellerIds = ['agent_seller_pixel', 'agent_seller_launchcraft', 'agent_seller_northstar'];
        }
      }

      // 3. Launch multi-agent negotiation
      const result = await api.runMultiAgentNegotiation(createdRequest.id, sellerIds);

      toast.success('Autonomous multi-agent consensus formed! Directing to workspace...');
      const recommendedNegId = result.evaluation?.recommendedNegotiationId || result.negotiations[0]?.id;
      navigate(`/app/negotiations/${recommendedNegId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to launch negotiation');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-vyro-border">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
            Procurement Request Engine
          </h1>
          {aiStatus?.isLive ? (
            <Badge variant="success" size="sm" dot>Gemini Live</Badge>
          ) : (
            <Link to="/app/settings">
              <Badge variant="outline" size="sm">Smart Extractor</Badge>
            </Link>
          )}
        </div>
        <p className="text-xs text-vyro-muted">
          Specify what you need in plain natural language. VYRO structures the requirements and launches autonomous negotiations with seller agents.
        </p>
      </div>

      {/* Natural Language Prompt Card */}
      <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-mono uppercase text-vyro-muted block">
            Natural Language Commercial Requirement
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-vyro-subtle">Presets:</span>
            {samplePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset.text)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-vyro-card hover:bg-vyro-hover text-vyro-accent border border-vyro-border/60 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your requirements freely, e.g.: I need a bespoke mobile ecommerce design with Apple Pay, maximum budget $220, turnaround in 6 days..."
            className="w-full bg-vyro-card border border-vyro-border rounded-[6px] p-3.5 text-xs text-vyro-text placeholder:text-vyro-subtle focus:outline-none focus:border-vyro-accent transition-colors leading-relaxed font-sans"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <span className="text-[11px] font-mono text-vyro-muted">
            {prompt.trim().length > 0 ? `${prompt.trim().split(/\s+/).length} words entered` : 'Ready for input'}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isParsing}
              onClick={() => handleParsePrompt()}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-vyro-accent" />}
              className="flex-1 sm:flex-initial"
            >
              {parsedData ? 'Re-Structure Requirements' : 'Analyze Requirements'}
            </Button>
            <Button
              variant="accent"
              size="sm"
              isLoading={isLaunching}
              onClick={handleLaunchMultiAgent}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-initial"
            >
              Negotiate Now
            </Button>
          </div>
        </div>
      </div>

      {/* Structured Interpretation & Verification (Editable) */}
      {parsedData && (
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-vyro-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-vyro-success" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
                Structured Specifications
              </h3>
            </div>
            <span className="text-[11px] font-mono text-vyro-muted">
              {parsedData.isAiGenerated ? 'Gemini AI Extracted' : 'Smart Parser'} • Verified & Editable
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Contract Scope Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Budget Ceiling ($ USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs font-mono font-bold text-vyro-text focus:outline-none focus:border-vyro-accent pl-6"
                />
                <span className="absolute left-2.5 top-1.5 text-xs font-mono text-vyro-muted">$</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Turnaround Limit (Days)</label>
              <div className="relative">
                <input
                  type="number"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs font-mono font-bold text-vyro-text focus:outline-none focus:border-vyro-accent pl-3"
                />
                <span className="absolute right-3 top-1.5 text-xs font-mono text-vyro-muted">Days</span>
              </div>
            </div>
          </div>

          {/* Deliverables Checklist */}
          <div>
            <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-2">
              Deliverables Required ({deliverables.length})
            </label>
            <div className="space-y-1.5 mb-3">
              {deliverables.map((deliv, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-vyro-card border border-vyro-border text-xs"
                >
                  <span className="text-vyro-text">{deliv}</span>
                  <button
                    type="button"
                    onClick={() => setDeliverables(deliverables.filter((_, i) => i !== index))}
                    className="text-vyro-subtle hover:text-vyro-error transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add another deliverable..."
                value={newDeliv}
                onChange={(e) => setNewDeliv(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDeliv.trim()) {
                    e.preventDefault();
                    setDeliverables([...deliverables, newDeliv.trim()]);
                    setNewDeliv('');
                  }
                }}
                className="flex-1 bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (newDeliv.trim()) {
                    setDeliverables([...deliverables, newDeliv.trim()]);
                    setNewDeliv('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Action to dispatch */}
          <div className="pt-3 border-t border-vyro-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-vyro-muted">
              <Bot className="w-3.5 h-3.5 text-vyro-accent" />
              <span>Assigned Buyer Agent: Studio Buyer</span>
            </div>

            <Button
              variant="accent"
              size="md"
              isLoading={isLaunching}
              onClick={handleLaunchMultiAgent}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Dispatch Multi-Agent Negotiation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
