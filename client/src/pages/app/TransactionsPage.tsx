import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../../api/client';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatName, formatDate } from '../../lib/present';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace: isBuyer } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactionsList'],
    queryFn: api.getTransactions,
    refetchInterval: 8000
  });

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

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
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
                    <div className="flex items-center gap-2 text-secondary text-text-muted mt-0.5">
                      <span>With {formatName(counterpart)}</span>
                      <span>·</span>
                      <span>Captured via PayPal Escrow</span>
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

                  <StatusChip label="Settled & Paid" role="handled" size="sm" />

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