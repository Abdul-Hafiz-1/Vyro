import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ShieldCheck, ArrowRight, Plus } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace: isBuyer } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactionsList'],
    queryFn: api.getTransactions,
    refetchInterval: 8000
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-line gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Receipts & Transactions
            </h1>
            <Badge variant="default" size="sm">{transactions.length} Total</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Official commercial receipts for completed deals, escrow holds, and settled orders.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-control">
          <ShieldCheck className="w-4 h-4" />
          <span>Payment Verified & Held in Escrow</span>
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-control bg-vyro-surface border border-vyro-line animate-pulse" />
          ))}
        </div>
      ) : transactions.length > 0 ? (
        <div className="bg-vyro-surface border border-vyro-line rounded-control overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-vyro-line bg-vyro-card/60 text-vyro-muted text-[10px] uppercase">
                  <th className="py-3 px-4 font-semibold">Service Description</th>
                  <th className="py-3 px-4 font-semibold">Contracted Party</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Capture ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyro-line text-vyro-text font-sans">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/app/transactions/${tx.id}`)}
                    className="hover:bg-vyro-surface-hover cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-vyro-text">
                      {tx.serviceTitle || tx.itemTitle || 'Commercial Service Package'}
                    </td>
                    <td className="py-3 px-4 text-vyro-muted">
                      {tx.sellerBusinessName || 'Verified Supplier'}
                    </td>
                    <td className="py-3 px-4 font-bold text-vyro-text font-mono tabular-nums">
                      ${tx.amount} <span className="text-vyro-muted text-[10px]">{tx.currency}</span>
                    </td>
                    <td className="py-3 px-4 text-vyro-muted text-xs font-mono truncate max-w-[160px]">
                      {tx.paypalCaptureId || tx.paypalOrderId || tx.id}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={tx.status === 'settled' || tx.paymentStatus === 'completed' ? 'success' : 'warning'} size="sm">
                        {(tx.status || tx.paymentStatus || 'settled').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-vyro-muted text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-vyro-muted bg-vyro-surface rounded-control border border-vyro-line space-y-3 p-6">
          <CreditCard className="w-8 h-8 text-vyro-muted mx-auto mb-1" />
          <h3 className="text-sm font-semibold text-vyro-text">No transactions recorded yet</h3>
          <p className="max-w-sm mx-auto text-xs text-vyro-muted">
            Once your agent negotiates an agreement and payment is approved, your itemized receipts will appear here.
          </p>
          <div className="pt-2">
            {isBuyer ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/requests/new')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Post a Request
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/listings/new')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Create a Listing
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
