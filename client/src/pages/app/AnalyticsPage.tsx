import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, DollarSign, Scale, Bot, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';

export const AnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: api.getAnalytics,
    refetchInterval: 10000
  });

  if (isLoading || !analytics) {
    return (
      <div className="py-20 text-center text-xs font-mono text-vyro-muted animate-pulse">
        Aggregating network performance statistics...
      </div>
    );
  }

  const { stats, categoryDistribution, transactionStatusDistribution } = analytics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Network Analytics & Telemetry
            </h1>
            <Badge variant="accent" size="sm">Persisted Data</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Computed metrics from authentic autonomous agent negotiations and PayPal Sandbox order captures.
          </p>
        </div>

        {stats.isSimulatedDataIncluded && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-vyro-warning bg-vyro-warning-bg px-2.5 py-1 rounded border border-vyro-warning/30">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Includes Sandbox Testnet Activity</span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1">Total Captured Volume</span>
          <div className="text-2xl font-bold font-mono text-vyro-text">${stats.totalTransactionVolume}</div>
          <span className="text-[10px] text-vyro-muted font-mono block mt-1">PayPal Sandbox Cleared</span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1">Avg Transaction Value</span>
          <div className="text-2xl font-bold font-mono text-vyro-text">${stats.averageTransactionValue}</div>
          <span className="text-[10px] text-vyro-muted font-mono block mt-1">Per Commercial Contract</span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1">Negotiation Success Rate</span>
          <div className="text-2xl font-bold font-mono text-vyro-success">{stats.successRatePercentage}%</div>
          <span className="text-[10px] text-vyro-muted font-mono block mt-1">Proposals Converted to Consensus</span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1">Avg Rounds to Agreement</span>
          <div className="text-2xl font-bold font-mono text-vyro-text">{stats.averageNegotiationRounds}</div>
          <span className="text-[10px] text-vyro-muted font-mono block mt-1">Turns before Contract Lock</span>
        </div>
      </div>

      {/* Distributions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Share */}
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-vyro-border">
            <h3 className="text-sm font-semibold text-vyro-text">Service Category Registry</h3>
            <span className="text-[11px] font-mono text-vyro-muted">Active Node Count</span>
          </div>

          <div className="space-y-3">
            {Object.entries(categoryDistribution).map(([cat, count]) => {
              const total = stats.totalAgents || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-vyro-text">{cat}</span>
                    <span className="text-vyro-muted">{count} agents ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-vyro-card overflow-hidden">
                    <div
                      className="h-full bg-vyro-accent rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Status Distribution */}
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-vyro-border">
            <h3 className="text-sm font-semibold text-vyro-text">Settlement Lifecycle Distribution</h3>
            <span className="text-[11px] font-mono text-vyro-muted">State Count</span>
          </div>

          <div className="space-y-3">
            {Object.entries(transactionStatusDistribution).length > 0 ? (
              Object.entries(transactionStatusDistribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded bg-vyro-card border border-vyro-border/50 text-xs font-mono">
                  <span className="uppercase text-vyro-text">{status.replace('_', ' ')}</span>
                  <Badge variant={status === 'completed' ? 'success' : 'warning'} size="sm">
                    {count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-vyro-muted py-6 text-center">No transaction records logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
