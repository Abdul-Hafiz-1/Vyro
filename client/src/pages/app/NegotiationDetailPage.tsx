import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Check,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  FileCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { StatusChip, StatusRole } from '../../components/common/StatusChip';
import { DealNode } from '../../components/common/DealNode';
import { SummaryPanel } from '../../components/common/SummaryPanel';
import { DecisionCard } from '../../components/common/DecisionCard';
import { Drawer } from '../../components/common/Drawer';
import { Card } from '../../components/common/Card';
import { RollingNumber } from '../../components/common/RollingNumber';
import { PayPalCheckoutButton } from '../../components/negotiation/PayPalCheckoutButton';
import { ProjectStagePanel } from '../../components/projects/ProjectStagePanel';
import { ProjectEventsTimeline } from '../../components/projects/ProjectEventsTimeline';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatDate, formatStatus, formatName } from '../../lib/present';
import { EASE_STANDARD } from '../../lib/motion';

interface TimelineItem {
  id: string;
  price: number;
  deliveryDays: number;
  authorName: string;
  isSelf: boolean;
  deltaText?: string;
  whyText?: string;
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
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemReason, setProblemReason] = useState('');

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

  // Mock payment mutation removed: PayPal SDK button is the single payment action
  const undoMutation = useMutation({
    mutationFn: async () => {
      const qId = negData?.queueItem?.id;
      if (!qId) return;
      await api.undoReviewItem(qId);
    },
    onSuccess: () => {
      toast.info('Decision undone — returned to queue.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Undo failed')
  });

  const acceptWorkMutation = useMutation({
    mutationFn: () => api.acceptDealWork(id!),
    onSuccess: (res) => {
      const pStatus = res?.payout?.status;
      toast.success(
        pStatus === 'failed'
          ? 'Work accepted, but payout needs retry.'
          : 'Work accepted and seller payout released.'
      );
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Could not accept work')
  });

  const reportProblemMutation = useMutation({
    mutationFn: (reason: string) => api.reportDealProblem(id!, reason),
    onSuccess: () => {
      toast.info('Problem reported. Seller payout is paused.');
      setShowProblemForm(false);
      setProblemReason('');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Could not report problem')
  });

  const refundMutation = useMutation({
    mutationFn: (reason?: string) => api.refundPayment(negData!.agreement!.id, reason),
    onSuccess: () => {
      toast.success('Buyer refunded via PayPal escrow.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Refund failed')
  });

  const retryPayoutMutation = useMutation({
    mutationFn: (payoutId: string) => api.retryPayout(payoutId),
    onSuccess: () => {
      toast.success('Seller payout retried.');
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Retry failed')
  });

  if (isLoading || !negData) {
    return (
      <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6 opacity-70">
        <div className="h-14 w-full bg-surface border border-border-subtle rounded-control" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-surface border border-border-subtle rounded-surface" />
          <div className="lg:col-span-5 h-96 bg-surface border border-border-subtle rounded-surface" />
        </div>
      </div>
    );
  }

  const { buyerAgent, sellerAgent, request, agreement, currentProposal, decision, queueItem, proposals = [], messages = [] } = negData;

  const projectStatus = negData.projectStatus || (
    negData.transaction?.paymentStatus === 'refunded'
      ? 'refunded'
      : negData.transaction?.paymentStatus === 'completed'
      ? 'paid_held'
      : ['rejected', 'REJECTED', 'declined'].includes(String(negData.status))
      ? 'declined'
      : negData.status === 'agreement_reached'
      ? 'agreed'
      : 'negotiating'
  );
  const isPaid = Boolean(
    negData.transaction?.paymentStatus === 'completed' ||
    negData.transaction?.paymentStatus === 'refunded' ||
    ['paid_held', 'in_progress', 'delivered', 'revision_requested', 'accepted', 'payout_released', 'completed', 'disputed', 'refunded', 'partially_refunded'].includes(projectStatus)
  );
  const isCompleted = isPaid;
  const isAgreed = negData.status === 'agreement_reached' || projectStatus === 'agreed' || isPaid;

  const decisionStatus = decision?.status || (queueItem ? 'needs_review' : isAgreed ? 'auto_approved' : 'in_negotiation');
  const needsHuman = !isPaid && !['declined', 'cancelled', 'expired'].includes(projectStatus) && (decisionStatus === 'needs_review' || (queueItem && queueItem.status === 'pending'));
  const isApproved = decisionStatus === 'auto_approved' || decisionStatus === 'human_approved' || (agreement && agreement.humanApprovalStatus === 'approved');
  const isDeclined = decisionStatus === 'auto_declined' || decisionStatus === 'human_declined';

  const agreedOrLatestPrice = agreement?.finalPrice || currentProposal?.price || 150;
  const agreedOrLatestDays = agreement?.deliveryDays || currentProposal?.deliveryDays || request?.deadlineDays || 5;

  const isBuyer = negData.buyerUserId ? (user?.id === negData.buyerUserId) : isBuyerWorkspace;
  const isSeller = negData.sellerUserId ? (user?.id === negData.sellerUserId) : !isBuyer;
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

  const statusRaw = formatStatus(projectStatus || negData.status);
  const statusRoleMap: Record<string, StatusRole> = {
    handled: 'handled',
    needs_you: 'needsYou',
    declined: 'declined',
    in_progress: 'inProgress'
  };
  const statusRole = statusRoleMap[statusRaw.role] || 'inProgress';
  const summaryStatusRole: 'handled' | 'needsYou' | 'declined' | 'inProgress' =
    statusRole === 'neutral' ? 'inProgress' : statusRole;

  // Build timeline items comparing ONLY to the same side's previous proposal (Part 4)
  let prevBuyerProp: any = undefined;
  let prevSellerProp: any = undefined;
  let latestBuyerPrice: number | null = null;
  let latestSellerPrice: number | null = null;

  const timelineNodes: TimelineItem[] = proposals.length > 0
    ? proposals.map((p, idx) => {
        const isBuyerProp = p.senderAgentId === negData.buyerAgentId;
        const isSelf = isBuyer ? isBuyerProp : !isBuyerProp;
        const prevSameSide = isBuyerProp ? prevBuyerProp : prevSellerProp;

        if (isBuyerProp) {
          latestBuyerPrice = p.price;
          prevBuyerProp = p;
        } else {
          latestSellerPrice = p.price;
          prevSellerProp = p;
        }

        const changes: string[] = [];
        if (prevSameSide) {
          const sameDiff = p.price - prevSameSide.price;
          if (sameDiff < 0) {
            changes.push(`Lowered by ${formatMoney(Math.abs(sameDiff))}`);
          } else if (sameDiff > 0) {
            changes.push(`Raised by ${formatMoney(sameDiff)}`);
          } else {
            changes.push(`Held at ${formatMoney(p.price)}`);
          }
          if (prevSameSide.deliveryDays !== p.deliveryDays) {
            changes.push(`Changed delivery ${prevSameSide.deliveryDays} → ${p.deliveryDays} days`);
          }
        } else {
          changes.push(isBuyerProp ? 'Opening offer' : 'Initial ask');
        }

        const deltaText = changes.join(' · ');
        const matchedMsg = (messages || []).find(
          (m: any) => m.round === p.round && ((isBuyerProp && m.senderRole === 'buyer') || (!isBuyerProp && m.senderRole === 'seller')) && m.messageType !== 'request'
        );
        const whyText = p.whyMove || matchedMsg?.payload?.whyMove || p.whyThisOffer;

        const summaryText = isSelf
          ? `Offered ${formatMoney(p.price)} with ${p.deliveryDays}-day delivery turnaround.`
          : `${counterpartName} proposed ${formatMoney(p.price)} for delivery in ${p.deliveryDays} days.`;

        return {
          id: p.id || `prop-${idx}`,
          price: p.price,
          deliveryDays: p.deliveryDays,
          authorName: isSelf ? 'Your agent' : counterpartName,
          isSelf,
          deltaText,
          whyText,
          timestamp: p.createdAt ? formatDate(p.createdAt) : undefined,
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
          deltaText: 'Initial ask',
          summaryText: `${counterpartName} proposed ${formatMoney(agreedOrLatestPrice)} with ${agreedOrLatestDays}-day turnaround.`
        }
      ];

  const gapDollars =
    latestBuyerPrice !== null && latestSellerPrice !== null
      ? Math.max(0, latestSellerPrice - latestBuyerPrice)
      : null;
  const savingsDollars =
    isAgreed && isBuyer && request?.maxBudget && agreement?.finalPrice && agreement.finalPrice < request.maxBudget
      ? Math.round(request.maxBudget - agreement.finalPrice)
      : 0;

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
            onClick={() => navigate('/app/projects')}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Projects
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
              {(['evaluating', 'proposal_exchange', 'countering', 'initiated', 'negotiating'].includes(negData.status as string)) && (
                <span className="vyro-live-indicator" title="Live negotiation" aria-label="Live negotiation">
                  <span />
                  <span />
                  <span />
                </span>
              )}
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
                onClick={() => navigate(`/app/projects/${sNeg.id}`)}
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

          {/* Slim Gap Bar / Agreed Summary above Timeline (Part 4 + Part B Animation) */}
          {(isAgreed || gapDollars !== null) && (
            <div className="bg-surface border border-border-subtle rounded-control p-4 flex flex-col gap-2.5 overflow-hidden">
              {isAgreed ? (
                <motion.div
                  initial={{ scale: 0.96, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.32, ease: EASE_STANDARD }}
                  className="vyro-volt-sweep rounded-control px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-semibold text-body text-status-handled">
                    Agreed at <RollingNumber value={agreedOrLatestPrice} format={formatMoney} durationMs={320} />
                  </span>
                  {savingsDollars > 0 && (
                    <StatusChip
                      label={`You saved ${formatMoney(savingsDollars)} vs your budget`}
                      role="handled"
                      size="sm"
                    />
                  )}
                </motion.div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-secondary">
                    <span>
                      Buyer bid: <strong className="text-text-primary">{latestBuyerPrice !== null ? formatMoney(latestBuyerPrice) : '—'}</strong>
                    </span>
                    <StatusChip
                      label={`Gap: ${formatMoney(gapDollars || 0)}`}
                      role="inProgress"
                      size="sm"
                    />
                    <span>
                      Seller ask: <strong className="text-text-primary">{latestSellerPrice !== null ? formatMoney(latestSellerPrice) : '—'}</strong>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                    <div
                      className="h-full w-full bg-volt rounded-full origin-left transition-transform duration-300"
                      style={{
                        transform: `scaleX(${
                          latestSellerPrice && latestBuyerPrice
                            ? Math.min(1, Math.max(0.1, latestBuyerPrice / latestSellerPrice))
                            : 0.25
                        })`
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

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
                whyText={node.whyText}
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

          <ProjectEventsTimeline events={negData.events || []} />
        </div>

        {/* Right Column: Sticky SummaryPanel + DecisionCard / Payment */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Summary Panel (Single PayPal Checkout Action Inside) */}
          <SummaryPanel
            currentPrice={agreedOrLatestPrice}
            deliveryDays={agreedOrLatestDays}
            currentStep={currentStep}
            statusLabel={statusRaw.label}
            statusRole={summaryStatusRole}
            counterpartName={counterpartName}
            isBuyer={isBuyer}
            actionState={actionState}
            completedBannerText={
              negData.transaction?.paymentStatus === 'refunded'
                ? 'Refunded to buyer'
                : (negData.payout?.status || negData.transaction?.sellerPayoutStatus) === 'paid'
                ? 'Released to seller'
                : (negData.payout?.status || negData.transaction?.sellerPayoutStatus) === 'simulated_paid'
                ? 'Test payout, simulated'
                : (negData.payout?.status || negData.transaction?.sellerPayoutStatus) === 'processing' || (negData.payout?.status || negData.transaction?.sellerPayoutStatus) === 'scheduled'
                ? 'Work accepted · sending payout'
                : 'Paid with PayPal · held until you accept the work'
            }
            paymentSlot={
              agreement && isApproved && !isCompleted && isBuyer && negData.sellerPayoutReady !== false ? (
                <PayPalCheckoutButton
                  agreement={agreement}
                  projectTitle={request?.title}
                  onPaymentSuccess={(tx) => {
                    toast.success(`Payment verified and held in escrow.`);
                    refetch();
                  }}
                  onPaymentError={(err) => {
                    toast.error(`PayPal payment notice: ${err}`);
                  }}
                />
              ) : undefined
            }
          />

          {/* Seller Payout Setup Gate Notice (Part A2) */}
          {negData.sellerPayoutReady === false && !isCompleted && (
            <Card className="p-5 flex flex-col gap-3 border-border-subtle bg-raised">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-volt shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-body text-text-primary">
                    {isBuyer
                      ? 'Waiting for the seller to finish payout setup'
                      : 'Add where to send your earnings'}
                  </span>
                  <p className="text-secondary text-text-muted">
                    {isBuyer
                      ? 'The seller needs to add their payout email before payment can be confirmed.'
                      : 'Add your PayPal email on Payments before this deal can be confirmed and paid.'}
                  </p>
                </div>
              </div>
              {!isBuyer && (
                <Link to="/app/transactions">
                  <Button variant="volt" size="sm" fullWidth>
                    Set up PayPal payout email
                  </Button>
                </Link>
              )}
            </Card>
          )}

          {/* Exception Approval: Decision Card (Approve / Counter / Decline) */}
          {needsHuman && (
            <DecisionCard
              title={request?.title || 'Commercial Project'}
              counterpartName={counterpartName}
              proposedPrice={agreedOrLatestPrice}
              proposedDays={agreedOrLatestDays}
              buyerBudget={request?.maxBudget}
              buyerHardCap={request?.hardCap}
              reasons={decision?.reasons}
              reasonText={
                decision?.reasons?.[0] ||
                `${counterpartName} is verified and proposed ${formatMoney(agreedOrLatestPrice)} (${agreedOrLatestDays} days).`
              }
              suggestionText={decision?.recommendation || 'Review the terms and approve, counter, or decline.'}
              onApprove={() => approveMutation.mutate()}
              onCounter={(price) => counterMutation.mutate(price)}
              onDecline={() => declineMutation.mutate()}
              onUndo={queueItem ? () => undoMutation.mutate() : undefined}
              isLoading={approveMutation.isPending || counterMutation.isPending || declineMutation.isPending || undoMutation.isPending}
              loadingAction={
                approveMutation.isPending ? 'approve' :
                counterMutation.isPending ? 'counter' :
                declineMutation.isPending ? 'decline' :
                undoMutation.isPending ? 'undo' : null
              }
            />
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

          {/* Completed State — Buyer Work Acceptance & Seller Earnings Status (Part A4) */}
          {isCompleted && (() => {
            const tx = negData.transaction;
            const payout = negData.payout;
            const payoutStatus = payout?.status || tx?.sellerPayoutStatus;
            const workStatus = agreement?.workAcceptanceStatus || 'pending';
            const isRefunded = tx?.paymentStatus === 'refunded';
            const grossDollars = tx?.amount ?? agreedOrLatestPrice;
            const feePct = negData.platformFeePercent ?? 5;
            const feeDollars = tx?.platformFeeCents
              ? tx.platformFeeCents / 100
              : Math.round(grossDollars * feePct) / 100;
            const netDollars = tx?.sellerPayoutCents
              ? tx.sellerPayoutCents / 100
              : Math.max(0, grossDollars - feeDollars);

            const statusBadge = isRefunded
              ? { label: 'Refunded', role: 'declined' as const }
              : payoutStatus === 'paid'
              ? { label: 'Released to you', role: 'handled' as const }
              : payoutStatus === 'simulated_paid'
              ? { label: 'Test payout, simulated', role: 'handled' as const }
              : payoutStatus === 'processing' || payoutStatus === 'scheduled'
              ? { label: 'Sending payout', role: 'inProgress' as const }
              : payoutStatus === 'failed'
              ? { label: 'Failed', role: 'declined' as const }
              : { label: 'Paid, held', role: 'inProgress' as const };

            return (
              <Card className="p-6 flex flex-col gap-4 bg-surface border-border-subtle">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-status-handled/15 flex items-center justify-center text-status-handled shrink-0">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-body text-text-primary">
                      {isRefunded
                        ? 'Payment refunded'
                        : workStatus === 'accepted'
                        ? 'Work accepted & settled'
                        : workStatus === 'disputed'
                        ? 'Problem reported'
                        : 'Paid with PayPal'}
                    </span>
                  </div>
                  <StatusChip label={statusBadge.label} role={statusBadge.role} size="sm" />
                </div>

                {isBuyer ? (
                  <p className="text-secondary text-text-muted leading-relaxed">
                    {isRefunded
                      ? 'Your PayPal payment was refunded in full.'
                      : workStatus === 'accepted'
                      ? `You accepted the work. ${formatMoney(netDollars)} was released to ${counterpartName} (${formatMoney(feeDollars)} service fee).`
                      : workStatus === 'disputed'
                      ? `Problem noted: "${agreement?.disputeReason || 'Under review'}". Payout to the seller is paused.`
                      : 'Paid with PayPal · held until you accept the work.'}
                  </p>
                ) : (
                  <p className="text-secondary text-text-muted leading-relaxed">
                    {isRefunded
                      ? `This order of ${formatMoney(grossDollars)} was refunded to the buyer.`
                      : payoutStatus === 'paid' || payoutStatus === 'simulated_paid' || payoutStatus === 'processing'
                      ? `Buyer paid ${formatMoney(grossDollars)}. Your earnings ${formatMoney(netDollars)} (after ${formatMoney(feeDollars)} fee) ${payoutStatus === 'processing' ? 'are being sent to' : 'were sent to'} ${negData.sellerPayoutAccount?.paypalEmail || 'your PayPal email'}.`
                      : `Buyer paid ${formatMoney(grossDollars)}. Your earnings ${formatMoney(netDollars)} (after ${formatMoney(feeDollars)} fee) will be sent to ${negData.sellerPayoutAccount?.paypalEmail || 'your PayPal email'} after the buyer accepts.`}
                  </p>
                )}

                {/* Seller Retry Failed Payout */}
                {!isBuyer && payoutStatus === 'failed' && payout?.id && (
                  <Button
                    type="button"
                    variant="volt"
                    size="sm"
                    isLoading={retryPayoutMutation.isPending}
                    onClick={() => retryPayoutMutation.mutate(payout.id)}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Retry payout
                  </Button>
                )}

                <Link to={tx?.id ? `/app/transactions/${tx.id}` : '/app/transactions'} className="w-full">
                  <Button variant="secondary" size="md" fullWidth>
                    View itemized receipt
                  </Button>
                </Link>
              </Card>
            );
          })()}

          {/* Stage-Aware Actions, Delivery Form, Revisions, Reject/Cancel & Disputes */}
          <ProjectStagePanel
            projectId={negData.id}
            projectStatus={projectStatus}
            isBuyer={isBuyer}
            isSeller={isSeller}
            counterpartName={counterpartName}
            revisionsAllowed={negData.revisionsAllowed ?? agreement?.revisions ?? 1}
            revisionsUsed={negData.revisionsUsed ?? 0}
            dueAt={negData.dueAt}
            reviewDueAt={negData.reviewDueAt}
            isOverdue={Boolean(negData.dueAt && new Date(negData.dueAt).getTime() < Date.now() && ['paid_held', 'in_progress', 'revision_requested'].includes(projectStatus))}
            rejectReason={negData.rejectReason}
            sharedRejectNote={negData.sharedRejectNote}
            deliveries={negData.deliveries || []}
            cancellationRequest={negData.cancellationRequest}
            dispute={negData.dispute}
            capturedCents={negData.moneyState?.capturedCents ?? (negData.transaction?.amountCents || Math.round(agreedOrLatestPrice * 100))}
            paidOutCents={negData.moneyState?.paidOutCents ?? 0}
            refundedCents={negData.moneyState?.refundedCents ?? 0}
            currentPrice={agreedOrLatestPrice}
            currentDays={agreedOrLatestDays}
            onRefresh={() => refetch()}
          />
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