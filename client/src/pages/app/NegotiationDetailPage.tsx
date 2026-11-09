import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Check,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Terminal,
  FileCheck,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { StatusChip, StatusRole } from '../../components/common/StatusChip';
import { DealNode } from '../../components/common/DealNode';
import { SummaryPanel } from '../../components/common/SummaryPanel';
import { DecisionCard } from '../../components/common/DecisionCard';
import { Drawer } from '../../components/common/Drawer';
import { Card } from '../../components/common/Card';
import { PayPalCheckoutButton } from '../../components/negotiation/PayPalCheckoutButton';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatDate, formatStatus, formatName } from '../../lib/present';

interface TimelineItem {
  id: string;
  price: number;
  deliveryDays: number;
  authorName: string;
  isSelf: boolean;
  deltaText?: string;
  timestamp?: string;
  statusBadge?: string;
  summaryText: string;
}

export const NegotiationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
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

  // Human approval & decline actions
  const approveMutation = useMutation({
    mutationFn: () => {
      const qId = negData?.queueItem?.id;
      return qId ? api.approveReviewItem(qId) : api.approveDealDirect(id!);
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
      return qId ? api.declineReviewItem(qId) : api.declineDealDirect(id!);
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
        return await api.counterReviewItem(qId, price);
      }
      return await api.sendMessage(id!, {
        content: `Counteroffer proposed: $${price}. Please re-evaluate scope.`,
        senderRole: 'buyer',
        senderType: 'human'
      });
    },
    onSuccess: () => {
      toast.success('Counteroffer submitted to agent.');
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

  // Mock payment fallback mutation
  const mockPayMutation = useMutation({
    mutationFn: (agreementId: string) => api.settlePaymentMock(agreementId),
    onSuccess: () => {
      toast.success('Payment settled and funds held in escrow.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Payment failed')
  });

  if (isLoading || !negData) {
    return (
      <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6 animate-pulse">
        <div className="h-14 w-full bg-surface border border-border-subtle rounded-control" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-surface border border-border-subtle rounded-surface" />
          <div className="lg:col-span-5 h-96 bg-surface border border-border-subtle rounded-surface" />
        </div>
      </div>
    );
  }

  const { buyerAgent, sellerAgent, request, agreement, currentProposal, decision, queueItem, proposals = [], messages = [] } = negData;

  const isCompleted = negData.status === 'completed' || (negData.status as string) === 'COMPLETED';
  const isAgreed = negData.status === 'agreement_reached' || isCompleted;

  const decisionStatus = decision?.status || (queueItem ? 'needs_review' : isAgreed ? 'auto_approved' : 'in_negotiation');
  const needsHuman = decisionStatus === 'needs_review' || (queueItem && queueItem.status === 'pending');
  const isApproved = decisionStatus === 'auto_approved' || decisionStatus === 'human_approved' || (agreement && agreement.humanApprovalStatus === 'approved');
  const isDeclined = decisionStatus === 'auto_declined' || decisionStatus === 'human_declined';

  const agreedOrLatestPrice = agreement?.finalPrice || currentProposal?.price || 150;
  const agreedOrLatestDays = agreement?.deliveryDays || currentProposal?.deliveryDays || request?.deadlineDays || 5;

  const isBuyer = negData.buyerUserId ? (user?.id === negData.buyerUserId) : isBuyerWorkspace;
  const counterpartName = isBuyer 
    ? (sellerAgent?.businessName ? formatName(sellerAgent.businessName) : 'Verified Seller')
    : (buyerAgent?.name ? formatName(buyerAgent.name) : 'Verified Buyer');

  // Determine current step for SummaryPanel (1 to 5)
  let currentStep = 3; // default: Negotiating
  if (isCompleted) {
    currentStep = 5; // Paid
  } else if (isAgreed && isApproved) {
    currentStep = 5; // Ready to pay
  } else if (needsHuman) {
    currentStep = 4; // Your OK
  } else if (proposals.length > 0) {
    currentStep = 3; // Negotiating
  } else {
    currentStep = 2; // Sellers replied
  }

  // Determine actionState for SummaryPanel
  let actionState: 'needsDecision' | 'readyToPay' | 'waitingCounterparty' | 'completed' = 'waitingCounterparty';
  if (isCompleted) {
    actionState = 'completed';
  } else if (isApproved && agreement) {
    actionState = 'readyToPay';
  } else if (needsHuman) {
    actionState = 'needsDecision';
  } else {
    actionState = 'waitingCounterparty';
  }

  const statusRaw = formatStatus(negData.status);
  const statusRoleMap: Record<string, StatusRole> = {
    handled: 'handled',
    needs_you: 'needsYou',
    declined: 'declined',
    in_progress: 'inProgress'
  };
  const statusRole = statusRoleMap[statusRaw.role] || 'inProgress';
  const summaryStatusRole: 'handled' | 'needsYou' | 'declined' | 'inProgress' =
    statusRole === 'neutral' ? 'inProgress' : statusRole;

  // Build timeline items from proposals
  const timelineNodes: TimelineItem[] = proposals.length > 0
    ? proposals.map((p, idx) => {
        const isSelf = p.senderAgentId === negData.buyerAgentId;
        const prevProposal = idx > 0 ? proposals[idx - 1] : undefined;
        let deltaText: string | undefined;
        if (prevProposal) {
          const priceDiff = p.price - prevProposal.price;
          if (priceDiff < 0) {
            deltaText = `-${formatMoney(Math.abs(priceDiff))} price concession`;
          } else if (priceDiff > 0) {
            deltaText = `+${formatMoney(priceDiff)} counter`;
          }
        } else {
          deltaText = 'Initial proposal';
        }

        const summaryText = isSelf
          ? `Offered ${formatMoney(p.price)} with ${p.deliveryDays}-day delivery turnaround.`
          : `${counterpartName} proposed ${formatMoney(p.price)} for complete delivery in ${p.deliveryDays} days.`;

        return {
          id: p.id || `prop-${idx}`,
          price: p.price,
          deliveryDays: p.deliveryDays,
          authorName: isSelf ? 'Your agent' : counterpartName,
          isSelf,
          deltaText,
          timestamp: undefined,
          statusBadge: idx === proposals.length - 1 && isAgreed ? 'Agreed terms' : undefined,
          summaryText
        };
      })
    : [
        {
          id: 'initial',
          price: agreedOrLatestPrice,
          deliveryDays: agreedOrLatestDays,
          authorName: counterpartName,
          isSelf: false,
          deltaText: 'Initial proposal',
          summaryText: `${counterpartName} proposed ${formatMoney(agreedOrLatestPrice)} with ${agreedOrLatestDays}-day turnaround.`
        }
      ];

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
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-8">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/deals')}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Deals
          </Button>

          <div className="h-4 w-px bg-border-subtle" />

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-bold text-[20px] text-text-primary">
                {request?.title || 'Commercial Deal'}
              </h1>
              <StatusChip
                label={statusRaw.label}
                role={statusRole}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2 text-secondary text-text-muted mt-0.5">
              <span>With {counterpartName}</span>
              <span className="text-status-handled font-medium">✓ Verified seller</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConversationDrawerOpen(true)}
            leftIcon={<Terminal className="w-4 h-4 text-volt" strokeWidth={2} />}
          >
            Full conversation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailsDrawerOpen(true)}
            leftIcon={<FileCheck className="w-4 h-4 text-text-muted" strokeWidth={2} />}
          >
            Deal terms
          </Button>
        </div>
      </div>

      {/* Sibling Bids Bar (if multi-agent request) */}
      {siblingNegs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-secondary text-text-muted shrink-0">Other bids:</span>
          {siblingNegs.map((sNeg: any, idx: number) => {
            const isCurrent = sNeg.id === id;
            const price = sNeg.currentProposal?.price || sNeg.agreement?.finalPrice;
            return (
              <button
                key={sNeg.id}
                type="button"
                onClick={() => navigate(`/app/deals/${sNeg.id}`)}
                className={`px-3 py-1.5 rounded-control text-secondary transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-volt text-[#0C0E0D] font-bold'
                    : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
                }`}
              >
                <span>Seller {idx + 1}</span>
                {price && <span>· {formatMoney(price)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Vertical Timeline of Proposals & Direct Chat */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-secondary font-semibold text-text-primary">
              Negotiation rounds & terms
            </span>
            <p className="text-secondary text-text-muted">
              Every round negotiated between your buyer agent and {counterpartName}.
            </p>
          </div>

          {/* Timeline Nodes */}
          <div className="flex flex-col">
            {timelineNodes.map((node) => (
              <DealNode
                key={node.id}
                price={node.price}
                deliveryDays={node.deliveryDays}
                authorName={node.authorName}
                isSelf={node.isSelf}
                deltaText={node.deltaText}
                timestamp={node.timestamp}
                statusBadge={node.statusBadge}
                summaryText={node.summaryText}
                onOpenConversation={() => setConversationDrawerOpen(true)}
                onOpenDetails={() => setDetailsDrawerOpen(true)}
              />
            ))}
          </div>

          {/* Human Message / Direct Clarification Composer */}
          <Card className="p-5 flex flex-col gap-3">
            <span className="text-secondary font-medium text-text-primary">
              Send note to {counterpartName}
            </span>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask for clarification or adjust scope instructions…"
                className="flex-1 h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                isLoading={directMessageMutation.isPending}
                disabled={!chatMessage.trim()}
                rightIcon={<Send className="w-4 h-4" strokeWidth={2} />}
              >
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Sticky SummaryPanel + DecisionCard / Payment */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Summary Panel */}
          <SummaryPanel
            currentPrice={agreedOrLatestPrice}
            deliveryDays={agreedOrLatestDays}
            currentStep={currentStep}
            statusLabel={statusRaw.label}
            statusRole={summaryStatusRole}
            counterpartName={counterpartName}
            isBuyer={isBuyer}
            actionState={actionState}
            onPay={() => {
              if (agreement?.id) {
                mockPayMutation.mutate(agreement.id);
              }
            }}
          />

          {/* Exception Approval: Decision Card (Ramp pattern) */}
          {needsHuman && (
            <DecisionCard
              title={request?.title || 'Commercial Project'}
              counterpartName={counterpartName}
              proposedPrice={agreedOrLatestPrice}
              proposedDays={agreedOrLatestDays}
              reasonText={`Seller agreed at ${formatMoney(agreedOrLatestPrice)} with ${agreedOrLatestDays}-day delivery.`}
              suggestionText="Suggested: Accept"
              onApprove={() => approveMutation.mutate()}
              onCounter={(price) => counterMutation.mutate(price)}
              onDecline={() => declineMutation.mutate()}
              isLoading={approveMutation.isPending || counterMutation.isPending || declineMutation.isPending}
            />
          )}

          {/* PayPal Checkout Card (When Approved and Ready to Pay - BUYER ONLY) */}
          {agreement && isApproved && !isCompleted && isBuyer && (
            <div className="flex flex-col gap-3">
              <PayPalCheckoutButton
                agreement={agreement}
                onPaymentSuccess={(tx) => {
                  toast.success(`Payment verified and captured! Receipt: ${tx.id}`);
                  refetch();
                }}
                onPaymentError={(err) => {
                  toast.error(`PayPal payment notice: ${err}`);
                }}
              />

              {/* Instant Platform Escrow Alternative */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => mockPayMutation.mutate(agreement.id)}
                  className="text-secondary text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  Or test with Instant Platform Escrow
                </button>
              </div>
            </div>
          )}

          {/* Seller State: Awaiting Buyer Payment */}
          {agreement && isApproved && !isCompleted && !isBuyer && (
            <Card className="p-6 flex flex-col gap-2 bg-surface text-center">
              <span className="font-semibold text-body text-text-primary">
                Awaiting Buyer Payment
              </span>
              <p className="text-secondary text-text-muted">
                The agreement has been confirmed. The buyer is authorizing escrow payment. Work begins once escrow is locked.
              </p>
            </Card>
          )}

          {/* Declined State with Appeal Option */}
          {isDeclined && (
            <Card className="p-5 flex flex-col gap-3 border-status-declined/30 bg-status-declined/10">
              <div className="flex items-center gap-2 text-status-declined font-medium text-secondary">
                <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>Deal declined by policy</span>
              </div>
              <p className="text-secondary text-text-muted leading-relaxed">
                {decision?.reasons?.[0] || 'The terms exceeded safety bounds or price limits.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppealModal(true)}
              >
                Appeal decision and reopen
              </Button>
            </Card>
          )}

          {/* Completed State */}
          {isCompleted && (
            <Card className="p-5 flex flex-col items-center gap-3 text-center bg-status-handled/10 border-status-handled/30">
              <div className="w-10 h-10 rounded-full bg-status-handled/20 flex items-center justify-center text-status-handled">
                <Check className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-body text-text-primary">Contract settled</span>
                <p className="text-secondary text-text-muted">
                  Funds held securely in platform escrow for {counterpartName}.
                </p>
              </div>
              <Link to="/app/transactions" className="w-full">
                <Button variant="volt" size="md" fullWidth>
                  View receipt and invoices
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Full Conversation Transcript Drawer */}
      <Drawer
        isOpen={conversationDrawerOpen}
        onClose={() => setConversationDrawerOpen(false)}
        title="Full Negotiation Transcript"
      >
        <div className="flex flex-col gap-4">
          <span className="text-secondary text-text-muted">
            Round-by-round autonomous negotiation between your buyer agent and {counterpartName}.
          </span>
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <span className="text-secondary text-text-muted">No messages recorded yet.</span>
            ) : (
              messages.map((m: any, idx: number) => {
                const isBuyerMsg = m.senderRole === 'buyer';
                return (
                  <div
                    key={m.id || idx}
                    className={`p-4 rounded-surface border flex flex-col gap-2 ${
                      isBuyerMsg
                        ? 'bg-raised border-border-subtle self-end max-w-[85%]'
                        : 'bg-surface border-border-subtle self-start max-w-[85%]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-secondary font-semibold text-text-primary">
                        {isBuyerMsg ? 'Your agent' : counterpartName}
                      </span>
                      {m.createdAt && (
                        <span className="text-secondary text-text-muted">
                          {formatDate(m.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-secondary text-text-primary leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Drawer>

      {/* Deal Terms Drawer */}
      <Drawer
        isOpen={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
        title="Commercial Scope & Terms"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-secondary font-semibold text-text-primary">Deliverables checklist</span>
            <div className="flex flex-col gap-2">
              {(agreement?.finalDeliverables || request?.deliverables || [request?.title || 'Full project delivery']).map(
                (d: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-secondary text-text-primary">
                    <Check className="w-4 h-4 text-status-handled shrink-0" strokeWidth={2.5} />
                    <span>{d}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-border-subtle">
            <span className="text-secondary font-semibold text-text-primary">Agreed terms</span>
            <div className="grid grid-cols-2 gap-3 text-secondary">
              <div className="p-3 bg-raised rounded-control flex flex-col">
                <span className="text-text-muted">Turnaround</span>
                <span className="font-semibold text-text-primary">{agreedOrLatestDays}&nbsp;days</span>
              </div>
              <div className="p-3 bg-raised rounded-control flex flex-col">
                <span className="text-text-muted">Escrow settlement</span>
                <span className="font-semibold text-text-primary">Milestone hold</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-control bg-raised border border-border-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-volt shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex flex-col gap-1">
              <span className="text-secondary font-semibold text-text-primary">Security & safety guarantee</span>
              <p className="text-secondary text-text-muted leading-relaxed">
                All messages and proposal terms are validated against strict JSON schemas. Counterparty identities are verified.
              </p>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Appeal Decision Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-[20px] text-text-primary">
              Appeal declined deal
            </h3>
            <p className="text-secondary text-text-muted leading-relaxed">
              Explain why this deal should be granted an exception (e.g. pre-approved scope waiver or updated budget authorization).
            </p>
            <textarea
              rows={3}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="State your reason for reopening this negotiation…"
              className="w-full p-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowAppealModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="volt"
                size="md"
                isLoading={appealMutation.isPending}
                disabled={appealReason.trim().length < 5}
                onClick={() => appealMutation.mutate(appealReason.trim())}
              >
                Submit appeal
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};