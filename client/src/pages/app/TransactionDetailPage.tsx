import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, Printer, Download, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { formatMoney, formatName, formatDate } from '../../lib/present';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);

  const { data: tx, isLoading, refetch } = useQuery({
    queryKey: ['transactionDetail', id],
    queryFn: () => api.getTransaction(id!),
    enabled: Boolean(id)
  });

  const refundMutation = useMutation({
    mutationFn: (reason: string) => api.refundPayment(tx!.agreementId, reason),
    onSuccess: () => {
      toast.success('Refund processed.');
      setShowRefundForm(false);
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['transactionDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['transactionsList'] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Refund failed')
  });

  const downloadTextReceipt = () => {
    if (!tx) return;
    const content = `====================================================
VYRO — OFFICIAL COMMERCIAL TRANSACTION RECEIPT
====================================================
Receipt ID:         ${tx.id}
Settlement Date:    ${new Date(tx.createdAt).toLocaleDateString()}
Amount Captured:    ${formatMoney(tx.amount)} ${tx.currency || 'USD'}
Payment Status:     SETTLED & PAID

PARTIES
Purchaser:          ${formatName(tx.buyerAgentName || 'Authenticated Buyer')}
Contracted Seller:  ${formatName(tx.sellerBusinessName || 'Verified Supplier')}

GATEWAY REFERENCES
PayPal Order ID:    ${tx.paypalOrderId || 'Recorded in Escrow'}
PayPal Capture ID:  ${tx.paypalCaptureId || 'Escrow Captured'}

DELIVERABLES INCLUDED
${
  tx.agreement?.finalDeliverables
    ? tx.agreement.finalDeliverables.map((d: string) => ` - ${d}`).join('\n')
    : ' - Complete service deliverable as specified in agreement.'
}

DISPUTE & MEDIATION GUARANTEE
Platform escrow holds funds until deliverables are verified.
Disputes may be raised within 7 days of settlement.
====================================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vyro-receipt-${tx.id.substring(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !tx) {
    return (
      <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6 opacity-70">
        <div className="h-12 w-full bg-surface border border-border-subtle rounded-control" />
        <div className="h-96 w-full bg-surface border border-border-subtle rounded-surface" />
      </div>
    );
  }

  const deliverables = tx.agreement?.finalDeliverables || [
    tx.serviceTitle || tx.itemTitle || 'Commercial Service Package'
  ];
  const grossCents = Math.round((tx.amount || 0) * 100);
  const feeCents = typeof tx.platformFeeCents === 'number' ? tx.platformFeeCents : Math.round(grossCents * 0.05);
  const sellerPayoutCents = typeof tx.sellerPayoutCents === 'number' ? tx.sellerPayoutCents : Math.max(0, grossCents - feeCents);
  const feeDollars = feeCents / 100;
  const sellerPayoutDollars = sellerPayoutCents / 100;
  const isRefunded = tx.paymentStatus === 'refunded';
  const payoutStatus = (tx as any).payout?.status || tx.sellerPayoutStatus;
  const statusDisplay = isRefunded
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
  const canRefund = !isRefunded && payoutStatus !== 'paid' && payoutStatus !== 'simulated_paid' && payoutStatus !== 'processing';

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/transactions')}
          leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
        >
          All receipts
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadTextReceipt}
            leftIcon={<Download className="w-4 h-4" strokeWidth={2} />}
          >
            Download text
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" strokeWidth={2} />}
          >
            Print invoice
          </Button>
        </div>
      </div>

      {/* Clean Invoice Paper */}
      <Card className="p-8 sm:p-10 flex flex-col gap-8 bg-surface">
        {/* Invoice Top: Brand + Status */}
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-6">
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[24px] text-text-primary tracking-tight">
              VYRO
            </span>
            <span className="text-secondary text-text-muted">
              Official Commercial Settlement Receipt
            </span>
          </div>
          <StatusChip label={statusDisplay.label} role={statusDisplay.role} size="md" />
        </div>

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-secondary pb-6 border-b border-border-subtle">
          <div className="flex flex-col">
            <span className="text-text-muted">Settlement date</span>
            <span className="font-semibold text-text-primary mt-0.5">
              {formatDate(tx.createdAt)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Payment method</span>
            <span className="font-semibold text-text-primary mt-0.5">
              PayPal Escrow
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Contracted seller</span>
            <span className="font-semibold text-text-primary mt-0.5">
              {formatName(tx.sellerBusinessName || 'Verified Supplier')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Purchaser</span>
            <span className="font-semibold text-text-primary mt-0.5">
              {formatName(tx.buyerAgentName || 'Authenticated Buyer')}
            </span>
          </div>
        </div>

        {/* Deliverables Line Items */}
        <div className="flex flex-col gap-3">
          <span className="text-secondary font-semibold text-text-primary">
            Agreed deliverables package
          </span>
          <div className="flex flex-col gap-2">
            {deliverables.map((item: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-raised rounded-control text-secondary"
              >
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-status-handled shrink-0" strokeWidth={2.5} />
                  <span className="text-text-primary">{item}</span>
                </div>
                <span className="text-text-muted">Included</span>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Receipt Breakdown & Total */}
        <div className="flex flex-col gap-3 pt-6 border-t border-border-subtle">
          <div className="flex items-center justify-between text-secondary text-text-muted">
            <span>Agreed project price</span>
            <span className="font-medium text-text-primary">{formatMoney(tx.amount)}</span>
          </div>
          <div className="flex items-center justify-between text-secondary text-text-muted">
            <span>Service fee (5%)</span>
            <span className="font-medium text-text-primary">{formatMoney(feeDollars)}</span>
          </div>
          <div className="flex items-center justify-between text-secondary text-text-muted">
            <span>Seller payout</span>
            <span className="font-medium text-text-primary">{formatMoney(sellerPayoutDollars)}</span>
          </div>

          <div className="flex items-baseline justify-between pt-4 border-t border-border-subtle">
            <div className="flex flex-col">
              <span className="text-secondary text-text-muted">Total paid via PayPal</span>
              <span className="text-secondary text-status-handled font-medium">
                {isRefunded
                  ? 'Refunded to buyer PayPal account'
                  : payoutStatus === 'paid' || payoutStatus === 'simulated_paid'
                  ? 'Work accepted · payout released to seller'
                  : 'Funds held in escrow until buyer accepts work'}
              </span>
            </div>
            <span className="font-display font-bold text-[36px] text-text-primary">
              {formatMoney(tx.amount)}
            </span>
          </div>
        </div>

        {/* Refund Action if Eligible & Unreleased */}
        {canRefund && (
          <div className="flex flex-col gap-3 pt-2 border-t border-border-subtle">
            {!showRefundForm ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary text-text-muted">
                  Need to cancel before work is accepted?
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRefundForm(true)}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Request refund
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-control bg-raised border border-border-subtle flex flex-col gap-3">
                <label className="text-secondary font-medium text-text-primary">
                  Reason for refund
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Describe why this order should be refunded…"
                  className="w-full h-10 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowRefundForm(false)}>
                    Keep payment
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={refundMutation.isPending}
                    onClick={() => refundMutation.mutate(refundReason.trim() || 'Buyer requested refund before work acceptance')}
                  >
                    Confirm refund
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Escrow Guarantee Footer */}
        <div className="p-4 rounded-control bg-raised border border-border-subtle flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-volt shrink-0 mt-0.5" strokeWidth={2} />
          <div className="flex flex-col gap-0.5 text-secondary">
            <span className="font-semibold text-text-primary">Escrow settlement guarantee</span>
            <p className="text-text-muted leading-relaxed">
              Payment is held safely until deliverables are confirmed. If terms are unmet, mediation can be initiated within 7 days.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};