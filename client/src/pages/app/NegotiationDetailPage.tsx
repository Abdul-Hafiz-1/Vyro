import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bot,
  Scale,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Clock,
  Play,
  Award,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { NegotiationTimeline } from '../../components/negotiation/NegotiationTimeline';
import { ProposalCard } from '../../components/negotiation/ProposalCard';
import { EvaluatorBreakdown } from '../../components/negotiation/EvaluatorBreakdown';
import { HumanApprovalModal } from '../../components/negotiation/HumanApprovalModal';
import { PayPalCheckoutButton } from '../../components/negotiation/PayPalCheckoutButton';
import { Transaction } from '../../types';

export const NegotiationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [paymentSuccessTx, setPaymentSuccessTx] = useState<Transaction | null>(null);

  // Fetch Negotiation details
  const { data: negData, isLoading, refetch } = useQuery({
    queryKey: ['negotiationDetail', id],
    queryFn: () => api.getNegotiationDetail(id!),
    enabled: Boolean(id),
    refetchInterval: 5000
  });

  // Fetch Evaluation (if requestId exists)
  const { data: evaluation } = useQuery({
    queryKey: ['evaluationDetail', negData?.requestId],
    queryFn: () => api.getEvaluation(negData!.requestId),
    enabled: Boolean(negData?.requestId),
  });

  // Advance step mutation
  const stepMutation = useMutation({
    mutationFn: () => api.stepNegotiation(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    }
  });

  // Authorize agreement mutation
  const authorizeMutation = useMutation({
    mutationFn: (agreementId: string) => api.authorizeAgreement(agreementId),
    onSuccess: () => {
      setApprovalModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
    }
  });

  if (isLoading || !negData) {
    return (
      <div className="py-20 text-center text-xs font-mono text-vyro-muted animate-pulse">
        Retrieving autonomous negotiation telemetry...
      </div>
    );
  }

  const { buyerAgent, sellerAgent, request, agreement, currentProposal } = negData;
  const isAgreed = negData.status === 'agreement_reached' || negData.status === 'completed';
  const isHumanAuthorized = agreement?.humanApprovalStatus === 'approved';
  const isCompleted = negData.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/negotiations')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> All Negotiations
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono text-vyro-text">{negData.id}</h1>
              <Badge
                variant={
                  isCompleted ? 'success' :
                  isAgreed ? 'warning' :
                  'accent'
                }
                size="sm"
                dot
              >
                {negData.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-vyro-muted mt-0.5">
              {buyerAgent.name} (Buyer) ↔ {sellerAgent.businessName} (Seller)
            </p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2.5">
          {negData.status === 'in_negotiation' && (
            <Button
              variant="accent"
              size="sm"
              isLoading={stepMutation.isPending}
              onClick={() => stepMutation.mutate()}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Advance Agent Turn (Round {negData.currentRound})
            </Button>
          )}

          {isAgreed && agreement && !isHumanAuthorized && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => setApprovalModalOpen(true)}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Authorize Agreement (${agreement.finalPrice})
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Timeline (2 cols) & Right Terms & Settlement (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conversation Timeline & Evaluator Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Box */}
          <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-vyro-border">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-vyro-accent" />
                <h3 className="text-sm font-semibold text-vyro-text">Autonomous Dialogue Stream</h3>
              </div>
              <span className="text-[11px] font-mono text-vyro-muted">
                {negData.messages.length} messages • Round {negData.currentRound} of {negData.maxRounds}
              </span>
            </div>

            <NegotiationTimeline
              messages={negData.messages}
              buyerAgent={buyerAgent}
              sellerAgent={sellerAgent}
            />
          </div>

          {/* Evaluator Agent Comparative Breakdown (if available) */}
          {evaluation && (
            <EvaluatorBreakdown evaluation={evaluation} />
          )}
        </div>

        {/* Right Column: Commercial Proposal & PayPal Checkout */}
        <div className="space-y-6">
          {/* Proposal Card */}
          {currentProposal && (
            <div>
              <span className="text-xs font-mono uppercase text-vyro-muted block mb-2 tracking-wider">
                Active Commercial Consensus
              </span>
              <ProposalCard
                proposal={currentProposal}
                isAgreed={isAgreed}
              />
            </div>
          )}

          {/* Human Authorization & PayPal Sandbox Settlement Panel */}
          {agreement && (
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase text-vyro-muted block tracking-wider">
                Settlement & Captures
              </span>

              {!isHumanAuthorized ? (
                <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-warning/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-vyro-warning">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Human Approval Required</span>
                  </div>
                  <p className="text-xs text-vyro-muted leading-relaxed">
                    Consensus reached at ${agreement.finalPrice} {agreement.currency}. Review the deliverables and authorize agreement to unlock PayPal payment.
                  </p>
                  <Button
                    variant="accent"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => setApprovalModalOpen(true)}
                  >
                    Review & Authorize Terms
                  </Button>
                </div>
              ) : !isCompleted ? (
                <div>
                  <div className="p-3 mb-3 rounded bg-vyro-success-bg border border-vyro-success/40 text-xs font-mono text-vyro-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Human Authorization Granted. Cleared for PayPal.</span>
                  </div>

                  <PayPalCheckoutButton
                    agreement={agreement}
                    onPaymentSuccess={(tx) => {
                      setPaymentSuccessTx(tx);
                      refetch();
                    }}
                    onPaymentError={(err) => {
                      console.error('Payment capture error:', err);
                    }}
                  />
                </div>
              ) : (
                <div className="p-5 rounded-[8px] bg-vyro-success-bg/25 border border-vyro-success space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-vyro-success mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-vyro-text">Payment Captured & Settled</h4>
                    <p className="text-xs text-vyro-muted mt-1">
                      PayPal Sandbox transaction completed. Funds verified server-side.
                    </p>
                  </div>
                  <Link to="/app/transactions">
                    <Button variant="primary" size="sm" className="w-full justify-center mt-2">
                      View Transaction Receipt
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Request Specs Reference Card */}
          {request && (
            <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle block">
                Originating Request
              </span>
              <h5 className="font-semibold text-vyro-text">{request.title}</h5>
              <div className="flex items-center justify-between text-vyro-muted font-mono pt-2 border-t border-vyro-border/50">
                <span>Max Budget: ${request.maxBudget}</span>
                <span>Deadline: {request.deadlineDays}d</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Human Approval Modal */}
      <HumanApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        agreement={agreement || null}
        sellerAgent={sellerAgent}
        isAuthorizing={authorizeMutation.isPending}
        onConfirmAuthorization={() => {
          if (agreement) authorizeMutation.mutate(agreement.id);
        }}
      />
    </div>
  );
};
