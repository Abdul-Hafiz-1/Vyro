import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Cpu, CheckCircle2, ShieldCheck, DollarSign, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface Node {
  id: string;
  name: string;
  role: 'buyer' | 'seller' | 'evaluator';
  category: string;
  status: 'idle' | 'negotiating' | 'agreed' | 'settled';
  quote?: string;
  x: number;
  y: number;
}

export const NetworkVisualizer: React.FC<{ interactive?: boolean; className?: string }> = ({
  interactive = true,
  className = ''
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const steps = [
    { title: 'Discovery', desc: 'Buyer Agent broadcasts structured procurement specs across network' },
    { title: 'Negotiation', desc: 'Sellers counteroffer within deterministic price floors' },
    { title: 'Evaluation', desc: 'Evaluator compares terms, deliverables, and delivery SLAs' },
    { title: 'Settlement', desc: 'Human authorizes agreement & PayPal Sandbox executes capture' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const nodes: Node[] = [
    { id: 'buyer', name: 'Studio Buyer', role: 'buyer', category: 'Procurement', status: 'negotiating', quote: 'Max $150', x: 120, y: 190 },
    { id: 'eval', name: 'Evaluator Core', role: 'evaluator', category: 'Arbitration', status: 'idle', quote: '92/100 Recommended', x: 380, y: 190 },
    { id: 'pixel', name: 'Pixel Studio', role: 'seller', category: 'Design', status: 'agreed', quote: 'Agreed $143 (5d)', x: 640, y: 80 },
    { id: 'northstar', name: 'Northstar Design', role: 'seller', category: 'UX/UI', status: 'negotiating', quote: 'Offered $155 (4d)', x: 670, y: 200 },
    { id: 'launchcraft', name: 'LaunchCraft', role: 'seller', category: 'Dev', status: 'negotiating', quote: 'Offered $135 (3d)', x: 630, y: 310 },
  ];

  return (
    <div className={`relative bg-vyro-secondary border border-vyro-border rounded-[8px] p-4 overflow-hidden ${className}`}>
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      {/* Header controls & step indicator */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-vyro-border/60 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-vyro-accent animate-pulse-subtle" />
          <span className="text-xs font-mono font-semibold tracking-wider text-vyro-text uppercase">
            Live Topology Mesh
          </span>
          <Badge variant="accent" size="sm">Autonomous Mode</Badge>
        </div>

        {/* Phase progress indicators */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {steps.map((s, idx) => (
            <button
              key={s.title}
              onClick={() => setActiveStep(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 ${
                activeStep === idx
                  ? 'bg-vyro-surface border border-vyro-accent text-vyro-text font-bold'
                  : 'text-vyro-muted hover:text-vyro-text bg-vyro-card/60 border border-vyro-border/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeStep === idx ? 'bg-vyro-accent' : 'bg-vyro-subtle'}`} />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topology Canvas Viewport */}
      <div className="relative w-full h-[360px] flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 800 380" fill="none">
          {/* Connection Lines from Buyer to Evaluator */}
          <line
            x1="180" y1="190"
            x2="320" y2="190"
            stroke="#292D36"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {/* Active Data Packet on Buyer -> Evaluator */}
          <motion.circle
            r="4"
            fill="#8B7CFF"
            animate={{
              cx: [180, 320],
              cy: [190, 190],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />

          {/* Connection Lines from Evaluator to Sellers */}
          {/* To Pixel Studio */}
          <line
            x1="440" y1="190"
            x2="590" y2="90"
            stroke={activeStep >= 2 ? '#63D6A0' : '#292D36'}
            strokeWidth={activeStep >= 2 ? '2.5' : '1.5'}
          />
          <motion.circle
            r="4"
            fill={activeStep >= 2 ? '#63D6A0' : '#8B7CFF'}
            animate={{
              cx: [440, 590],
              cy: [190, 90],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* To Northstar Design */}
          <line
            x1="440" y1="190"
            x2="610" y2="200"
            stroke="#292D36"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <motion.circle
            r="3"
            fill="#9398A4"
            animate={{
              cx: [440, 610],
              cy: [190, 200],
              opacity: [0, 0.8, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* To LaunchCraft */}
          <line
            x1="440" y1="190"
            x2="580" y2="300"
            stroke="#292D36"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <motion.circle
            r="3"
            fill="#9398A4"
            animate={{
              cx: [440, 580],
              cy: [190, 300],
              opacity: [0, 0.8, 0]
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </svg>

        {/* Render Node Overlays */}
        {nodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isRecommended = node.id === 'pixel' && activeStep >= 2;

          return (
            <motion.div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`absolute cursor-pointer transition-all ${
                interactive ? 'hover:scale-105' : ''
              }`}
              style={{ left: `${node.x}px`, top: `${node.y}px`, transform: 'translate(-50%, -50%)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className={`p-3 rounded-[8px] bg-vyro-surface border transition-colors shadow-lg flex items-center gap-3 min-w-[170px] ${
                  isRecommended
                    ? 'border-vyro-success bg-vyro-success-bg/20 ring-1 ring-vyro-success/40'
                    : isSelected
                    ? 'border-vyro-accent ring-1 ring-vyro-accent/50'
                    : 'border-vyro-border hover:border-vyro-border-light'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-[6px] border flex items-center justify-center shrink-0 ${
                    node.role === 'buyer'
                      ? 'bg-vyro-hover border-vyro-border text-vyro-accent'
                      : node.role === 'evaluator'
                      ? 'bg-vyro-card border-vyro-border text-vyro-warning'
                      : isRecommended
                      ? 'bg-vyro-success/20 border-vyro-success text-vyro-success'
                      : 'bg-vyro-card border-vyro-border text-vyro-text'
                  }`}
                >
                  {node.role === 'buyer' && <Bot className="w-4 h-4" />}
                  {node.role === 'evaluator' && <Cpu className="w-4 h-4" />}
                  {node.role === 'seller' && (isRecommended ? <CheckCircle2 className="w-4 h-4" /> : <Bot className="w-4 h-4" />)}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-vyro-text truncate">{node.name}</span>
                  </div>
                  <span className="text-[10px] text-vyro-muted font-mono">{node.category}</span>
                  {node.quote && (
                    <span className={`text-[11px] font-mono font-semibold mt-0.5 ${
                      isRecommended ? 'text-vyro-success' : 'text-vyro-accent'
                    }`}>
                      {node.quote}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="relative z-10 mt-2 p-3 rounded-[6px] bg-vyro-card border border-vyro-border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">Phase {activeStep + 1}/4</Badge>
          <span className="font-semibold text-vyro-text">{steps[activeStep].title}:</span>
          <span className="text-vyro-muted">{steps[activeStep].desc}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-vyro-subtle">
          <span>Click any agent to inspect parameters</span>
        </div>
      </div>
    </div>
  );
};
