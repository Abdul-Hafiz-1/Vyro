import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  DollarSign, 
  ArrowRight, 
  Sliders, 
  Layers, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface AgentActor {
  id: string;
  name: string;
  businessName: string;
  operatorName: string;
  operatorRole: string;
  operatorAvatar: string;
  location: string;
  quote: number;
  floor: number;
  deliveryDays: number;
  strategy: string;
  status: 'optimal' | 'negotiating' | 'below_floor' | 'sla_breached';
  reactionText: string;
}

export const NegotiationArena: React.FC<{
  onLaunchDemo?: (budget: number, days: number) => void;
  className?: string;
}> = ({ onLaunchDemo, className = '' }) => {
  // Interactive simulation state
  const [budget, setBudget] = useState<number>(150);
  const [deliveryDays, setDeliveryDays] = useState<number>(5);
  const [activeStrategy, setActiveStrategy] = useState<'balanced' | 'aggressive' | 'quality'>('balanced');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('pixel');

  // Compute live multi-agent reactions based on interactive parameters
  const agents: AgentActor[] = useMemo(() => {
    // 1. Pixel Studio (Floor $145, standard $180, SLA 5d)
    let pixelStatus: AgentActor['status'] = 'negotiating';
    let pixelQuote = 180;
    let pixelText = 'Analyzing procurement spec and deliverable scope.';

    if (budget < 145) {
      pixelStatus = 'below_floor';
      pixelQuote = 145;
      pixelText = 'Requested budget ($' + budget + ') is strictly below our $145 craft floor. Will decline or require scope reduction.';
    } else if (deliveryDays < 5) {
      pixelStatus = 'sla_breached';
      pixelQuote = 160;
      pixelText = 'Strict 5-day SLA required for design system QA. Cannot compress to ' + deliveryDays + ' days without risk.';
    } else {
      // Negotiate down to budget or near floor
      pixelQuote = Math.max(145, Math.min(180, budget > 160 ? budget - 15 : budget));
      pixelStatus = 'optimal';
      pixelText = `Can meet $${pixelQuote} within ${deliveryDays} days with full Figma tokens and interactive micro-interactions.`;
    }

    // 2. Northstar Interactive (Floor $150, standard $160, SLA 4d expedited)
    let northstarStatus: AgentActor['status'] = 'negotiating';
    let northstarQuote = 160;
    let northstarText = 'Expedited 4-day delivery ready.';

    if (budget < 150) {
      northstarStatus = 'below_floor';
      northstarQuote = 150;
      northstarText = `Budget $${budget} is below our $150 minimum floor. Standing firm on engineering rate.`;
    } else {
      northstarQuote = Math.max(150, Math.min(160, budget));
      northstarStatus = deliveryDays >= 4 ? 'negotiating' : 'sla_breached';
      northstarText = `Offering 4-day expedited turnaround at $${northstarQuote}.`;
    }

    // 3. LaunchCraft Velocity (Floor $120, standard $130, SLA 8d)
    let launchStatus: AgentActor['status'] = 'negotiating';
    let launchQuote = 130;
    let launchText = 'Economy pipeline ready.';

    if (deliveryDays < 8) {
      launchStatus = 'sla_breached';
      launchQuote = Math.max(120, Math.min(130, budget));
      launchText = `Standard turnaround is 8 days. ${deliveryDays} days breaches our standard development schedule.`;
    } else if (budget < 120) {
      launchStatus = 'below_floor';
      launchQuote = 120;
      launchText = `Budget below $120 floor. Cannot proceed.`;
    } else {
      launchQuote = Math.max(120, Math.min(130, budget));
      launchStatus = 'optimal';
      launchText = `Economy rate $${launchQuote} accepted for 8-day delivery schedule.`;
    }

    return [
      {
        id: 'pixel',
        name: 'Pixel Studio Agent',
        businessName: 'Pixel Studio Collective',
        operatorName: 'Elena Vance',
        operatorRole: 'Lead Product Designer',
        operatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        location: 'Berlin, DE',
        quote: pixelQuote,
        floor: 145,
        deliveryDays: 5,
        strategy: 'Balanced Craft',
        status: pixelStatus,
        reactionText: pixelText
      },
      {
        id: 'northstar',
        name: 'Northstar Agent',
        businessName: 'Northstar Interactive',
        operatorName: 'Marcus Thorne',
        operatorRole: 'Principal UX Architect',
        operatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        location: 'London, UK',
        quote: northstarQuote,
        floor: 150,
        deliveryDays: 4,
        strategy: 'Expedited 4d',
        status: northstarStatus,
        reactionText: northstarText
      },
      {
        id: 'launchcraft',
        name: 'LaunchCraft Agent',
        businessName: 'LaunchCraft Velocity',
        operatorName: 'Kenji Sato',
        operatorRole: 'Frontend Systems Lead',
        operatorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        location: 'Tokyo, JP',
        quote: launchQuote,
        floor: 120,
        deliveryDays: 8,
        strategy: 'Low-Cost Economy',
        status: launchStatus,
        reactionText: launchText
      }
    ];
  }, [budget, deliveryDays, activeStrategy]);

  // Determine winning recommendation based on criteria
  const recommendedAgent = useMemo(() => {
    // Must meet SLA (deliveryDays <= user requested days)
    // Must meet budget (quote <= budget)
    // Score based on balance of price and SLA adherence
    const qualified = agents.filter(a => a.status === 'optimal' || a.status === 'negotiating');
    if (qualified.length === 0) return null;
    // Prefer Pixel Studio if qualified for best craft score
    const pixel = qualified.find(a => a.id === 'pixel' && a.deliveryDays <= deliveryDays && a.quote <= budget);
    if (pixel) return pixel;
    return qualified[0];
  }, [agents, budget, deliveryDays]);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className={`relative bg-vyro-secondary border border-vyro-border rounded-[12px] p-6 overflow-hidden ${className}`}>
      {/* Background ambient texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Top Header Bar with Live Indicator */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-vyro-border/60 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-vyro-accent animate-pulse-subtle" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-vyro-text">
              Living Negotiation Arena
            </span>
            <span className="text-vyro-subtle">•</span>
            <span className="text-xs font-mono text-vyro-accent">Multi-Agent Equilibrium</span>
          </div>
          <p className="text-xs text-vyro-muted">
            Drag the parameters below to see how seller agents dynamically calculate margins, defend floors, and form consensus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {recommendedAgent ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vyro-success/10 border border-vyro-success/30 text-vyro-success text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Consensus Found: {recommendedAgent.businessName} (${recommendedAgent.quote})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vyro-warning/10 border border-vyro-warning/30 text-vyro-warning text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>No Equilibrium: Budget/SLA Bounds Tight</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-[8px] bg-vyro-surface border border-vyro-border mb-6">
        {/* Budget Slider */}
        <div>
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-vyro-muted flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-vyro-accent" />
              Buyer Max Ceiling:
            </span>
            <span className="text-vyro-text font-bold text-sm">${budget}</span>
          </div>
          <input
            type="range"
            min="100"
            max="220"
            step="5"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-vyro-accent bg-vyro-card cursor-pointer h-1.5 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-vyro-subtle mt-1">
            <span>$100 (Tight)</span>
            <span>$150 (Benchmark)</span>
            <span>$220 (Flexible)</span>
          </div>
        </div>

        {/* SLA Turnaround Slider */}
        <div>
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-vyro-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-vyro-accent" />
              Maximum Deadline:
            </span>
            <span className="text-vyro-text font-bold text-sm">{deliveryDays} Days</span>
          </div>
          <input
            type="range"
            min="3"
            max="10"
            step="1"
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(Number(e.target.value))}
            className="w-full accent-vyro-accent bg-vyro-card cursor-pointer h-1.5 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-vyro-subtle mt-1">
            <span>3 Days (Expedited)</span>
            <span>5 Days (Target)</span>
            <span>10 Days (Relaxed)</span>
          </div>
        </div>

        {/* Strategy Selector */}
        <div>
          <span className="text-xs font-mono text-vyro-muted block mb-2">
            Buyer Strategy Engine:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'balanced', label: 'Balanced' },
              { id: 'aggressive', label: 'Cost-Min' },
              { id: 'quality', label: 'Quality' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveStrategy(m.id as any)}
                className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition-all ${
                  activeStrategy === m.id
                    ? 'bg-vyro-accent text-white font-semibold'
                    : 'bg-vyro-card text-vyro-muted hover:text-vyro-text border border-vyro-border/60'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Visual Arena Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: The Buyer Agent & Human Origin */}
        <div className="lg:col-span-4 p-5 rounded-[10px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-vyro-accent">
                Delegating Principal
              </span>
              <Badge variant="accent" size="sm">Buyer Node</Badge>
            </div>

            {/* Human Behind Buyer */}
            <div className="flex items-center gap-3.5 mb-4 p-3 rounded-[8px] bg-vyro-card border border-vyro-border/60">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80"
                alt="Alex Mercer"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-vyro-accent/40"
              />
              <div>
                <span className="text-sm font-semibold text-vyro-text block">Alex Mercer</span>
                <span className="text-xs text-vyro-muted">Founder, Mercer Media • San Francisco</span>
              </div>
            </div>

            <p className="text-xs text-vyro-muted italic mb-4 border-l-2 border-vyro-accent/40 pl-3">
              "I delegate procurement so our team can spend our days building products rather than reading through 40-page sales proposals."
            </p>

            {/* Constraints Card */}
            <div className="space-y-2 text-xs font-mono p-3 rounded-[6px] bg-vyro-card/80 border border-vyro-border/40">
              <div className="flex justify-between">
                <span className="text-vyro-muted">Specified Ceiling:</span>
                <span className="text-vyro-text font-bold">${budget}.00 USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vyro-muted">SLA Window:</span>
                <span className="text-vyro-text font-bold">Within {deliveryDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vyro-muted">Approval Policy:</span>
                <span className="text-vyro-success font-semibold">Explicit Human Signoff</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-vyro-border/60 flex items-center justify-between text-xs font-mono text-vyro-muted">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-vyro-accent" />
              Studio Buyer Agent
            </span>
            <span className="text-vyro-success">Broadcasting Spec</span>
          </div>
        </div>

        {/* Center: Gravitational Convergence Vector */}
        <div className="lg:col-span-4 p-5 rounded-[10px] bg-vyro-card border border-vyro-border flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-vyro-text">
                Evaluator Matrix
              </span>
              <span className="text-[10px] font-mono text-vyro-muted">Independent AI Arbiter</span>
            </div>

            {/* Scorecard & Convergence Radar */}
            <div className="space-y-3 mb-5">
              {agents.map(a => {
                const isWinner = recommendedAgent?.id === a.id;
                const isSelected = selectedAgentId === a.id;

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAgentId(a.id)}
                    className={`p-3 rounded-[8px] cursor-pointer transition-all border ${
                      isWinner
                        ? 'bg-vyro-success/10 border-vyro-success ring-1 ring-vyro-success/30'
                        : isSelected
                        ? 'bg-vyro-surface border-vyro-accent'
                        : 'bg-vyro-surface/60 border-vyro-border/60 hover:border-vyro-border'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-vyro-text">{a.businessName}</span>
                      <span className={`font-mono font-bold ${
                        a.status === 'optimal'
                          ? 'text-vyro-success'
                          : a.status === 'below_floor'
                          ? 'text-vyro-error'
                          : 'text-vyro-warning'
                      }`}>
                        ${a.quote} ({a.deliveryDays}d)
                      </span>
                    </div>

                    <div className="w-full bg-vyro-border/50 h-1 rounded-full overflow-hidden mb-1.5">
                      <motion.div
                        className={`h-full ${
                          isWinner ? 'bg-vyro-success' : a.status === 'below_floor' ? 'bg-vyro-error' : 'bg-vyro-accent'
                        }`}
                        initial={{ width: '50%' }}
                        animate={{ 
                          width: a.status === 'below_floor' ? '20%' : isWinner ? '95%' : '65%' 
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <p className="text-[11px] text-vyro-muted truncate">
                      {a.reactionText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="relative z-10 pt-3 border-t border-vyro-border/60">
            {onLaunchDemo && (
              <button
                onClick={() => onLaunchDemo(budget, deliveryDays)}
                className="w-full py-2.5 px-4 rounded-[6px] bg-vyro-text hover:bg-white text-vyro-bg font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Launch Real Gemini Negotiation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Inspected Seller Agent & Human Lead */}
        <div className="lg:col-span-4 p-5 rounded-[10px] bg-vyro-surface border border-vyro-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-vyro-text">
                Seller Representative
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                activeAgent.status === 'optimal'
                  ? 'bg-vyro-success/15 text-vyro-success border border-vyro-success/30'
                  : activeAgent.status === 'below_floor'
                  ? 'bg-vyro-error/15 text-vyro-error border border-vyro-error/30'
                  : 'bg-vyro-warning/15 text-vyro-warning border border-vyro-warning/30'
              }`}>
                {activeAgent.status.replace('_', ' ')}
              </span>
            </div>

            {/* Human Operator Behind Seller */}
            <div className="flex items-center gap-3.5 mb-4 p-3 rounded-[8px] bg-vyro-card border border-vyro-border/60">
              <img
                src={activeAgent.operatorAvatar}
                alt={activeAgent.operatorName}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-vyro-border"
              />
              <div>
                <span className="text-sm font-semibold text-vyro-text block">{activeAgent.operatorName}</span>
                <span className="text-xs text-vyro-muted">{activeAgent.operatorRole} • {activeAgent.location}</span>
              </div>
            </div>

            {/* Agent Live Telemetry */}
            <div className="space-y-2 text-xs font-mono p-3 rounded-[6px] bg-vyro-card/80 border border-vyro-border/40 mb-4">
              <div className="flex justify-between">
                <span className="text-vyro-muted">Active Bid:</span>
                <span className="text-vyro-text font-bold">${activeAgent.quote}.00 USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vyro-muted">Calibrated Floor:</span>
                <span className="text-vyro-subtle">${activeAgent.floor}.00 USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vyro-muted">Guaranteed Turnaround:</span>
                <span className="text-vyro-text">{activeAgent.deliveryDays} Days SLA</span>
              </div>
            </div>

            {/* Live Tactical Reasoning */}
            <div className="p-3 rounded-[6px] bg-vyro-card border border-vyro-border/60 text-xs">
              <span className="text-[10px] font-mono text-vyro-accent uppercase tracking-wider block mb-1">
                Agent Tactical Reasoning:
              </span>
              <p className="text-vyro-muted text-xs leading-relaxed">
                "{activeAgent.reactionText}"
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-vyro-border/60 flex items-center justify-between text-xs font-mono text-vyro-subtle">
            <span>Verified Principal: {activeAgent.operatorName}</span>
            <span className="text-vyro-accent">100% Bound</span>
          </div>
        </div>
      </div>
    </div>
  );
};
