import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, CheckCircle2, CreditCard, Scale, Clock, Copy, Check } from 'lucide-react';
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

  if (isLoading || !tx) {
    return (
      <div className="py-20 text-center text-xs font-mono text-vyro-muted animate-pulse">
        Fetching cryptographic settlement receipt...
      </div>
    );
  }

  const { agreement, negotiation, sellerAgent } = tx;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-vyro-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/transactions')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> All Settlements
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono text-vyro-text">{tx.id}</h1>
            <p className="text-xs text-vyro-muted">Official Payment Receipt & Contract Proof</p>
          </div>
        </div>

        <Badge variant={tx.paymentStatus === 'completed' ? 'success' : 'warning'} size="md">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          {tx.paymentStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Main Receipt Shell */}
      <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-6">
        {/* Settlement Banner */}
        <div className="flex items-center justify-between pb-6 border-b border-vyro-border">
          <div>
            <span className="text-[10px] font-mono uppercase text-vyro-subtle block">Amount Captured</span>
            <div className="text-3xl font-bold font-mono text-vyro-success mt-1">
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
            <div className="font-bold text-vyro-text">{tx.buyerAgentName}</div>
            <div className="text-[10px] text-vyro-muted truncate">{tx.paypalPayerEmail || 'buyer@sandbox.vyro.network'}</div>
          </div>

          <div className="p-3 rounded bg-vyro-card border border-vyro-border/60">
            <span className="text-[10px] text-vyro-subtle block uppercase mb-1">Contracted Provider</span>
            <div className="font-bold text-vyro-text">{tx.sellerBusinessName}</div>
            <div className="text-[10px] text-vyro-muted truncate">Verified Seller Agent Node</div>
          </div>
        </div>

        {/* PayPal Technical Identifiers */}
        <div className="p-4 rounded bg-vyro-card border border-vyro-border space-y-2 text-xs font-mono">
          <span className="text-[10px] uppercase text-vyro-subtle block">Gateway References</span>
          <div className="flex items-center justify-between">
            <span className="text-vyro-muted">PayPal Order ID:</span>
            <span className="text-vyro-text font-bold">{tx.paypalOrderId}</span>
          </div>
          {tx.paypalCaptureId && (
            <div className="flex items-center justify-between">
              <span className="text-vyro-muted">PayPal Capture ID:</span>
              <span className="text-vyro-success font-bold">{tx.paypalCaptureId}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-vyro-muted">Idempotency Key:</span>
            <span className="text-vyro-subtle">{tx.idempotencyKey}</span>
          </div>
        </div>

        {/* Associated Agreement Deliverables */}
        {agreement && (
          <div className="pt-4 border-t border-vyro-border space-y-3">
            <span className="text-xs font-mono uppercase text-vyro-muted block tracking-wider">
              Enforced Scope & Deliverables
            </span>
            <ul className="space-y-1.5 text-xs text-vyro-text">
              {agreement.finalDeliverables.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-vyro-muted italic pt-2">
              "{agreement.commercialTerms}"
            </p>
          </div>
        )}

        {/* Links to Source Negotiation */}
        <div className="pt-6 border-t border-vyro-border flex items-center justify-between">
          <Link to={`/app/negotiations/${tx.negotiationId}`}>
            <Button variant="outline" size="sm" leftIcon={<Scale className="w-3.5 h-3.5" />}>
              View Dialogue History ({tx.negotiationId})
            </Button>
          </Link>
          <span className="text-[11px] font-mono text-vyro-subtle">
            PayPal Sandbox Non-Escrow Capture
          </span>
        </div>
      </div>
    </div>
  );
};
