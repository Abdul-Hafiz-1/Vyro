import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Edit2,
  X,
  Plus,
  Sparkles,
  Search,
  ShieldCheck,
  Store
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../common/Button';
import { StatusChip } from '../common/StatusChip';
import { Chip } from '../common/Chip';
import { formatMoney } from '../../lib/present';
import { toast } from 'sonner';

interface HomePromptBoxProps {
  isSeller: boolean;
  onDealStarted?: (dealId: string) => void;
}

interface ParsedBuyerBrief {
  title: string;
  category: string;
  deliverables: string[];
  mustHaves: string[];
  maxBudget: number;
  deadlineDays: number;
  hasExplicitBudget: boolean;
  hasExplicitDeadline: boolean;
  followUpQuestion?: string | null;
  rawInput: string;
}

interface ParsedSellerDraft {
  title: string;
  category: string;
  description: string;
  deliverables: string[];
  listPrice: number;
  standardLowestPrice: number;
  deliveryDays: number;
  rawInput: string;
}

export const HomePromptBox: React.FC<HomePromptBoxProps> = ({ isSeller, onDealStarted }) => {
  const navigate = useNavigate();

  // Prompt input state
  const [promptText, setPromptText] = useState('');
  const [inlineValidation, setInlineValidation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Buyer brief state
  const [buyerBrief, setBuyerBrief] = useState<ParsedBuyerBrief | null>(null);
  const [isEditingBuyer, setIsEditingBuyer] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBudget, setEditBudget] = useState<number>(150);
  const [editDays, setEditDays] = useState<number>(5);
  const [editDeliverables, setEditDeliverables] = useState<string[]>([]);
  const [newDeliverableInput, setNewDeliverableInput] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  // Seller draft state
  const [sellerDraft, setSellerDraft] = useState<ParsedSellerDraft | null>(null);
  const [isEditingSeller, setIsEditingSeller] = useState(false);
  const [sellerTitle, setSellerTitle] = useState('');
  const [sellerDesc, setSellerDesc] = useState('');
  const [sellerListPrice, setSellerListPrice] = useState<number>(200);
  const [sellerLowestPrice, setSellerLowestPrice] = useState<number>(160);
  const [sellerDays, setSellerDays] = useState<number>(5);

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [noMatchesResult, setNoMatchesResult] = useState<string | null>(null);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  const resetAll = () => {
    setPromptText('');
    setInlineValidation(null);
    setAnalysisError(null);
    setBuyerBrief(null);
    setSellerDraft(null);
    setIsEditingBuyer(false);
    setIsEditingSeller(false);
    setNoMatchesResult(null);
    setPublishedListingId(null);
  };

  const handleAnalyze = async () => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      setInlineValidation(
        isSeller
          ? 'Please describe your service offering so I can draft your listing.'
          : 'Please tell me what you need done so I can find sellers.'
      );
      return;
    }

    setInlineValidation(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    setNoMatchesResult(null);

    try {
      if (isSeller) {
        const draft = await api.parseSellerOffering(trimmed);
        setSellerDraft({
          title: draft.title || 'Professional Freelance Service',
          category: draft.category || 'Engineering',
          description: draft.description || trimmed,
          deliverables: draft.deliverables || ['Core Deliverable', 'Documentation', 'Handover'],
          listPrice: draft.listPrice || 200,
          standardLowestPrice: draft.standardLowestPrice || Math.round((draft.listPrice || 200) * 0.8),
          deliveryDays: draft.deliveryDays || 5,
          rawInput: trimmed
        });
        setSellerTitle(draft.title || 'Professional Freelance Service');
        setSellerDesc(draft.description || trimmed);
        setSellerListPrice(draft.listPrice || 200);
        setSellerLowestPrice(draft.standardLowestPrice || Math.round((draft.listPrice || 200) * 0.8));
        setSellerDays(draft.deliveryDays || 5);
      } else {
        const brief = await api.parsePurchasingPrompt(trimmed);
        const parsed: ParsedBuyerBrief = {
          title: brief.title || 'Procurement Request',
          category: brief.category || 'Design',
          deliverables: brief.deliverables || ['Project Deliverable', 'Source Assets'],
          mustHaves: brief.mustHaves || ['Production quality implementation'],
          maxBudget: brief.maxBudget || 150,
          deadlineDays: brief.deadlineDays || 5,
          hasExplicitBudget: Boolean(brief.hasExplicitBudget),
          hasExplicitDeadline: Boolean(brief.hasExplicitDeadline),
          followUpQuestion: brief.followUpQuestion || null,
          rawInput: trimmed
        };
        setBuyerBrief(parsed);
        setEditTitle(parsed.title);
        setEditBudget(parsed.maxBudget);
        setEditDays(parsed.deadlineDays);
        setEditDeliverables(parsed.deliverables);
      }
    } catch (err: any) {
      setAnalysisError(
        'I had trouble analyzing this request. Would you like to retry or refine your description?'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isAnalyzing && !isExecuting) {
        handleAnalyze();
      }
    }
  };

  const handleApplyFollowUp = () => {
    if (!followUpAnswer.trim()) return;
    const answer = followUpAnswer.trim();

    // Check for budget extraction ($xxx or xxx)
    const budgetMatch = answer.match(/\$?(\d+)/);
    // Check for days extraction (x days or number)
    const daysMatch = answer.match(/(\d+)\s*(day|d)/i);

    if (budgetMatch && !buyerBrief?.hasExplicitBudget) {
      const bVal = parseInt(budgetMatch[1], 10);
      if (bVal > 0) {
        setEditBudget(bVal);
        if (buyerBrief) {
          buyerBrief.maxBudget = bVal;
          buyerBrief.hasExplicitBudget = true;
        }
      }
    }

    if (daysMatch && !buyerBrief?.hasExplicitDeadline) {
      const dVal = parseInt(daysMatch[1], 10);
      if (dVal > 0) {
        setEditDays(dVal);
        if (buyerBrief) {
          buyerBrief.deadlineDays = dVal;
          buyerBrief.hasExplicitDeadline = true;
        }
      }
    } else if (budgetMatch && !daysMatch && answer.match(/\b\d+\b/g)?.length! > 1) {
      // In case both were typed like "150 in 4 days"
      const numbers = answer.match(/\b\d+\b/g);
      if (numbers && numbers.length >= 2) {
        setEditDays(parseInt(numbers[1], 10));
      }
    }

    if (buyerBrief) {
      buyerBrief.followUpQuestion = null;
    }
    setFollowUpAnswer('');
    toast.success('Preferences updated in brief.');
  };

  const handleStartBuyerNegotiation = async () => {
    if (!buyerBrief) return;
    setIsExecuting(true);
    setNoMatchesResult(null);

    try {
      // 1. Create real Commerce Request in DB
      const createdRequest = await api.createRequest({
        rawInput: buyerBrief.rawInput,
        title: editTitle || buyerBrief.title,
        category: buyerBrief.category,
        deliverables: editDeliverables.length > 0 ? editDeliverables : buyerBrief.deliverables,
        maxBudget: editBudget || buyerBrief.maxBudget,
        deadlineDays: editDays || buyerBrief.deadlineDays,
        currency: 'USD',
        qualityRequirements: 'Production quality with verified deliverables.'
      });

      // 2. Autonomous Matchmaking: Resolve sellers from marketplace listings
      const multiAgentResult = await api.runMultiAgentNegotiation(createdRequest.id);

      if (multiAgentResult && multiAgentResult.negotiations && multiAgentResult.negotiations.length > 0) {
        const primaryNeg = multiAgentResult.negotiations[0];
        toast.success(`Matched with ${multiAgentResult.negotiations.length} seller agents. Negotiation underway.`);
        if (onDealStarted) {
          onDealStarted(primaryNeg.id);
        } else {
          navigate(`/app/deals/${primaryNeg.id}`);
        }
      } else {
        // No match found
        setNoMatchesResult(
          "No one offers this yet. I'll keep looking and tell you when someone does."
        );
      }
    } catch (err: any) {
      // Check if backend returned waiting for sellers or no match
      if (err.message && err.message.includes('No available seller')) {
        setNoMatchesResult(
          "No one offers this yet. I'll keep looking and tell you when someone does."
        );
      } else {
        toast.error(err.message || 'Failed to start negotiation pipeline.');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePublishSellerListing = async () => {
    if (!sellerDraft) return;
    setIsExecuting(true);

    try {
      const created = await api.createListing({
        title: sellerTitle || sellerDraft.title,
        description: sellerDesc || sellerDraft.description,
        category: sellerDraft.category as any,
        price: sellerListPrice || sellerDraft.listPrice,
        minAcceptablePrice: sellerLowestPrice || sellerDraft.standardLowestPrice,
        deliveryDays: sellerDays || sellerDraft.deliveryDays,
        deliverables: sellerDraft.deliverables,
        currency: 'USD',
        isNegotiable: true
      });

      setPublishedListingId(created.id);
      toast.success('Listing published to the marketplace.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish listing.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-surface p-6 md:p-8 flex flex-col gap-5 text-text-primary">
      {/* Box Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-section text-text-primary">
            {isSeller ? 'What do you offer?' : 'What do you need done?'}
          </h2>
          <p className="text-secondary text-text-muted">
            {isSeller
              ? 'Describe your service and pricing. AI will draft a complete listing.'
              : 'Describe your project in plain words. AI will find sellers and negotiate terms.'}
          </p>
        </div>
        <StatusChip
          label={isSeller ? 'Seller Concierge' : 'Autonomous Procurement'}
          role="neutral"
          size="sm"
        />
      </div>

      {/* Main Multi-Line Input Box (when no brief is active) */}
      {!buyerBrief && !sellerDraft && !publishedListingId && !noMatchesResult && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <textarea
              rows={3}
              value={promptText}
              disabled={isAnalyzing}
              onChange={(e) => {
                setPromptText(e.target.value);
                if (inlineValidation) setInlineValidation(null);
                if (analysisError) setAnalysisError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isSeller
                  ? 'e.g. Full-stack React & Node development with automated testing, $300 list, lowest $240, delivered in 4 days'
                  : 'e.g. Design a responsive landing page with Tailwind design tokens in 5 days for under $180'
              }
              className={`w-full p-4 bg-raised border rounded-control text-body text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors resize-none leading-relaxed ${
                inlineValidation ? 'border-status-declined' : 'border-border-subtle'
              } ${isAnalyzing ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Inline Validation Warning */}
          {inlineValidation && (
            <div className="flex items-center gap-2 text-secondary text-status-declined font-medium px-1">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{inlineValidation}</span>
            </div>
          )}

          {/* Analysis Error Message with Retry */}
          {analysisError && (
            <div className="p-3.5 rounded-control bg-status-declined/10 border border-status-declined/20 flex items-center justify-between gap-3 text-secondary text-status-declined">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>{analysisError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-secondary text-text-muted">Suggested:</span>
              {(isSeller
                ? ['Full-stack React & Node development', 'API security testing and audit', 'Mobile app UI design in Figma']
                : ['Landing page with Tailwind tokens', 'OWASP API security audit', 'Mobile cross-platform foundation']
              ).map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  onClick={() => {
                    if (isAnalyzing) return;
                    setPromptText(chip);
                    if (inlineValidation) setInlineValidation(null);
                  }}
                />
              ))}
            </div>

            <Button
              variant="volt"
              size="md"
              disabled={isAnalyzing}
              isLoading={isAnalyzing}
              onClick={handleAnalyze}
              icon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              {isAnalyzing
                ? isSeller ? 'Drafting listing…' : 'Understanding request…'
                : isSeller ? 'Draft listing' : 'Find sellers'}
            </Button>
          </div>
        </div>
      )}

      {/* Buyer Structured Brief Card ("Here's what I understood") */}
      {buyerBrief && !noMatchesResult && (
        <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-text-primary font-medium">
              <ShieldCheck className="w-4 h-4 text-volt" strokeWidth={2} />
              <span>Here's what I understood</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingBuyer(!isEditingBuyer)}
                className="text-secondary text-volt hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{isEditingBuyer ? 'Done editing' : 'Edit details'}</span>
              </button>
            </div>
          </div>

          {/* Follow-up question if budget or deadline was missing */}
          {buyerBrief.followUpQuestion && (
            <div className="p-3.5 rounded-control bg-volt/10 border border-volt/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-secondary text-text-primary font-medium">
                <HelpCircle className="w-4 h-4 text-volt shrink-0 mt-0.5" strokeWidth={2} />
                <span>{buyerBrief.followUpQuestion}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="e.g. $180 in 5 days"
                  className="h-9 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt flex-1 sm:w-44"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyFollowUp}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Structured Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title & Scope */}
            <div className="md:col-span-2 flex flex-col gap-2">
              <span className="text-secondary text-text-muted font-medium">Project Scope</span>
              {isEditingBuyer ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                />
              ) : (
                <span className="font-semibold text-body text-text-primary">{editTitle}</span>
              )}

              {/* Deliverables */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-secondary text-text-muted">Deliverables:</span>
                <div className="flex flex-wrap gap-1.5">
                  {editDeliverables.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-pill bg-surface border border-border-subtle text-secondary text-text-primary flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      {isEditingBuyer && (
                        <button
                          type="button"
                          onClick={() => setEditDeliverables(editDeliverables.filter((_, i) => i !== idx))}
                          className="hover:text-status-declined cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {isEditingBuyer && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newDeliverableInput}
                      onChange={(e) => setNewDeliverableInput(e.target.value)}
                      placeholder="Add deliverable…"
                      className="h-8 px-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (newDeliverableInput.trim()) {
                          setEditDeliverables([...editDeliverables, newDeliverableInput.trim()]);
                          setNewDeliverableInput('');
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Budget & Timing */}
            <div className="flex flex-col gap-3 p-3.5 rounded-control bg-surface border border-border-subtle">
              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">Target budget ceiling</span>
                {isEditingBuyer ? (
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-text-muted">$</span>
                    <input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-24 h-8 px-2 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt font-bold"
                    />
                  </div>
                ) : (
                  <span className="font-display font-bold text-[20px] text-text-primary">
                    {formatMoney(editBudget)}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">Maximum delivery window</span>
                {isEditingBuyer ? (
                  <div className="flex items-center gap-1 pt-1">
                    <input
                      type="number"
                      value={editDays}
                      onChange={(e) => setEditDays(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-20 h-8 px-2 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt font-bold"
                    />
                    <span className="text-secondary text-text-muted">days</span>
                  </div>
                ) : (
                  <span className="font-semibold text-body text-text-primary">
                    {editDays} business days
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              disabled={isExecuting}
              onClick={resetAll}
            >
              Start over
            </Button>

            <Button
              variant="volt"
              size="md"
              disabled={isExecuting}
              isLoading={isExecuting}
              onClick={handleStartBuyerNegotiation}
              icon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              {isExecuting ? 'Starting negotiation…' : 'Start'}
            </Button>
          </div>
        </div>
      )}

      {/* Seller Drafted Listing Card */}
      {sellerDraft && !publishedListingId && (
        <div className="p-5 rounded-control bg-raised border border-border-subtle flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-text-primary font-medium">
              <Store className="w-4 h-4 text-volt" strokeWidth={2} />
              <span>Here's what I drafted for your listing</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingSeller(!isEditingSeller)}
              className="text-secondary text-volt hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{isEditingSeller ? 'Done editing' : 'Edit listing'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 flex flex-col gap-2">
              <span className="text-secondary text-text-muted font-medium">Service Title</span>
              {isEditingSeller ? (
                <input
                  type="text"
                  value={sellerTitle}
                  onChange={(e) => setSellerTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                />
              ) : (
                <span className="font-semibold text-body text-text-primary">{sellerTitle}</span>
              )}

              <span className="text-secondary text-text-muted font-medium pt-1">Description</span>
              {isEditingSeller ? (
                <textarea
                  rows={2}
                  value={sellerDesc}
                  onChange={(e) => setSellerDesc(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt resize-none"
                />
              ) : (
                <p className="text-secondary text-text-muted leading-relaxed">{sellerDesc}</p>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {sellerDraft.deliverables.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-pill bg-surface border border-border-subtle text-secondary text-text-primary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 p-3.5 rounded-control bg-surface border border-border-subtle">
              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">List Price</span>
                {isEditingSeller ? (
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-text-muted">$</span>
                    <input
                      type="number"
                      value={sellerListPrice}
                      onChange={(e) => setSellerListPrice(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-24 h-8 px-2 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt font-bold"
                    />
                  </div>
                ) : (
                  <span className="font-display font-bold text-[20px] text-text-primary">
                    {formatMoney(sellerListPrice)}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">Standard Lowest Price</span>
                {isEditingSeller ? (
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-text-muted">$</span>
                    <input
                      type="number"
                      value={sellerLowestPrice}
                      onChange={(e) => setSellerLowestPrice(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-24 h-8 px-2 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt font-bold"
                    />
                  </div>
                ) : (
                  <span className="font-semibold text-body text-text-primary">
                    {formatMoney(sellerLowestPrice)}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">Standard Turnaround</span>
                {isEditingSeller ? (
                  <div className="flex items-center gap-1 pt-1">
                    <input
                      type="number"
                      value={sellerDays}
                      onChange={(e) => setSellerDays(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-20 h-8 px-2 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt font-bold"
                    />
                    <span className="text-secondary text-text-muted">days</span>
                  </div>
                ) : (
                  <span className="font-semibold text-body text-text-primary">
                    {sellerDays} business days
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="md"
              disabled={isExecuting}
              onClick={resetAll}
            >
              Start over
            </Button>

            <Button
              variant="volt"
              size="md"
              disabled={isExecuting}
              isLoading={isExecuting}
              onClick={handlePublishSellerListing}
              icon={<Check className="w-4 h-4" strokeWidth={2} />}
            >
              {isExecuting ? 'Publishing…' : 'Publish listing'}
            </Button>
          </div>
        </div>
      )}

      {/* No Matches Found State (requirement 1.2d) */}
      {noMatchesResult && (
        <div className="p-6 rounded-control bg-raised border border-border-subtle flex flex-col gap-4 text-center items-center">
          <div className="w-10 h-10 rounded-full bg-border-subtle flex items-center justify-center">
            <Search className="w-5 h-5 text-text-muted" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <span className="font-semibold text-body text-text-primary">
              No one offers this yet
            </span>
            <p className="text-secondary text-text-muted leading-relaxed">
              No one offers this yet. I'll keep looking and tell you when someone does. Your request is safely recorded and remains active.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/app/requests')}
            >
              View in Requests
            </Button>
            <Button
              variant="volt"
              size="md"
              onClick={resetAll}
            >
              Start another request
            </Button>
          </div>
        </div>
      )}

      {/* Seller Listing Published State */}
      {publishedListingId && (
        <div className="p-6 rounded-control bg-raised border border-border-subtle flex flex-col gap-4 text-center items-center">
          <div className="w-10 h-10 rounded-full bg-volt/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-volt" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <span className="font-semibold text-body text-text-primary">
              Listing is live on the marketplace
            </span>
            <p className="text-secondary text-text-muted leading-relaxed">
              Your service is now discoverable by autonomous buyer agents across the VYRO network.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/app/listings')}
            >
              Manage listings
            </Button>
            <Button
              variant="volt"
              size="md"
              onClick={resetAll}
            >
              List another service
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
