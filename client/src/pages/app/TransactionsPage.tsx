import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactionsList'],
    queryFn: api.getTransactions,
    refetchInterval: 8000
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Settlement Ledger
            </h1>
            <Badge variant="success" size="sm">{transactions.length} Captured</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Cryptographically verified PayPal Sandbox payments and finalized commercial contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-vyro-success bg-vyro-success-bg/25 border border-vyro-success/40 px-3 py-1.5 rounded-[6px]">
          <ShieldCheck className="w-4 h-4" />
          <span>Server-Side Order Capture Verified</span>
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-[8px] bg-vyro-surface border border-vyro-border animate-pulse" />
          ))}
        </div>
      ) : transactions.length > 0 ? (
        <div className="bg-vyro-surface border border-vyro-border rounded-[8px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-vyro-border bg-vyro-card/60 text-vyro-subtle text-[10px] uppercase">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Contracted Seller</th>
                  <th className="py-3 px-4">Settlement Amount</th>
                  <th className="py-3 px-4">PayPal Capture Ref</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyro-border/40 text-vyro-text">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/app/transactions/${tx.id}`)}
                    className="hover:bg-vyro-hover/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-vyro-accent">{tx.id}</td>
                    <td className="py-3 px-4 font-sans font-medium">{tx.sellerBusinessName}</td>
                    <td className="py-3 px-4 font-bold text-vyro-text">
                      ${tx.amount} <span className="text-vyro-muted text-[10px]">{tx.currency}</span>
                    </td>
                    <td className="py-3 px-4 text-vyro-muted text-[11px] truncate max-w-[200px]">
                      {tx.paypalCaptureId || tx.paypalOrderId}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={tx.paymentStatus === 'completed' ? 'success' : 'warning'} size="sm">
                        {tx.paymentStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-vyro-muted">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-vyro-muted bg-vyro-surface rounded-[8px] border border-vyro-border">
          <CreditCard className="w-8 h-8 text-vyro-subtle mx-auto mb-2" />
          <p>No settled transactions recorded yet.</p>
          <p className="text-[11px] text-vyro-subtle mt-1">Complete a negotiation and authorize payment to generate settlement records.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/app/requests/new')}
          >
            Create Procurement Request
          </Button>
        </div>
      )}
    </div>
  );
};
