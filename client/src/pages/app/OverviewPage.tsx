import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bot,
  Scale,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap
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
    refetchInterval: 8000
  });

  const { data: negotiations } = useQuery({
    queryKey: ['negotiationsOverview'],
    queryFn: () => api.getNegotiations(),
    refetchInterval: 6000
  });

  const { data: agreements } = useQuery({
    queryKey: ['agreementsOverview'],
    queryFn: api.getAgreements,
    refetchInterval: 6000
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactionsOverview'],
    queryFn: api.getTransactions,
    refetchInterval: 6000
  });

  const { data: activity } = useQuery({
    queryKey: ['activityOverview'],
    queryFn: () => api.getActivity(6),
    refetchInterval: 6000
  });

  // Pending Human Authorization agreements (Priority 1 Attention)
  const pendingAgreements = (agreements || []).filter(a => a.humanApprovalStatus === 'pending');

  const handleLaunchGuidedDemo = async () => {
    setIsSeedingDemo(true);
    toast.info('Initiating multi-agent procurement across 3 sellers...');
    try {
      const result = await api.seedDemoFlow();
      refetchAnalytics();
      toast.success('Autonomous negotiation complete. Recommended agreement formed!');
      const recommendedNeg = result.negotiations.find(n => n.id === result.evaluation.recommendedNegotiationId) || result.negotiations[0];
      navigate(`/app/negotiations/${recommendedNeg.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Demo flow initiation failed');
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
    <div className="space-y-6">
      {/* Action Banner: Pending Human Authorizations */}
      {pendingAgreements.length > 0 && (
        <div className="p-4 rounded-[6px] bg-vyro-warning-bg border border-vyro-warning/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-vyro-warning/20 border border-vyro-warning/40 flex items-center justify-center text-vyro-warning shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-vyro-text">
                  Action Required: {pendingAgreements.length} Agreement Awaiting Human Authorization
                </h3>
                <Badge variant="warning" size="sm">Gate Locked</Badge>
              </div>
              <p className="text-xs text-vyro-muted mt-0.5">
                {pendingAgreements[0].sellerBusinessName} consensus reached at ${pendingAgreements[0].finalPrice} {pendingAgreements[0].currency}. Review and approve to clear for PayPal capture.
              </p>
            </div>
          </div>

          <Link to={`/app/negotiations/${pendingAgreements[0].negotiationId}`}>
            <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Review & Authorize
            </Button>
          </Link>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-vyro-text">
            Network Operations
          </h1>
          <p className="text-xs text-vyro-muted mt-0.5">
            Autonomous procurement agent telemetry, multi-party negotiations, and PayPal Sandbox captures.
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
            Run 3-Seller Benchmark Demo
          </Button>
          <Link to="/app/requests/new">
            <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Streamlined High-Density Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[6px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-vyro-subtle">Network Nodes</span>
          <div className="text-xl font-bold font-mono text-vyro-text mt-1">{stats.activeAgents} Active</div>
          <span className="text-[10px] text-vyro-muted font-mono mt-0.5">1 Buyer • 4 Sellers</span>
        </div>

        <div className="p-3.5 rounded-[6px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-vyro-subtle">Active Channels</span>
          <div className="text-xl font-bold font-mono text-vyro-warning mt-1">{stats.activeNegotiations} Negotiations</div>
          <span className="text-[10px] text-vyro-muted font-mono mt-0.5">Avg {stats.averageNegotiationRounds} turns / deal</span>
        </div>

        <div className="p-3.5 rounded-[6px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-vyro-subtle">Consensus Formed</span>
          <div className="text-xl font-bold font-mono text-vyro-success mt-1">{stats.agreementsReached} Agreed</div>
          <span className="text-[10px] text-vyro-muted font-mono mt-0.5">Evaluator Recommended</span>
        </div>

        <div className="p-3.5 rounded-[6px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-vyro-subtle">Captured Settlement</span>
          <div className="text-xl font-bold font-mono text-vyro-text mt-1">${stats.totalTransactionVolume} USD</div>
          <span className="text-[10px] text-vyro-success font-mono mt-0.5">PayPal Sandbox Verified</span>
        </div>
      </div>

      {/* Topology Canvas */}
      <div>
        <div className="flex items-center justify-between mb-2 text-xs font-mono text-vyro-muted">
          <span>ACTIVE NETWORK TOPOLOGY</span>
          <Link to="/app/network" className="text-vyro-accent hover:underline flex items-center gap-1 text-[11px]">
            <span>Registry ({stats.activeAgents} verified)</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <NetworkVisualizer interactive={true} />
      </div>

      {/* Two Column: Active Negotiations & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Negotiations */}
        <div className="lg:col-span-2 bg-vyro-surface border border-vyro-border rounded-[6px] p-4">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-vyro-border">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase text-vyro-text tracking-wider">
                Active Commercial Channels
              </h3>
            </div>
            <Link to="/app/negotiations">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                All ({negotiations?.length || 0})
              </Button>
            </Link>
          </div>

          {negotiations && negotiations.length > 0 ? (
            <div className="divide-y divide-vyro-border/50">
              {negotiations.slice(0, 4).map((neg) => {
                const isAgreed = neg.status === 'agreement_reached' || neg.status === 'completed';

                return (
                  <div
                    key={neg.id}
                    onClick={() => navigate(`/app/negotiations/${neg.id}`)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-vyro-hover/50 rounded cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-vyro-text">{neg.id}</span>
                        <Badge
                          variant={
                            neg.status === 'completed' ? 'success' :
                            neg.status === 'agreement_reached' ? 'warning' : 'accent'
                          }
                          size="sm"
                        >
                          {neg.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-vyro-muted font-mono block mt-0.5 truncate">
                        Round {neg.currentRound}/{neg.maxRounds} • {neg.messages.length} messages
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span className="text-xs font-bold text-vyro-text block">
                        ${neg.currentProposal?.price || 150} USD
                      </span>
                      <span className="text-[10px] text-vyro-subtle">
                        {neg.currentProposal?.deliveryDays || 5}d turnaround
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-vyro-muted">
              <Scale className="w-6 h-6 text-vyro-subtle mx-auto mb-1.5" />
              <p>No active negotiations.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5 text-xs h-7"
                onClick={handleLaunchGuidedDemo}
              >
                Launch Demo Scenario
              </Button>
            </div>
          )}
        </div>

        {/* Telemetry Stream */}
        <div className="bg-vyro-surface border border-vyro-border rounded-[6px] p-4">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-vyro-border">
            <h3 className="text-xs font-mono font-semibold uppercase text-vyro-text tracking-wider">
              Network Telemetry
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-vyro-success animate-pulse-subtle" />
          </div>

          <div className="space-y-2.5">
            {activity && activity.length > 0 ? (
              activity.slice(0, 5).map((evt) => (
                <div key={evt.id} className="p-2 rounded bg-vyro-card border border-vyro-border/50 text-xs">
                  <div className="flex items-center justify-between font-medium text-vyro-text text-[11px] mb-0.5">
                    <span className="truncate pr-1">{evt.title}</span>
                    <span className="font-mono text-[9px] text-vyro-subtle shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-vyro-muted leading-tight">{evt.description}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-vyro-muted py-6 text-center">No telemetry recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
