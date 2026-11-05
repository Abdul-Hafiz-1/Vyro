import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Globe2,
  Bot,
  Scale,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { NetworkVisualizer } from '../../components/network/NetworkVisualizer';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: api.getAnalytics,
    refetchInterval: 10000
  });

  const { data: negotiations } = useQuery({
    queryKey: ['negotiationsOverview'],
    queryFn: () => api.getNegotiations(),
    refetchInterval: 8000
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactionsOverview'],
    queryFn: api.getTransactions,
    refetchInterval: 8000
  });

  const { data: activity } = useQuery({
    queryKey: ['activityOverview'],
    queryFn: () => api.getActivity(6),
    refetchInterval: 6000
  });

  const handleLaunchGuidedDemo = async () => {
    setIsSeedingDemo(true);
    try {
      const result = await api.seedDemoFlow();
      refetchAnalytics();
      const recommendedNeg = result.negotiations.find(n => n.id === result.evaluation.recommendedNegotiationId) || result.negotiations[0];
      navigate(`/app/negotiations/${recommendedNeg.id}`);
    } catch (err) {
      console.error('Demo flow failed:', err);
      navigate('/app/requests/new');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const stats = analytics?.stats || {
    activeAgents: 5,
    activeNegotiations: 0,
    agreementsReached: 0,
    completedTransactions: 0,
    totalTransactionVolume: 0,
    averageTransactionValue: 0,
    averageNegotiationRounds: 0,
    successRatePercentage: 100,
    isSimulatedDataIncluded: true
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Network Command Console
            </h1>
            <Badge variant="accent" size="sm">Mesh Live</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Autonomous procurement agents, pricing negotiations, and PayPal Sandbox settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isSeedingDemo}
            onClick={handleLaunchGuidedDemo}
            leftIcon={<Play className="w-3.5 h-3.5 text-vyro-accent" />}
          >
            Run Guided Hackathon Flow
          </Button>
          <Link to="/app/requests/new">
            <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Create Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <div className="flex items-center justify-between text-xs font-mono text-vyro-muted mb-2">
            <span>ACTIVE AGENTS</span>
            <Bot className="w-4 h-4 text-vyro-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-vyro-text">
            {stats.activeAgents}
          </div>
          <span className="text-[10px] text-vyro-subtle font-mono block mt-1">
            Buyer & Seller Nodes
          </span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <div className="flex items-center justify-between text-xs font-mono text-vyro-muted mb-2">
            <span>NEGOTIATIONS</span>
            <Scale className="w-4 h-4 text-vyro-warning" />
          </div>
          <div className="text-2xl font-bold font-mono text-vyro-text">
            {stats.activeNegotiations}
          </div>
          <span className="text-[10px] text-vyro-subtle font-mono block mt-1">
            Active Multi-Turn Channels
          </span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <div className="flex items-center justify-between text-xs font-mono text-vyro-muted mb-2">
            <span>AGREEMENTS</span>
            <CheckCircle2 className="w-4 h-4 text-vyro-success" />
          </div>
          <div className="text-2xl font-bold font-mono text-vyro-text">
            {stats.agreementsReached}
          </div>
          <span className="text-[10px] text-vyro-subtle font-mono block mt-1">
            Consensus Formed
          </span>
        </div>

        <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border">
          <div className="flex items-center justify-between text-xs font-mono text-vyro-muted mb-2">
            <span>PAYPAL VOLUME</span>
            <CreditCard className="w-4 h-4 text-vyro-success" />
          </div>
          <div className="text-2xl font-bold font-mono text-vyro-text">
            ${stats.totalTransactionVolume}
          </div>
          <span className="text-[10px] text-vyro-success font-mono block mt-1">
            PayPal Sandbox Captured
          </span>
        </div>
      </div>

      {/* Network Topology Visualizer Widget */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-vyro-muted">
          <span>ACTIVE NETWORK ACTIVITY TOPOLOGY</span>
          <Link to="/app/network" className="text-vyro-accent hover:underline flex items-center gap-1">
            <span>View Full Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <NetworkVisualizer interactive={true} />
      </div>

      {/* Two Column Section: Active Negotiations & Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Negotiations (2 cols) */}
        <div className="lg:col-span-2 bg-vyro-surface border border-vyro-border rounded-[8px] p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-vyro-border">
            <div>
              <h3 className="text-sm font-semibold text-vyro-text tracking-tight">Active Negotiations</h3>
              <p className="text-[11px] text-vyro-muted">Live agent counteroffers & agreement states</p>
            </div>
            <Link to="/app/negotiations">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {negotiations && negotiations.length > 0 ? (
            <div className="divide-y divide-vyro-border/50">
              {negotiations.slice(0, 4).map((neg) => (
                <div
                  key={neg.id}
                  onClick={() => navigate(`/app/negotiations/${neg.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-vyro-hover/50 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-vyro-text truncate">{neg.id}</span>
                      <Badge
                        variant={
                          neg.status === 'agreement_reached' || neg.status === 'completed' ? 'success' :
                          neg.status === 'in_negotiation' ? 'accent' : 'default'
                        }
                        size="sm"
                      >
                        {neg.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-vyro-muted font-mono block mt-0.5 truncate">
                      Round {neg.currentRound} / {neg.maxRounds} • {neg.messages.length} messages
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold font-mono text-vyro-text block">
                      ${neg.currentProposal?.price || 150}
                    </span>
                    <span className="text-[10px] text-vyro-subtle font-mono">
                      {new Date(neg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-vyro-muted">
              <Scale className="w-8 h-8 text-vyro-subtle mx-auto mb-2" />
              <p>No negotiations currently active.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={handleLaunchGuidedDemo}
              >
                Trigger Demo Flow
              </Button>
            </div>
          )}
        </div>

        {/* Telemetry Activity Feed (1 col) */}
        <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-vyro-border">
            <h3 className="text-sm font-semibold text-vyro-text tracking-tight">Network Activity</h3>
            <span className="w-2 h-2 rounded-full bg-vyro-success animate-pulse-subtle" />
          </div>

          <div className="space-y-3">
            {activity && activity.length > 0 ? (
              activity.map((evt) => (
                <div key={evt.id} className="p-2.5 rounded bg-vyro-card border border-vyro-border/60 text-xs">
                  <div className="flex items-center justify-between text-vyro-text font-medium text-[11px] mb-1">
                    <span className="truncate pr-2">{evt.title}</span>
                    <span className="font-mono text-[9px] text-vyro-subtle shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-vyro-muted leading-relaxed">{evt.description}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-vyro-muted py-6 text-center">No telemetry events recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Settled Transactions Table */}
      <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-vyro-border">
          <div>
            <h3 className="text-sm font-semibold text-vyro-text tracking-tight">Recent Captured Payments</h3>
            <p className="text-[11px] text-vyro-muted">Verified settlements via PayPal Sandbox Orders API</p>
          </div>
          <Link to="/app/transactions">
            <Button variant="ghost" size="sm">
              Ledger
            </Button>
          </Link>
        </div>

        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-vyro-border text-vyro-subtle text-[10px] uppercase">
                  <th className="pb-2">Transaction ID</th>
                  <th className="pb-2">Contracted Seller</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">PayPal Ref</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyro-border/40 text-vyro-text">
                {transactions.slice(0, 4).map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/app/transactions/${tx.id}`)}
                    className="hover:bg-vyro-hover/50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-vyro-accent">{tx.id}</td>
                    <td className="py-2.5">{tx.sellerBusinessName}</td>
                    <td className="py-2.5 font-bold">${tx.amount} {tx.currency}</td>
                    <td className="py-2.5 text-vyro-muted text-[11px]">{tx.paypalCaptureId || tx.paypalOrderId}</td>
                    <td className="py-2.5">
                      <Badge variant="success" size="sm">
                        {tx.paymentStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right text-vyro-muted">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-vyro-muted">
            <CreditCard className="w-6 h-6 text-vyro-subtle mx-auto mb-1.5" />
            <p>No settled transactions yet. Authorize an agreement to capture payment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
