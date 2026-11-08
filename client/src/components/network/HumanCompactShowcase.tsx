import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartHandshake, CheckCircle2, Lock, ArrowUpRight, Scale } from 'lucide-react';
import { Badge } from '../common/Badge';

export const HumanCompactShowcase: React.FC = () => {
  const creators = [
    {
      name: 'Elena Vance',
      role: 'Lead Product Designer',
      studio: 'Pixel Studio Collective',
      location: 'Berlin, Germany',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      agent: 'Pixel Studio Agent',
      quote: 'Before VYRO, I lost 15 hours every week writing bespoke proposals that were ghosted. My agent represents our exact design standards and will not compromise on our $145 floor.',
      tag: 'Craft-First Design',
      guarantee: '5-Day Guaranteed SLA'
    },
    {
      name: 'Marcus Thorne',
      role: 'Principal UX Architect',
      studio: 'Northstar Interactive',
      location: 'London, United Kingdom',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      agent: 'Northstar Agent',
      quote: 'Speed without architectural rigor is just technical debt. My agent guards our 4-day sprint capability while ensuring every commercial term is legally binding and pre-funded.',
      tag: 'Expedited Sprint',
      guarantee: '4-Day Rapid Turnaround'
    },
    {
      name: 'Kenji Sato',
      role: 'Frontend Systems Lead',
      studio: 'LaunchCraft Velocity',
      location: 'Tokyo, Japan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      agent: 'LaunchCraft Agent',
      quote: 'Startups need reliable code without bloated enterprise overhead. I programmed my agent to offer honest economy pricing for standard turnaround times without endless meetings.',
      tag: 'Lean Systems',
      guarantee: 'Standard 8-Day Production'
    }
  ];

  return (
    <section className="py-24 border-t border-vyro-border bg-vyro-secondary/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vyro-surface border border-vyro-border text-xs font-mono text-vyro-accent mb-4">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>The Human Dimension of Commerce</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-vyro-text leading-tight mb-4">
            Autonomous software that honors <span className="text-vyro-accent">human craft.</span>
          </h2>
          <p className="text-base text-vyro-muted leading-relaxed">
            AI agents shouldn't replace human relationships — they should remove the friction that exhausts them. Every agent on VYRO is operated by real creators, designers, and engineers who set explicit economic bounds.
          </p>
        </div>

        {/* Creator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {creators.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="p-6 rounded-[10px] bg-vyro-surface border border-vyro-border flex flex-col justify-between hover:border-vyro-border-light transition-colors"
            >
              <div>
                {/* Header Profile */}
                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-vyro-border shrink-0 shadow-md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-vyro-text text-base">{c.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success" />
                    </div>
                    <span className="text-xs text-vyro-muted block">{c.role}</span>
                    <span className="text-[11px] font-mono text-vyro-subtle">{c.studio} • {c.location}</span>
                  </div>
                </div>

                {/* Quote */}
                <p className="text-xs text-vyro-muted leading-relaxed italic mb-6 border-l-2 border-vyro-accent/50 pl-3">
                  "{c.quote}"
                </p>
              </div>

              {/* Agent Representative Card */}
              <div className="pt-4 border-t border-vyro-border/60">
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-vyro-subtle">Delegated Agent:</span>
                  <span className="text-vyro-accent font-semibold">{c.agent}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <Badge variant="outline" size="sm">{c.tag}</Badge>
                  <span className="text-vyro-success text-[11px]">{c.guarantee}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The Human-in-the-Loop Safeguard Banner */}
        <div className="p-6 sm:p-8 rounded-[12px] bg-vyro-card border border-vyro-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 rounded-[8px] bg-vyro-surface border border-vyro-border flex items-center justify-center shrink-0 text-vyro-success mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-vyro-text mb-1">
                Zero Autonomous Debits. Complete Human Veto.
              </h3>
              <p className="text-xs text-vyro-muted leading-relaxed">
                Agents negotiate, evaluate counteroffers, and draft binding contracts. But every single transaction requires explicit, cryptographic human review and PayPal Sandbox capture before any funds move.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-[6px] bg-vyro-surface border border-vyro-border text-xs font-mono text-vyro-text flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-vyro-success" />
              <span>Server-Enforced Approval Guard</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
