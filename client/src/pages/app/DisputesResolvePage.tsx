import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ShieldAlert,
  FileText,
  ExternalLink,
  AlertTriangle,
  Check
} from 'lucide-react';
import { api } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCents, formatDate, formatDueCountdown } from '../../lib/present';

export const DisputesResolvePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: disputes = [], isLoading, refetch } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: api.getAdminDisputes,
    refetchInterval: 8000
  });

  const [selectedOutcome, setSelectedOutcome] = useState<Record<string, 'release' | 'refund' | 'split'>>({});
  const [sellerPctMap, setSellerPctMap] = useState<Record<string, number>>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  const resolveMut = useMutation({
    mutationFn: (vars: { dealId: string; outcome: 'release' | 'refund' | 'split'; sellerPercent?: number; reason: string }) =>
      api.resolveProjectDispute(vars.dealId, {
        outcome: vars.outcome,
        sellerPercent: vars.sellerPercent,
        reason: vars.reason
      }),
    onSuccess: () => {
      toast.success('Dispute resolved and money settled.');
      queryClient.invalidateQueries({ queryKey: ['adminDisputes'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Could not resolve dispute.')
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/app/projects')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
            Resolve disputes
          </h1>
          <p className="text-secondary text-text-muted">
            Side-by-side comparison of agreed terms, deliveries, and PayPal escrow funds.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-44 rounded-card bg-surface border border-border-subtle opacity-70" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          title="No open disputes"
          description="Any projects with reported delivery or cancellation problems appear here."
          actionLabel="View projects"
          onAction={() => navigate('/app/projects')}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {disputes.map((d: any) => {
            const isResolved = d.status.startsWith('resolved');
            const ms = d.moneyState || { capturedCents: 0, refundedCents: 0, paidOutCents: 0, feeCents: 0, feeRefundedCents: 0, heldCents: 0 };
            const remainingCents = isResolved ? 0 : Math.max(0, ms.capturedCents - ms.refundedCents - ms.paidOutCents);
            const outcome = selectedOutcome[d.dealId] || 'split';
            const sellerPct = sellerPctMap[d.dealId] ?? 50;
            const splitSellerCents = Math.round((remainingCents * sellerPct) / 100);
            const splitBuyerRefundCents = remainingCents - splitSellerCents;
            const reason = reasonMap[d.dealId] || '';
            const dueCountdown = formatDueCountdown(d.responseDueAt);

            return (
              <Card key={d.id} className="p-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <ShieldAlert className="w-4 h-4 text-status-needs" />
                      <h2 className="font-display font-bold text-[18px] text-text-primary">
                        {d.projectTitle || 'Disputed project'}
                      </h2>
                      <StatusChip
                        label={isResolved ? 'Resolved' : d.status === 'responded' ? 'Evidence ready' : 'Awaiting reply'}
                        role={isResolved ? 'handled' : 'needsYou'}
                        size="sm"
                      />
                    </div>
                    <span className="text-secondary text-text-muted">
                      Reason: <strong className="text-text-primary">{d.reasonChip}</strong> · Escrowed balance: <strong className="text-text-primary">{formatCents(remainingCents)}</strong>
                      {!isResolved && dueCountdown && ` · Response window: ${dueCountdown.label}`}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/app/projects/${d.dealId}`)}>
                    Open project
                  </Button>
                </div>

                {/* 30-day abuse signals */}
                {(d.buyerAbuse?.flagged || d.sellerAbuse?.flagged) && (
                  <div className="px-4 py-2.5 rounded-control bg-status-declined/10 border border-status-declined/30 text-secondary text-status-declined flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Abuse watch:
                      {d.buyerAbuse?.flagged ? ` Buyer has ${d.buyerAbuse.losses30d} dispute losses in 30 days.` : ''}
                      {d.sellerAbuse?.flagged ? ` Seller has ${d.sellerAbuse.losses30d} dispute losses in 30 days.` : ''}
                    </span>
                  </div>
                )}

                {/* Side-by-side claims & agreed deliverables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-control bg-raised border border-border-subtle flex flex-col gap-2 text-secondary">
                    <span className="font-semibold text-text-primary">Agreed scope &amp; deliveries</span>
                    <ul className="list-disc pl-4 text-text-muted space-y-1">
                      {(d.agreement?.finalDeliverables || []).map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    {(d.deliveries || []).map((del: any, idx: number) => (
                      <div key={del.id} className="pt-2 border-t border-border-subtle/50 flex flex-col gap-1">
                        <span className="text-secondary text-text-muted">Delivery #{del.round ?? ((del.revisionNumber ?? idx) + 1)} ({formatDate(del.createdAt)}):</span>
                        <span className="text-text-primary">{del.note}</span>
                        {(del.files || []).map((f: any) => (
                          <a
                            key={f.id}
                            href={`/api/v1/projects/${d.dealId}/files/${f.id}`}
                            className="inline-flex items-center gap-1 text-secondary text-volt hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{f.originalName} (SHA-256 verified)</span>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-control bg-raised border border-border-subtle flex flex-col gap-2 text-secondary">
                    <span className="font-semibold text-text-primary">Party statements &amp; evidence</span>
                    <div>
                      <span className="text-secondary text-text-muted uppercase">Opened by {d.openedByRole}</span>
                      <p className="text-text-primary mt-0.5">{d.description}</p>
                      {(d.evidenceLinks || []).map((lnk: string, i: number) => (
                        <a key={i} href={lnk} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary text-volt hover:underline mr-2">
                          <ExternalLink className="w-3 h-3" />
                          <span>{lnk}</span>
                        </a>
                      ))}
                    </div>
                    {d.respondentNote && (
                      <div className="pt-2 border-t border-border-subtle/50">
                        <span className="text-secondary text-text-muted uppercase">Counterparty reply</span>
                        <p className="text-text-primary mt-0.5">{d.respondentNote}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Controls */}
                {isResolved ? (
                  <div className="p-3.5 rounded-control bg-status-handled/10 border border-status-handled/30 text-secondary flex items-center gap-2 text-status-handled">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      Resolved ({d.status.replace('resolved_', '')}
                      {d.resolutionSellerPct !== null && d.resolutionSellerPct !== undefined ? `, ${d.resolutionSellerPct}% to seller` : ''})
                      {d.resolutionReason ? ` — "${d.resolutionReason}"` : ''}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-control bg-surface border border-border-subtle flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'release', label: `Release all to seller (${formatCents(remainingCents)})` },
                        { id: 'refund', label: `Full refund to buyer (${formatCents(remainingCents)})` },
                        { id: 'split', label: 'Split funds (%)' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOutcome(prev => ({ ...prev, [d.dealId]: opt.id as any }))}
                          className={`px-3 py-1.5 rounded-control text-secondary font-medium border cursor-pointer transition-colors ${
                            outcome === opt.id
                              ? 'bg-volt text-[#0C0E0D] border-volt font-semibold'
                              : 'bg-raised border-border-subtle text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {outcome === 'split' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-secondary">
                          <span className="text-text-muted">Seller share: <strong className="text-text-primary">{sellerPct}% ({formatCents(splitSellerCents)})</strong></span>
                          <span className="text-text-muted">Buyer refund: <strong className="text-text-primary">{100 - sellerPct}% ({formatCents(splitBuyerRefundCents)})</strong></span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={sellerPct}
                          onChange={(e) => setSellerPctMap(prev => ({ ...prev, [d.dealId]: Number(e.target.value) }))}
                          className="w-full accent-[var(--color-volt)]"
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReasonMap(prev => ({ ...prev, [d.dealId]: e.target.value }))}
                        placeholder="Required resolution explanation shown to both parties..."
                        className="flex-1 h-10 px-3 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary"
                      />
                      <Button
                        variant="volt"
                        size="md"
                        isLoading={resolveMut.isPending}
                        disabled={reason.trim().length < 5}
                        onClick={() => resolveMut.mutate({
                          dealId: d.dealId,
                          outcome,
                          sellerPercent: outcome === 'split' ? sellerPct : undefined,
                          reason: reason.trim()
                        })}
                      >
                        Apply resolution
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
