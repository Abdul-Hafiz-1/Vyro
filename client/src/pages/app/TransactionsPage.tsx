import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatName, formatDate } from '../../lib/present';

function formatPlainPayoutStatus(status?: string, paymentStatus?: string): { label: string; role: 'handled' | 'needsYou' | 'declined' | 'inProgress' } {
  if (paymentStatus === 'refunded') return { label: 'Refunded', role: 'declined' };
  if (status === 'paid') return { label: 'Released to you', role: 'handled' };
  if (status === 'simulated_paid') return { label: 'Test payout, simulated', role: 'handled' };
  if (status === 'processing' || status === 'scheduled') return { label: 'Sending payout', role: 'inProgress' };
  if (status === 'failed') return { label: 'Failed', role: 'declined' };
  if (paymentStatus === 'completed') return { label: 'Paid, held', role: 'inProgress' };
  return { label: 'Awaiting payment', role: 'needsYou' };
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isSellerWorkspace } = useAuth();
  const showSellerSetup = isSellerWorkspace || Boolean(user?.capabilities?.selling);

  const [paypalEmail, setPaypalEmail] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactionsList'],
    queryFn: api.getTransactions,
    refetchInterval: 8000,
  });

  const { data: payoutSetup } = useQuery({
    queryKey: ['sellerPayoutAccount'],
    queryFn: api.getSellerPayoutAccount,
    enabled: showSellerSetup,
  });

  const { data: payoutsList = [] } = useQuery({
    queryKey: ['payouts'],
    queryFn: api.getPayouts,
    enabled: showSellerSetup,
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (payoutSetup?.account?.paypalEmail) {
      setPaypalEmail(payoutSetup.account.paypalEmail);
    }
  }, [payoutSetup?.account?.paypalEmail]);

  const saveEmailMutation = useMutation({
    mutationFn: (email: string) => api.saveSellerPayoutAccount(email),
    onSuccess: () => {
      setSetupError(null);
      toast.success('PayPal payout email verified and saved.');
      queryClient.invalidateQueries({ queryKey: ['sellerPayoutAccount'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (err: any) => {
      const msg = err.message || 'Please enter a valid PayPal email address.';
      setSetupError(msg);
      toast.error(msg);
    },
  });

  const retryPayoutMutation = useMutation({
    mutationFn: (payoutId: string) => api.retryPayout(payoutId),
    onSuccess: () => {
      toast.success('Payout retry triggered.');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
    },
    onError: (err: any) => toast.error(err.message || 'Could not retry payout'),
  });

  const handleSavePayoutEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = paypalEmail.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setSetupError('Please enter a valid email address (like name@example.com).');
      return;
    }
    setSetupError(null);
    saveEmailMutation.mutate(cleaned);
  };

  const payoutStatus = payoutSetup?.account?.status || 'not_set';
  const feePercent = payoutSetup?.platformFeePercent ?? 5;

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Way back (Breadcrumb) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </button>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
              Receipts & Invoices
            </h1>
            <span className="text-secondary px-2.5 py-0.5 rounded-control bg-raised border border-border-subtle text-text-muted">
              {transactions.length} total
            </span>
          </div>
          <p className="text-secondary text-text-muted">
            Official commercial receipts for settled transactions, escrow holds, and verified orders.
          </p>
        </div>

        <div className="flex items-center gap-2 text-secondary text-status-handled px-3 py-1.5 rounded-control bg-status-handled/10 border border-status-handled/30">
          <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Platform Escrow Protected</span>
        </div>
      </div>

      {/* Seller "Get Paid" Setup Card (Part A2) */}
      {showSellerSetup && (
        <Card className="p-6 flex flex-col gap-5 bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <CreditCard className="w-5 h-5 text-volt shrink-0" strokeWidth={2} />
                <h2 className="font-display font-semibold text-[20px] text-text-primary">
                  Where should we send your earnings?
                </h2>
                {payoutStatus === 'ready' ? (
                  <StatusChip label="Ready" role="handled" size="sm" />
                ) : payoutStatus === 'failed' ? (
                  <StatusChip label="Check failed" role="declined" size="sm" />
                ) : (
                  <StatusChip label="Needs setup" role="needsYou" size="sm" />
                )}
              </div>
              <p className="text-secondary text-text-muted leading-relaxed">
                When a buyer pays, we hold the money until the work is accepted, then send your share to this PayPal account. Service fee: {feePercent}%. Payouts release right after buyer acceptance.
              </p>
            </div>

            {payoutSetup?.isSandbox && (
              <span className="text-secondary px-2.5 py-1 rounded-control bg-raised border border-border-subtle text-text-muted shrink-0 self-start">
                Test mode: no real money moves
              </span>
            )}
          </div>

          <form onSubmit={handleSavePayoutEmail} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="seller-paypal-email" className="text-secondary font-medium text-text-primary">
                Your PayPal email
              </label>
              <input
                id="seller-paypal-email"
                type="email"
                value={paypalEmail}
                onChange={(e) => {
                  setPaypalEmail(e.target.value);
                  if (setupError) setSetupError(null);
                }}
                placeholder="name@example.com"
                className="w-full h-11 px-4 bg-raised border border-border-subtle rounded-control text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                required
              />
            </div>
            <Button
              type="submit"
              variant="volt"
              size="md"
              className="h-11 px-5 whitespace-nowrap shrink-0"
              isLoading={saveEmailMutation.isPending}
            >
              {payoutStatus === 'ready' ? 'Update payout email' : 'Save & verify'}
            </Button>
          </form>

          {setupError && (
            <div className="p-3 rounded-control bg-status-declined/10 border border-status-declined/30 text-secondary text-status-declined flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          {payoutStatus === 'ready' && !setupError && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-secondary text-text-muted pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-2 text-status-handled">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Payouts will be sent to {payoutSetup?.account?.paypalEmail}</span>
              </div>
              <span>
                Method: {payoutSetup?.providerInUse === 'paypal' ? 'PayPal Payouts' : 'Test payout, simulated'}
              </span>
            </div>
          )}

          {payoutsList.length > 0 && (
            <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
              <span className="text-secondary font-semibold text-text-primary">Seller payouts</span>
              <div className="flex flex-col divide-y divide-border-subtle border border-border-subtle rounded-control overflow-hidden">
                {payoutsList.slice(0, 5).map((p: any) => {
                  const st = formatPlainPayoutStatus(p.status, 'completed');
                  return (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 bg-raised/40">
                      <div className="flex flex-col">
                        <span className="text-secondary font-medium text-text-primary">
                          Deal payout · {formatMoney((p.amountCents || 0) / 100)}
                        </span>
                        <span className="text-secondary text-text-muted">
                          {p.failureReason ? p.failureReason : formatDate(p.updatedAt || p.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip label={st.label} role={st.role} size="sm" />
                        {p.status === 'failed' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={retryPayoutMutation.isPending}
                            onClick={() => retryPayoutMutation.mutate(p.id)}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex flex-col gap-4 opacity-70">
          <div className="h-20 bg-surface rounded-control border border-border-subtle" />
          <div className="h-20 bg-surface rounded-control border border-border-subtle" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No receipts recorded yet"
          description="When deals are agreed and paid, official commercial receipts and settlement proofs will appear here."
          actionLabel="Explore marketplace"
          onAction={() => navigate('/app/listings')}
        />
      ) : (
        <div className="bg-surface border border-border-subtle rounded-surface divide-y divide-border-subtle overflow-hidden">
          {transactions.map((tx) => {
            const counterpart = tx.sellerBusinessName || tx.buyerAgentName || 'Verified Counterparty';
            const title = tx.serviceTitle || tx.itemTitle || 'Commercial Service Package';
            const payoutInfo = formatPlainPayoutStatus(tx.payout?.status || tx.sellerPayoutStatus, tx.paymentStatus);
            const feeDollars = tx.platformFeeCents ? tx.platformFeeCents / 100 : Math.round(tx.amount * 5) / 100;
            const netDollars = tx.sellerPayoutCents ? tx.sellerPayoutCents / 100 : Math.max(0, tx.amount - feeDollars);

            return (
              <div
                key={tx.id}
                onClick={() => navigate(`/app/transactions/${tx.id}`)}
                className="p-5 flex items-center justify-between gap-4 hover:bg-raised transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={formatName(counterpart)} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-body text-text-primary group-hover:text-volt transition-colors truncate">
                      {title}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-secondary text-text-muted mt-0.5">
                      <span>With {formatName(counterpart)}</span>
                      <span>·</span>
                      <span>
                        {showSellerSetup && tx.viewerRole === 'seller'
                          ? `Earnings ${formatMoney(netDollars)} after ${formatMoney(feeDollars)} service fee`
                          : `Service fee ${formatMoney(feeDollars)} included`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="font-display font-bold text-[18px] text-text-primary block">
                      {formatMoney(tx.amount)}
                    </span>
                    {tx.createdAt && (
                      <span className="text-secondary text-text-muted block">
                        {formatDate(tx.createdAt)}
                      </span>
                    )}
                  </div>

                  <StatusChip label={payoutInfo.label} role={payoutInfo.role} size="sm" />

                  <ChevronRight
                    className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors hidden sm:block"
                    strokeWidth={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};