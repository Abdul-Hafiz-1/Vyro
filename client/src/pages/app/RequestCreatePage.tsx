import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Edit2,
  Check
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const RequestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const targetSellerId = location.state?.targetSellerId;

  const defaultPrompt = "I need a professionally designed landing page for my new business. My maximum budget is $150. I need it within five days.";
  const [prompt, setPrompt] = useState(defaultPrompt);
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

  // Fetch candidate agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agentsList'],
    queryFn: () => api.getAgents({ type: 'seller' })
  });

  const handleParsePrompt = async () => {
    setIsParsing(true);
    try {
      const result = await api.parsePurchasingPrompt(prompt);
      setParsedData(result);
      setTitle(result.title);
      setMaxBudget(result.maxBudget);
      setDeadlineDays(result.deadlineDays);
      setCategory(result.category);
      setDeliverables(result.deliverables);
    } catch (err) {
      console.error('Failed to parse prompt:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLaunchMultiAgent = async () => {
    setIsLaunching(true);
    try {
      // 1. Create the persistent Commerce Request
      const createdRequest = await api.createRequest({
        buyerAgentId: 'agent_buyer_studio',
        rawInput: prompt,
        title,
        category,
        requiredCapabilities: parsedData?.requiredCapabilities || ['Landing Page Design', 'Responsive UI'],
        deliverables,
        maxBudget,
        currency: 'USD',
        deadlineDays,
        qualityRequirements: parsedData?.qualityRequirements || 'Clean responsive design, zero errors.'
      });

      // 2. Select matching sellers (or target seller if specified)
      const sellerIds = targetSellerId 
        ? [targetSellerId]
        : ['agent_seller_pixel', 'agent_seller_northstar', 'agent_seller_launchcraft'];

      // 3. Launch multi-agent negotiation
      const result = await api.runMultiAgentNegotiation(createdRequest.id, sellerIds);

      // 4. Redirect to the flagship Negotiation Center
      const recommendedNegId = result.evaluation?.recommendedNegotiationId || result.negotiations[0]?.id;
      navigate(`/app/negotiations/${recommendedNegId}`);
    } catch (err) {
      console.error('Failed to launch negotiation:', err);
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
          <Badge variant="accent" size="sm">Gemini AI Parser</Badge>
        </div>
        <p className="text-xs text-vyro-muted">
          Specify what you need in plain natural language. VYRO structures the requirements and launches autonomous negotiations with seller agents.
        </p>
      </div>

      {/* Natural Language Prompt Card */}
      <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
        <label className="text-xs font-mono uppercase text-vyro-muted block">
          Natural Language Commercial Intent
        </label>
        
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. I need a responsive landing page with contact form, max budget $150, delivery in 5 days..."
            className="w-full bg-vyro-card border border-vyro-border rounded-[6px] p-4 text-sm text-vyro-text placeholder:text-vyro-subtle focus:outline-none focus:border-vyro-accent transition-colors leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-vyro-subtle">
            Tip: Include budget ceilings and target deadlines for maximum pricing efficiency.
          </span>
          <Button
            variant="accent"
            size="md"
            isLoading={isParsing}
            onClick={handleParsePrompt}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {parsedData ? 'Re-Analyze Prompt' : 'Analyze Requirements'}
          </Button>
        </div>
      </div>

      {/* Structured Interpretation & Verification (Editable) */}
      {parsedData && (
        <div className="p-6 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-vyro-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-vyro-success" />
              <h3 className="text-sm font-semibold text-vyro-text">Structured Technical Specifications</h3>
            </div>
            <span className="text-[11px] font-mono text-vyro-muted">Review & Edit before network dispatch</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Contract Title</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Budget Ceiling ($ USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs font-mono font-bold text-vyro-text focus:outline-none focus:border-vyro-accent pl-7"
                />
                <span className="absolute left-2.5 top-1.5 text-xs font-mono text-vyro-muted">$</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1">Max Turnaround (Days)</label>
              <input
                type="number"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs font-mono font-bold text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
          </div>

          {/* Deliverables List */}
          <div>
            <label className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1.5">
              Parsed Deliverables:
            </label>
            <div className="space-y-1.5 mb-2">
              {deliverables.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-vyro-card border border-vyro-border/60 text-xs text-vyro-text">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                    <span>{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))}
                    className="text-vyro-subtle hover:text-vyro-error text-xs font-mono px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add additional deliverable requirement..."
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
          <div className="pt-4 border-t border-vyro-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-vyro-muted">
              <Bot className="w-4 h-4 text-vyro-accent" />
              <span>Assigned Buyer Agent: Studio Buyer</span>
            </div>

            <Button
              variant="accent"
              size="lg"
              isLoading={isLaunching}
              onClick={handleLaunchMultiAgent}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Launch Autonomous Negotiation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
