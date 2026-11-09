import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Terminal,
  FileCheck,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { PriceLadder } from '../../components/negotiation/PriceLadder';
import { ConversationalTurns } from '../../components/negotiation/ConversationalTurns';
import { InspectDetailsDrawer } from '../../components/negotiation/InspectDetailsDrawer';
import { PayPalCheckoutButton } from '../../components/negotiation/PayPalCheckoutButton';
import { EvaluatorBreakdown } from '../../components/negotiation/EvaluatorBreakdown';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const NegotiationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [inspectOpen, setInspectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'evaluation'>('dialogue');
  const [chatMessage, setChatMessage] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [showAppealModal, setShowAppealModal] = useState(false);

  // Fetch current negotiation details
  const { 
    data: negData, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['negotiationDetail', id],
    queryFn: () => api.getNegotiationDetail(id!),
    enabled: !!id,
    refetchInterval: 4000
  });

  // Fetch sibling negotiations if part of multi-bid request
  const { data: siblingNegs = [] } = useQuery({
    queryKey: ['siblingNegotiations', negData?.requestId],
    queryFn: () => api.getNegotiations({ requestId: negData?.requestId }),
    enabled: !!negData?.requestId
  });

  // Fetch evaluation if multiple candidates
  const { data: evaluation } = useQuery({
    queryKey: ['evaluationDetail', negData?.requestId],
    queryFn: () => api.getEvaluation(negData?.requestId!),
    enabled: !!negData?.requestId && siblingNegs.length > 1
  });

  // Direct message mutation (human clarification)
  const directMessageMutation = useMutation({
    mutationFn: (payload: { senderRole: 'buyer' | 'seller'; senderType: 'human'; content: string }) =>
      api.sendMessage(id!, payload),
    onSuccess: () => {
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
      toast.success('Message sent to negotiation channel.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send message');
    }
  });

  // Human approval & decline actions (works via queue item or direct negotiation approval)
  const approveMutation = useMutation({
    mutationFn: () => {
      const qId = negData?.queueItem?.id;
      return qId ? api.approveReviewItem(qId, actionNote || undefined) : api.approveDealDirect(id!, actionNote || undefined);
    },
    onSuccess: () => {
      toast.success('Deal approved.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Approval failed')
  });

  const declineMutation = useMutation({
    mutationFn: () => {
      const qId = negData?.queueItem?.id;
      return qId ? api.declineReviewItem(qId, actionNote || undefined) : api.declineDealDirect(id!, actionNote || undefined);
    },
    onSuccess: () => {
      toast.info('Deal declined.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Decline failed')
  });

  const counterMutation = useMutation({
    mutationFn: async (price: number) => {
      const qId = negData?.queueItem?.id;
      if (qId) {
        return await api.counterReviewItem(qId, price, actionNote || undefined);
      }
      const res = await api.sendMessage(id!, {
        content: `Counteroffer proposed: $${price}. Please re-evaluate scope.`,
        senderRole: 'buyer',
        senderType: 'human'
      });
      return { success: true, data: res.negotiation };
    },
    onSuccess: () => {
      toast.success('Counteroffer submitted to agent.');
      setShowCounterInput(false);
      setCounterPrice('');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Counter failed')
  });

  const appealMutation = useMutation({
    mutationFn: (reason: string) => api.appealDeal(id!, reason),
    onSuccess: () => {
      toast.success('Appeal submitted. Deal has been reopened for human review.');
      setShowAppealModal(false);
      setAppealReason('');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Appeal submission failed')
  });

  if (isLoading || !negData) {
    return (
      <div className="py-24 text-center text-xs font-mono text-vyro-muted animate-pulse">
        Retrieving deal telemetry and convergence state...
      </div>
    );
  }

  const { buyerAgent, sellerAgent, request, agreement, currentProposal, decision, queueItem } = negData;
  const isCompleted = negData.status === 'completed' || (negData.status as string) === 'COMPLETED';
  const isAgreed = negData.status === 'agreement_reached' || isCompleted;

  // Decision outcome check
  const decisionStatus = decision?.status || (queueItem ? 'needs_review' : isAgreed ? 'auto_approved' : 'in_negotiation');
  const needsHuman = decisionStatus === 'needs_review' || (queueItem && queueItem.status === 'pending');
  const isApproved = decisionStatus === 'auto_approved' || decisionStatus === 'human_approved' || (agreement && agreement.humanApprovalStatus === 'approved');
  const isDeclined = decisionStatus === 'auto_declined' || decisionStatus === 'human_declined';

  const agreedOrLatestPrice = agreement?.finalPrice || currentProposal?.price;
  const currency = agreement?.currency || currentProposal?.currency || 'USD';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    directMessageMutation.mutate({
      senderRole: 'buyer',
      senderType: 'human',
      content: chatMessage.trim()
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-vyro-border/60">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/deals')} 
            className="text-xs h-8 px-2.5 rounded-lg text-vyro-muted hover:text-vyro-text"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Deals
          </Button>

          <div className="h-4 w-px bg-vyro-border/60" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold font-mono text-vyro-text">
                {request?.title || 'Commercial Deal'}
              </h1>
              <Badge
                variant={isCompleted ? 'success' : isAgreed ? 'warning' : 'accent'}
                size="sm"
                dot
              >
                {negData.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-vyro-muted mt-0.5">
              Seller: <span className="text-vyro-text font-medium">{sellerAgent?.businessName}</span>
              {sellerAgent?.verificationStatus === 'verified' && (
                <span className="ml-1.5 text-[10px] text-emerald-400 font-mono">✓ Verified</span>
              )}
            </p>
          </div>
        </div>

        {/* Top Right: Current Price & Inspect details */}
        <div className="flex items-center gap-3">
          {agreedOrLatestPrice !== undefined && (
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle block">
                {isAgreed ? 'Agreed Price' : 'Current Offer'}
              </span>
              <span className="text-base font-bold font-mono text-vyro-text tabular-nums">
                ${agreedOrLatestPrice} {currency}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setInspectOpen(true)}
            leftIcon={<Terminal className="w-3.5 h-3.5 text-vyro-accent" />}
            className="text-xs h-8 px-3 rounded-lg font-mono"
          >
            Inspect details
          </Button>
        </div>
      </div>

      {/* Parallel Bids Tabs (Only when 2+ bids exist) */}
      {siblingNegs.length > 1 && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-vyro-subtle text-[11px] uppercase shrink-0">Bids for Request:</span>
            {siblingNegs.map((sNeg: any, idx: number) => {
              const isCurrent = sNeg.id === negData.id;
              const isBest = evaluation?.recommendedNegotiationId === sNeg.id;
              const bidPrice = sNeg.currentProposal?.price;

              return (
                <button
                  key={sNeg.id}
                  onClick={() => navigate(`/app/negotiations/${sNeg.id}`)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-vyro-surface border border-vyro-accent text-vyro-text font-semibold shadow-xs'
                      : 'text-vyro-muted hover:text-vyro-text bg-vyro-card/60 border border-vyro-border/40'
                  }`}
                >
                  <span>Seller {idx + 1}</span>
                  {bidPrice !== undefined && (
                    <span className="text-vyro-accent font-semibold">${bidPrice}</span>
                  )}
                  {isBest && <span className="text-[10px] text-emerald-400">★ Best</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
            <button
              onClick={() => setActiveTab('dialogue')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'dialogue' ? 'bg-vyro-surface text-vyro-text font-semibold' : 'text-vyro-muted'
              }`}
            >
              Dialogue
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'evaluation' ? 'bg-vyro-surface text-vyro-text font-semibold' : 'text-vyro-muted'
              }`}
            >
              Compare Offers
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Converging Price Ladder */}
      <PriceLadder
        proposals={negData.proposals || []}
        messages={negData.messages || []}
        currentRound={negData.currentRound}
        maxRounds={negData.maxRounds}
        agreedPrice={agreement?.finalPrice}
        currency={currency}
      />

      {/* Main Grid: Stream & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Dialogue or Evaluator Comparison */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'dialogue' ? (
            <div className="bg-vyro-surface border border-vyro-border rounded-xl p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-vyro-border/50">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
                  Autonomous Negotiation Dialogue
                </span>
                <span className="text-xs font-mono text-vyro-muted">
                  Round {negData.currentRound} of {negData.maxRounds} · {negData.messages?.length || 0} Events
                </span>
              </div>

              <ConversationalTurns
                messages={negData.messages || []}
                buyerAgent={buyerAgent}
                sellerAgent={sellerAgent}
              />

              {/* Direct Human Input Composer */}
              <div className="pt-4 border-t border-vyro-border/50">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-vyro-muted">
                    <span>Direct Clarification to Counterparty:</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Add an instruction or ask seller for scope clarification..."
                      className="flex-1 bg-vyro-card border border-vyro-border rounded-lg px-3.5 py-2 text-xs text-vyro-text placeholder-vyro-subtle focus:outline-none focus:border-vyro-accent font-sans transition-colors"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={directMessageMutation.isPending}
                      rightIcon={<Send className="w-3.5 h-3.5" />}
                      className="px-4 text-xs font-medium"
                    >
                      Send
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            evaluation && <EvaluatorBreakdown evaluation={evaluation} />
          )}
        </div>

        {/* Right Column: Commercial Terms Summary & Decision Card */}
        <div className="space-y-4">
          {/* Agreement / Current Proposal Summary */}
          <div className="bg-vyro-surface border border-vyro-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-vyro-border/50">
              <span className="text-xs font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Multi-Issue Agreement Summary
              </span>
              {isAgreed && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  Consensus Package
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-vyro-muted block text-[11px] mb-0.5">Agreed Scope:</span>
                <p className="text-vyro-text font-medium">{request?.title || 'Custom Commercial Scope'}</p>
              </div>

              {/* Scope Deliverables */}
              {(agreement?.finalDeliverables || request?.deliverables) && (
                <div>
                  <span className="text-vyro-muted block text-[11px] mb-1">Deliverables Package:</span>
                  <ul className="space-y-1">
                    {(agreement?.finalDeliverables || request?.deliverables || []).map((item: string, i: number) => (
                      <li key={i} className="text-vyro-text flex items-start gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Package Specs */}
              <div className="pt-2 border-t border-vyro-border/40 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-vyro-muted block text-[10px] uppercase">Turnaround</span>
                  <span className="text-vyro-text font-semibold">
                    {agreement?.deliveryDays || currentProposal?.deliveryDays || request?.deadlineDays || 5} Days
                  </span>
                </div>
                <div>
                  <span className="text-vyro-muted block text-[10px] uppercase">Payment Terms</span>
                  <span className="text-vyro-text font-semibold">
                    {agreement?.paymentTerms === 'upfront' ? 'Upfront' : 'Milestone Escrow'}
                  </span>
                </div>
              </div>

              {/* What Each Side Gave and Got */}
              <div className="p-3 rounded-lg bg-vyro-bg border border-vyro-border/80 space-y-2 font-mono text-[11px]">
                <span className="text-vyro-accent font-semibold block text-[10px] uppercase tracking-wider">
                  What Each Side Gave & Got
                </span>

                <div className="space-y-1 text-vyro-muted">
                  <div className="text-vyro-text font-medium">Buyer:</div>
                  <div className="pl-2 border-l border-blue-500/40 text-[10px] space-y-0.5">
                    <div>• Gave: Flexible turnaround ({agreement?.deliveryDays || currentProposal?.deliveryDays || 5}d timeline)</div>
                    <div>• Got: Completed deliverables within authorized budget</div>
                  </div>
                </div>

                <div className="space-y-1 text-vyro-muted pt-1">
                  <div className="text-vyro-text font-medium">Seller:</div>
                  <div className="pl-2 border-l border-emerald-500/40 text-[10px] space-y-0.5">
                    <div>• Gave: Price concession to ${agreement?.finalPrice || currentProposal?.price || 150}</div>
                    <div>• Got: Production buffer with verified settlement</div>
                  </div>
                </div>

                {agreement?.tradesSummary && agreement.tradesSummary.length > 0 && (
                  <div className="pt-1.5 border-t border-vyro-border/50">
                    <span className="text-[10px] text-vyro-subtle block mb-1">Key Concessions:</span>
                    <div className="flex flex-wrap gap-1">
                      {agreement.tradesSummary.map((ts, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-vyro-card border border-vyro-border text-vyro-muted">
                          {ts}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Declined by Policy Card with Appeal Action */}
          {(isDeclined || negData.status === 'declined') && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Deal Declined by Policy</span>
              </div>
              <p className="text-xs text-vyro-muted leading-relaxed">
                {decision?.reasons?.[0] || agreement?.rejectionReason || 'The terms exceeded safety constraints or policy limits.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppealModal(true)}
                className="w-full justify-center text-xs text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
              >
                Appeal Decision & Reopen
              </Button>
            </div>
          )}

          {/* Sandbox Payment Card (when approved) */}
          {agreement && isApproved && !isCompleted && (
            <PayPalCheckoutButton
              agreement={agreement}
              onPaymentSuccess={(tx) => {
                toast.success(`Payment verified and captured! Tx: ${tx.id}`);
                refetch();
              }}
              onPaymentError={(err) => {
                toast.error(`Payment failed: ${err}`);
              }}
            />
          )}

          {/* Completed Settlement Card */}
          {isCompleted && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-vyro-text">Contract Settled</h4>
                <p className="text-xs text-vyro-muted mt-0.5">
                  Funds verified and held in escrow for {sellerAgent?.businessName}.
                </p>
              </div>
              <Link to="/app/transactions">
                <Button variant="primary" size="sm" className="w-full justify-center text-xs">
                  View Receipt & Invoices →
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Decision Action Bar (When Needs Human Decision) */}
      {needsHuman && (
        <div className="fixed bottom-16 sm:bottom-0 inset-x-0 z-40 bg-vyro-surface/95 border-t border-vyro-border backdrop-blur-md px-4 py-3 sm:px-6 shadow-xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-vyro-text">
                  Action Required: {queueItem?.reasons?.[0] || decision?.reasons?.[0] || 'AI Paused for Human Decision'}
                </span>
                {queueItem?.confidence && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {Math.round(queueItem.confidence * 100)}% Confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-vyro-muted">
                Proposed Terms: <span className="text-vyro-text font-medium">${agreedOrLatestPrice} USD</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {!showCounterInput ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCounterInput(true)}
                    className="text-xs"
                  >
                    Counter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={declineMutation.isPending}
                    onClick={() => declineMutation.mutate()}
                    className="text-xs text-vyro-error hover:bg-vyro-error/10"
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                    className="text-xs px-4"
                  >
                    Approve (${agreedOrLatestPrice})
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-vyro-muted absolute left-2 top-2.5" />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="w-24 pl-6 pr-2 py-1.5 text-xs bg-vyro-card border border-vyro-border rounded-lg text-vyro-text font-mono focus:outline-none focus:border-vyro-accent"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={counterMutation.isPending}
                    disabled={!counterPrice}
                    onClick={() => {
                      const num = parseFloat(counterPrice);
                      if (num > 0) counterMutation.mutate(num);
                    }}
                    className="text-xs"
                  >
                    Submit Counter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCounterInput(false)}
                    className="text-xs text-vyro-muted"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-vyro-surface border border-vyro-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-vyro-text">Appeal Auto-Declined Deal</h3>
            <p className="text-xs text-vyro-muted leading-relaxed">
              Explain why this transaction should be granted an exception (e.g. client pre-approval, scope waiver, special dispensation).
            </p>
            <textarea
              rows={3}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Provide a detailed justification for reopening this deal..."
              className="w-full px-3 py-2 text-xs bg-vyro-card border border-vyro-border rounded-lg text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAppealModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={appealMutation.isPending}
                disabled={appealReason.trim().length < 5}
                onClick={() => appealMutation.mutate(appealReason.trim())}
              >
                Submit Appeal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Details Drawer */}
      <InspectDetailsDrawer
        isOpen={inspectOpen}
        onClose={() => setInspectOpen(false)}
        negotiation={negData}
        decision={decision}
      />
    </div>
  );
};
