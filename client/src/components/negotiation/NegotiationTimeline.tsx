import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  User,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Layers,
  Cpu,
  Tag,
  HelpCircle,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { NegotiationMessage, Agent } from '../../types';
import { Badge } from '../common/Badge';

interface NegotiationTimelineProps {
  messages: NegotiationMessage[];
  buyerAgent: Agent;
  sellerAgent: Agent;
}

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  messages,
  buyerAgent,
  sellerAgent
}) => {
  return (
    <div className="space-y-5">
      {messages.map((msg, index) => {
        const isBuyer = msg.senderRole === 'buyer';
        const isSeller = msg.senderRole === 'seller';
        const isSystem = msg.senderRole === 'system' || msg.senderRole === 'evaluator';
        const isHuman = msg.senderType === 'human' || msg.requiresHumanResponse;

        const senderName = isBuyer 
          ? (isHuman ? (buyerAgent.operatorName || 'Alice Buyer') : buyerAgent.name)
          : isSeller 
          ? (isHuman ? (sellerAgent.operatorName || `${sellerAgent.businessName} (Principal)`) : sellerAgent.businessName)
          : 'Consensus Arbiter';

        const avatar = isBuyer
          ? (buyerAgent.operatorAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80')
          : (sellerAgent.operatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');

        const toolCall = msg.toolCalls && msg.toolCalls.length > 0 ? msg.toolCalls[0] : null;
        const offerPayload = msg.payload || toolCall?.args;
        const offerPrice = offerPayload?.counterPrice || offerPayload?.price || offerPayload?.proposedPrice || offerPayload?.agreedPrice;
        const offerDays = offerPayload?.turnaroundDays || offerPayload?.deliveryDays || offerPayload?.days;
        const tradesMade: string[] = Array.isArray(offerPayload?.tradesMade) ? offerPayload.tradesMade : [];
        const tradeSummary: string | undefined = offerPayload?.tradeSummary;
        const whyThisOffer: string | undefined = offerPayload?.whyThisOffer;

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className={`flex flex-col ${isBuyer ? 'items-start' : 'items-end'}`}
          >
            {/* Sender Metadata Bar */}
            <div
              className={`flex items-center gap-2 mb-1.5 text-[11px] font-mono text-vyro-muted ${
                isBuyer ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <img
                  src={avatar}
                  alt={senderName}
                  className="w-4 h-4 rounded-full object-cover ring-1 ring-vyro-border"
                />
                <span className="font-semibold text-vyro-text">{senderName}</span>
                {isHuman ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Human Principal
                  </span>
                ) : (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isBuyer
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    AI Agent
                  </span>
                )}
              </div>

              <span className="text-vyro-subtle">•</span>
              <span className="text-vyro-subtle">Round {msg.round}</span>
              <span className="text-vyro-subtle">•</span>

              <Badge
                variant={
                  msg.messageType === 'acceptance' ? 'success' :
                  msg.messageType === 'counteroffer' ? 'warning' :
                  msg.messageType === 'proposal' ? 'accent' : 'default'
                }
                size="sm"
              >
                {msg.messageType.toUpperCase()}
              </Badge>
            </div>

            {/* Message Bubble Card */}
            <div
              className={`max-w-xl p-4 rounded-[10px] border text-xs leading-relaxed transition-all shadow-xs space-y-3 ${
                isHuman
                  ? 'bg-vyro-surface border-amber-500/40 text-vyro-text'
                  : isBuyer
                  ? 'bg-vyro-surface border-vyro-border hover:border-blue-500/30 text-vyro-text'
                  : 'bg-vyro-card border-vyro-border hover:border-emerald-500/30 text-vyro-text'
              }`}
            >
              {/* Human Escalation Alert */}
              {msg.requiresHumanResponse && !msg.humanResponded && (
                <div className="p-2.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Human Escalation Notice: Commercial terms require explicit owner ratification.</span>
                </div>
              )}

              {/* Message Content */}
              <p className="whitespace-pre-line text-vyro-text leading-relaxed">
                {msg.content}
              </p>

              {/* Trade Exchange Banner (Shows what was traded this round) */}
              {(tradeSummary || tradesMade.length > 0) && (
                <div className="p-2.5 rounded-[6px] bg-vyro-bg border border-vyro-border/80 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-vyro-accent font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Concession & Trade Exchange</span>
                  </div>
                  {tradeSummary && (
                    <p className="text-vyro-text text-[11px] leading-snug">
                      {tradeSummary}
                    </p>
                  )}
                  {tradesMade.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {tradesMade.map((trade, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded bg-vyro-surface border border-vyro-border text-[10px] text-vyro-muted"
                        >
                          {trade}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Structured Package Spec */}
              {offerPrice && (
                <div className="p-2.5 rounded-[6px] bg-vyro-bg/80 border border-vyro-border flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono font-bold text-vyro-text">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>${offerPrice} USD</span>
                    </div>
                    {offerDays && (
                      <div className="flex items-center gap-1 font-mono text-vyro-muted text-[11px]">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{offerDays} Days Delivery</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Bilateral Terms
                  </span>
                </div>
              )}

              {/* "Why this offer" Rationale Box */}
              {whyThisOffer && (
                <div className="pt-2 border-t border-vyro-border/60 flex items-start gap-1.5 text-[11px] text-vyro-muted font-mono">
                  <HelpCircle className="w-3 h-3 text-vyro-subtle mt-0.5 shrink-0" />
                  <span>Rationale: {whyThisOffer}</span>
                </div>
              )}

              {/* Collapsible Tool Telemetry */}
              {toolCall && (
                <details className="pt-2 border-t border-vyro-border/60 group">
                  <summary className="text-[10px] font-mono text-vyro-subtle hover:text-vyro-muted cursor-pointer flex items-center gap-1.5 select-none transition-colors">
                    <Cpu className="w-3 h-3 text-blue-400" />
                    <span>Autonomous Tool Telemetry: <code className="text-vyro-text">{toolCall.name}()</code></span>
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-vyro-bg border border-vyro-border/40 text-[10px] font-mono text-vyro-subtle overflow-x-auto">
                    {JSON.stringify(toolCall.args, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
