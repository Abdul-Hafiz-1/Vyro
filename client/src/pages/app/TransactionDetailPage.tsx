import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, CheckCircle2, CreditCard, Scale, Clock, Copy, Check, Printer, Download, HelpCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tx, isLoading } = useQuery({
    queryKey: ['transactionDetail', id],
    queryFn: () => api.getTransaction(id!),
    enabled: Boolean(id)
  });

  const downloadTextReceipt = () => {
    if (!tx) return;
    const content = `====================================================
VYRO — OFFICIAL COMMERCIAL TRANSACTION RECEIPT
====================================================
Receipt ID:         ${tx.id}
Settlement Date:    ${new Date(tx.createdAt).toISOString()}
Amount Captured:    $${tx.amount} ${tx.currency}
Payment Status:     ${(tx.paymentStatus || tx.status || 'settled').toUpperCase()}

PARTIES
Purchaser:          ${tx.buyerAgentName || 'Buyer'} (${tx.paypalPayerEmail || 'Authenticated Buyer'})
Contracted Seller:  ${tx.sellerBusinessName || 'Verified Supplier'}

GATEWAY REFERENCES
PayPal Order ID:    ${tx.paypalOrderId || 'N/A'}
PayPal Capture ID:  ${tx.paypalCaptureId || 'N/A'}
Idempotency Key:    ${tx.idempotencyKey || 'N/A'}

AGREEMENT DELIVERABLES
${tx.agreement?.finalDeliverables ? tx.agreement.finalDeliverables.map((d: string) => ` - ${d}`).join('\n') : 'Standard service terms as agreed in negotiation dialogue.'}

COMMERCIAL TERMS
"${tx.agreement?.commercialTerms || 'Autonomous agent negotiated terms'}"

DISPUTE & MEDIATION POLICY
Disputes may be raised within 7 days of settlement.
Full policy: https://vyro.network/dispute-policy
====================================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vyro-receipt-${tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !tx) {
    return (
      <div className="py-20 text-center text-xs font-mono text-vyro-muted animate-pulse">
        Loading official payment receipt...
      </div>
    );
  }

  const { agreement } = tx;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-vyro-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/transactions')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> All Receipts
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono text-vyro-text">{tx.id}</h1>
            <p className="text-xs text-vyro-muted">Official Payment Receipt & Contract Proof</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTextReceipt}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print
          </Button>
          <Badge variant={tx.paymentStatus === 'completed' || tx.status === 'settled' ? 'success' : 'warning'} size="md">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {(tx.paymentStatus || tx.status || 'settled').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Receipt Shell */}
      <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-6">
        {/* Settlement Banner */}
        <div className="flex items-center justify-between pb-6 border-b border-vyro-border">
          <div>
            <span className="text-[10px] font-mono uppercase text-vyro-subtle block">Amount Captured</span>
            <div className="text-3xl font-bold font-mono text-vyro-success mt-1 tabular-nums">
              ${tx.amount} <span className="text-sm font-normal text-vyro-muted">{tx.currency}</span>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-[10px] text-vyro-subtle block uppercase">Settlement Date</span>
            <span className="text-vyro-text font-medium">
              {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Entities */}
        <div className="grid grid-cols-2 gap-4 text-xs font-mono py-2">
          <div className="p-3 rounded bg-vyro-card border border-vyro-border/60">
            <span className="text-[10px] text-vyro-subtle block uppercase mb-1">Purchasing Entity</span>
            <div className="font-bold text-vyro-text">{tx.buyerAgentName || 'Buyer'}</div>
            <div className="text-[10px] text-vyro-muted truncate">{tx.paypalPayerEmail || 'Authenticated Buyer'}</div>
          </div>

          <div className="p-3 rounded bg-vyro-card border border-vyro-border/60">
            <span className="text-[10px] text-vyro-subtle block uppercase mb-1">Contracted Provider</span>
            <div className="font-bold text-vyro-text">{tx.sellerBusinessName || 'Verified Supplier'}</div>
            <div className="text-[10px] text-vyro-muted truncate">Verified Service Seller</div>
          </div>
        </div>

        {/* Gateway Technical Identifiers */}
        <div className="p-4 rounded bg-vyro-card border border-vyro-border space-y-2 text-xs font-mono">
          <span className="text-[10px] uppercase text-vyro-subtle block">Payment Gateway Proof</span>
          <div className="flex items-center justify-between">
            <span className="text-vyro-muted">Order Reference:</span>
            <span className="text-vyro-text font-bold">{tx.paypalOrderId || tx.id}</span>
          </div>
          {tx.paypalCaptureId && (
            <div className="flex items-center justify-between">
              <span className="text-vyro-muted">Capture ID:</span>
              <span className="text-vyro-success font-bold">{tx.paypalCaptureId}</span>
            </div>
          )}
          {tx.idempotencyKey && (
            <div className="flex items-center justify-between">
              <span className="text-vyro-muted">Idempotency Key:</span>
              <span className="text-vyro-subtle">{tx.idempotencyKey}</span>
            </div>
          )}
        </div>

        {/* Associated Agreement Deliverables */}
        {agreement && (
          <div className="pt-4 border-t border-vyro-border space-y-3">
            <span className="text-xs font-mono uppercase text-vyro-muted block tracking-wider">
              Contracted Scope & Deliverables
            </span>
            <ul className="space-y-1.5 text-xs text-vyro-text">
              {agreement.finalDeliverables?.map((item: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {agreement.commercialTerms && (
              <p className="text-[11px] text-vyro-muted italic pt-2">
                "{agreement.commercialTerms}"
              </p>
            )}
          </div>
        )}

        {/* Links to Source Deal & Dispute Policy */}
        <div className="pt-6 border-t border-vyro-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <Link to={`/app/deals/${tx.negotiationId}`}>
            <Button variant="outline" size="sm" leftIcon={<Scale className="w-3.5 h-3.5" />}>
              View Deal Cockpit ({tx.negotiationId})
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-vyro-muted">
            <HelpCircle className="w-3.5 h-3.5 text-vyro-accent" />
            <span>Delivery dispute?</span>
            <Link to="/dispute-policy" className="text-vyro-accent hover:underline font-medium">
              View Refund & Dispute Policy →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
