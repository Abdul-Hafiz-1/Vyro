import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bot,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  CreditCard,
  AlertTriangle,
  Award,
  Layers
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
  const [activeTab, setActiveTab] = useState<'dialogue' | 'evaluation'>('dialogue');

  // Fetch current Negotiation details
  const { data: negData, isLoading, refetch } = useQuery({
    queryKey: ['negotiationDetail', id],
    queryFn: () => api.getNegotiationDetail(id!),
    enabled: Boolean(id),
    refetchInterval: 5000
  });

  // Fetch all sibling negotiations for the same request (e.g. Seller A, B, C)
  const { data: siblingNegs = [] } = useQuery({
    queryKey: ['siblingNegotiations', negData?.requestId],
    queryFn: () => api.getNegotiations({ requestId: negData!.requestId }),
    enabled: Boolean(negData?.requestId),
  });

  // Fetch Evaluation for this request
  const { data: evaluation } = useQuery({
    queryKey: ['evaluationDetail', negData?.requestId],
    queryFn: () => api.getEvaluation(negData!.requestId),
    enabled: Boolean(negData?.requestId),
  });

  // Advance step mutation
  const stepMutation = useMutation({
    mutationFn: () => api.stepNegotiation(id!),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
      if (updated.status === 'agreement_reached') {
        toast.success(`Consensus reached at $${updated.currentProposal?.price}! Awaiting human authorization.`);
      } else {
        toast.info(`Turn advanced: Round ${updated.currentRound} counteroffer recorded.`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to step negotiation');
    }
  });

  // Authorize agreement mutation
  const authorizeMutation = useMutation({
    mutationFn: (agreementId: string) => api.authorizeAgreement(agreementId),
    onSuccess: () => {
      setApprovalModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['negotiationDetail', id] });
      refetch();
      toast.success('Human authorization granted. Agreement unlocked for PayPal checkout!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Authorization failed');
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
  const isRecommended = evaluation?.recommendedNegotiationId === negData.id;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/negotiations')} className="text-xs h-8">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Channels
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-mono text-vyro-text">{negData.id}</h1>
              <Badge
                variant={
                  isCompleted ? 'success' :
                  isAgreed ? 'warning' : 'accent'
                }
                size="sm"
                dot
              >
                {negData.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {isRecommended && (
                <Badge variant="success" size="sm">
                  <Award className="w-3 h-3 mr-1" /> Evaluator Pick
                </Badge>
              )}
            </div>
            <p className="text-xs text-vyro-muted mt-0.5">
              {buyerAgent.name} (Buyer) ↔ {sellerAgent.businessName} ({sellerAgent.category})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {negData.status === 'in_negotiation' && (
            <Button
              variant="accent"
              size="sm"
              isLoading={stepMutation.isPending}
              onClick={() => stepMutation.mutate()}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Advance Turn ({negData.currentRound}/{negData.maxRounds})
            </Button>
          )}

          {isAgreed && agreement && !isHumanAuthorized && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => setApprovalModalOpen(true)}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Authorize Agreement (${agreement.finalPrice})
            </Button>
          )}
        </div>
      </div>

      {/* Human Principals Covenant Banner */}
      <div className="p-3.5 rounded-[8px] bg-vyro-surface border border-vyro-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Buyer Principal */}
          <div className="flex items-center gap-2.5">
            <img
              src={buyerAgent.operatorAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
              alt={buyerAgent.operatorName || 'Alex Mercer'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-vyro-accent/60"
            />
            <div>
              <span className="text-xs font-semibold text-vyro-text block">{buyerAgent.operatorName || 'Alex Mercer'}</span>
              <span className="text-[10px] text-vyro-muted font-mono">{buyerAgent.operatorLocation || 'San Francisco, CA'} • Buyer Principal</span>
            </div>
          </div>

          <span className="text-vyro-subtle font-mono text-xs hidden sm:inline">⟷</span>

          {/* Seller Principal */}
          <div className="flex items-center gap-2.5">
            <img
              src={sellerAgent.operatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={sellerAgent.operatorName || 'Elena Vance'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-vyro-border"
            />
            <div>
              <span className="text-xs font-semibold text-vyro-text block">{sellerAgent.operatorName || sellerAgent.businessName}</span>
              <span className="text-[10px] text-vyro-muted font-mono">{sellerAgent.operatorLocation || 'Verified'} • {sellerAgent.operatorRole || 'Seller Lead'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-vyro-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-vyro-success" />
          <span>Autonomous protocol bound by Human Covenant</span>
        </div>
      </div>

      {/* Competing Seller Candidate Switcher Tabs */}
      {siblingNegs.length > 1 && (
        <div className="p-2.5 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-vyro-subtle text-[11px] uppercase shrink-0">Competing Sellers:</span>
            {siblingNegs.map((sNeg, idx) => {
              const isCurrent = sNeg.id === negData.id;
              const isBest = evaluation?.recommendedNegotiationId === sNeg.id;

              return (
                <button
                  key={sNeg.id}
                  onClick={() => navigate(`/app/negotiations/${sNeg.id}`)}
                  className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                    isCurrent
                      ? 'bg-vyro-hover border border-vyro-accent text-vyro-text font-bold'
                      : 'bg-vyro-card/80 border border-vyro-border text-vyro-muted hover:text-vyro-text'
                  }`}
                >
                  <span>Seller {String.fromCharCode(65 + idx)}:</span>
                  <span>${sNeg.currentProposal?.price || 150}</span>
                  {isBest && <span className="text-[10px] text-vyro-success">★ Best</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('dialogue')}
              className={`px-2.5 py-1 rounded text-xs font-mono ${
                activeTab === 'dialogue' ? 'bg-vyro-hover text-vyro-text border border-vyro-border font-bold' : 'text-vyro-muted'
              }`}
            >
              Dialogue View
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-2.5 py-1 rounded text-xs font-mono ${
                activeTab === 'evaluation' ? 'bg-vyro-hover text-vyro-text border border-vyro-border font-bold' : 'text-vyro-muted'
              }`}
            >
              Evaluator Model
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Timeline or Evaluator Model */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'dialogue' ? (
            <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-vyro-border">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-vyro-accent" />
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
                    Autonomous Multi-Turn Stream
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-vyro-muted">
                  Round {negData.currentRound} of {negData.maxRounds} • {negData.messages.length} Events
                </span>
              </div>

              <NegotiationTimeline
                messages={negData.messages}
                buyerAgent={buyerAgent}
                sellerAgent={sellerAgent}
              />
            </div>
          ) : (
            evaluation && <EvaluatorBreakdown evaluation={evaluation} />
          )}

          {/* If Dialogue view is active and evaluation is present, show compact Evaluator banner */}
          {activeTab === 'dialogue' && evaluation && (
            <div className="p-4 rounded-[6px] bg-vyro-card border border-vyro-border flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 font-semibold text-vyro-text">
                  <Award className="w-4 h-4 text-vyro-accent" />
                  <span>Evaluator Analysis Verdict</span>
                </div>
                <p className="text-vyro-muted mt-1 leading-relaxed">{evaluation.summaryVerdict}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('evaluation')}
                className="shrink-0 text-xs h-7"
              >
                Inspect All Scores
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Active Agreement Terms & PayPal Checkout */}
        <div className="space-y-6">
          {/* Active Proposal Card */}
          {currentProposal && (
            <div>
              <span className="text-xs font-mono uppercase text-vyro-muted block mb-2 tracking-wider">
                Current Commercial Scope
              </span>
              <ProposalCard
                proposal={currentProposal}
                isAgreed={isAgreed}
              />
            </div>
          )}

          {/* Settlement / Human Approval Panel */}
          {agreement && (
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase text-vyro-muted block tracking-wider">
                Settlement & Captures
              </span>

              {!isHumanAuthorized ? (
                <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-warning/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-vyro-warning">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Human Approval Required</span>
                  </div>
                  <p className="text-xs text-vyro-muted leading-relaxed">
                    Autonomous consensus reached at ${agreement.finalPrice} {agreement.currency}. Review the deliverables and authorize agreement to unlock PayPal payment.
                  </p>
                  <Button
                    variant="accent"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => setApprovalModalOpen(true)}
                  >
                    Authorize Commercial Terms
                  </Button>
                </div>
              ) : !isCompleted ? (
                <div>
                  <div className="p-3 mb-3 rounded bg-vyro-success-bg border border-vyro-success/40 text-xs font-mono text-vyro-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Human Signature Verified. Cleared for PayPal.</span>
                  </div>

                  <PayPalCheckoutButton
                    agreement={agreement}
                    onPaymentSuccess={(tx) => {
                      toast.success(`PayPal Sandbox payment captured! Transaction ID: ${tx.id}`);
                      refetch();
                    }}
                    onPaymentError={(err) => {
                      toast.error(`PayPal payment capture error: ${err}`);
                    }}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-[8px] bg-vyro-success-bg/20 border border-vyro-success space-y-3 text-center">
                  <CheckCircle2 className="w-7 h-7 text-vyro-success mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-vyro-text">Payment Settled</h4>
                    <p className="text-xs text-vyro-muted mt-0.5">
                      PayPal Sandbox transaction completed. Funds verified server-side.
                    </p>
                  </div>
                  <Link to="/app/transactions">
                    <Button variant="primary" size="sm" className="w-full justify-center mt-1 text-xs">
                      View Settlement Receipt
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Request Reference */}
          {request && (
            <div className="p-3.5 rounded-[6px] bg-vyro-card border border-vyro-border space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-vyro-subtle block">
                Source Request Specs
              </span>
              <div className="font-sans font-semibold text-vyro-text text-xs">{request.title}</div>
              <div className="flex items-center justify-between text-vyro-muted pt-2 border-t border-vyro-border/50 text-[11px]">
                <span>Budget: ${request.maxBudget}</span>
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
