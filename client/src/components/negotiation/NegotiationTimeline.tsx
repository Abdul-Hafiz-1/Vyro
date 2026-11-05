import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Cpu, ArrowRight, CornerDownRight, Check, Wrench } from 'lucide-react';
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
    <div className="space-y-4">
      {messages.map((msg, index) => {
        const isBuyer = msg.senderRole === 'buyer';
        const isSeller = msg.senderRole === 'seller';
        const isSystem = msg.senderRole === 'system' || msg.senderRole === 'evaluator';

        const senderName = isBuyer ? buyerAgent.name : isSeller ? sellerAgent.businessName : 'System Evaluator';
        
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className={`flex flex-col ${isBuyer ? 'items-start' : 'items-end'}`}
          >
            {/* Sender and Round Label */}
            <div className={`flex items-center gap-2 mb-1 text-[11px] font-mono text-vyro-muted ${
              isBuyer ? 'flex-row' : 'flex-row-reverse'
            }`}>
              <span className="font-semibold text-vyro-text">{senderName}</span>
              <span>•</span>
              <span className="text-vyro-subtle">Round {msg.round}</span>
              <span>•</span>
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
              className={`max-w-xl p-4 rounded-[8px] border text-xs leading-relaxed ${
                isBuyer
                  ? 'bg-vyro-surface border-vyro-border text-vyro-text'
                  : 'bg-vyro-card border-vyro-border/80 text-vyro-text'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>

              {/* Tool Execution Trace Badge (if invoked) */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-vyro-border/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-vyro-muted mb-1.5">
                    <Wrench className="w-3 h-3 text-vyro-accent" />
                    <span>Autonomous Tool Execution:</span>
                    <span className="text-vyro-text font-bold">`{msg.toolCalls[0].name}()`</span>
                  </div>
                  <pre className="p-2 rounded bg-vyro-bg border border-vyro-border/40 text-[10px] font-mono text-vyro-subtle overflow-x-auto">
                    {JSON.stringify(msg.toolCalls[0].args, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <span className="text-[9px] font-mono text-vyro-subtle mt-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
