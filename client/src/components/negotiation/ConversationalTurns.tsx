import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Clock, DollarSign, ShieldAlert, Check } from 'lucide-react';
import { NegotiationMessage, Agent } from '../../types';
import { Badge } from '../common/Badge';

interface ConversationalTurnsProps {
  messages: NegotiationMessage[];
  buyerAgent: Agent;
  sellerAgent: Agent;
}

const getInitials = (name?: string): string => {
  if (!name) return 'AI';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ConversationalTurns: React.FC<ConversationalTurnsProps> = ({
  messages,
  buyerAgent,
  sellerAgent
}) => {
  return (
    <div className="space-y-4">
      {messages.map((msg, index) => {
        const isBuyer = msg.senderRole === 'buyer';
        const isSeller = msg.senderRole === 'seller';
        const isSystem = msg.senderRole === 'system' || msg.senderRole === 'evaluator';
        const isHuman = msg.senderType === 'human' || msg.requiresHumanResponse;

        const senderName = isBuyer
          ? (isHuman ? (buyerAgent.operatorName || 'Buyer Principal') : buyerAgent.name)
          : isSeller
          ? (isHuman ? (sellerAgent.operatorName || sellerAgent.businessName) : sellerAgent.businessName)
          : 'Consensus Arbiter';

        const initials = getInitials(senderName);

        const toolCall = msg.toolCalls && msg.toolCalls.length > 0 ? msg.toolCalls[0] : null;
        const offerPayload = msg.payload || toolCall?.args;
        const offerPrice = offerPayload?.counterPrice || offerPayload?.price || offerPayload?.proposedPrice;
        const offerDays = offerPayload?.turnaroundDays || offerPayload?.deliveryDays || offerPayload?.days;

        // Clean any untrusted markers from display text
        const cleanContent = msg.content
          ?.replace(/<<<UNTRUSTED_COUNTERPARTY_MESSAGE>>>/g, '')
          ?.replace(/<<<END_UNTRUSTED_COUNTERPARTY_MESSAGE>>>/g, '')
          ?.trim();

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: index * 0.02 }}
            className={`flex flex-col ${isBuyer ? 'items-start' : 'items-end'}`}
          >
            {/* Sender Metadata Bar */}
            <div
              className={`flex items-center gap-2 mb-1.5 text-[11px] font-mono text-vyro-muted ${
                isBuyer ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Initials Avatar fallback */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono text-white shrink-0 ${
                    isBuyer ? 'bg-[#4C7DF0]' : 'bg-emerald-600'
                  }`}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <span className="font-semibold text-vyro-text">{senderName}</span>
                {isHuman ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Human
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isBuyer
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    AI Agent
                  </span>
                )}
              </div>

              <span className="text-vyro-subtle">·</span>
              <span className="text-vyro-subtle">Round {msg.round}</span>
              <span className="text-vyro-subtle">·</span>

              <Badge
                variant={
                  msg.messageType === 'acceptance'
                    ? 'success'
                    : msg.messageType === 'counteroffer'
                    ? 'warning'
                    : msg.messageType === 'proposal'
                    ? 'accent'
                    : 'default'
                }
                size="sm"
              >
                {msg.messageType.toUpperCase()}
              </Badge>
            </div>

            {/* Message Bubble Card */}
            <div
              className={`max-w-xl p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed transition-all shadow-xs ${
                isHuman
                  ? 'bg-vyro-surface border-amber-500/40 text-vyro-text'
                  : isBuyer
                  ? 'bg-vyro-surface border-vyro-border hover:border-blue-500/40 text-vyro-text'
                  : 'bg-vyro-card border-vyro-border hover:border-emerald-500/40 text-vyro-text'
              }`}
            >
              {/* Human Escalation Alert */}
              {msg.requiresHumanResponse && !msg.humanResponded && (
                <div className="mb-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Escalation: Requires owner review</span>
                </div>
              )}

              {/* Message Content */}
              <p className="whitespace-pre-line text-vyro-text leading-relaxed font-sans">
                {cleanContent}
              </p>

              {/* Structured Offer Chip */}
              {offerPrice !== undefined && (
                <div className="mt-3 p-2.5 rounded-lg bg-vyro-bg/90 border border-vyro-border flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono font-bold text-vyro-text tabular-nums">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>${offerPrice} USD</span>
                    </div>
                    {offerDays && (
                      <div className="flex items-center gap-1 font-mono text-vyro-muted text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{offerDays}d Delivery</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    Terms
                  </span>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[10px] font-mono text-vyro-subtle mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
