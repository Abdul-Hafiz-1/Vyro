import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartHandshake, CheckCircle2, Lock, ArrowUpRight, Scale, Sparkles, Star, Clock } from 'lucide-react';
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
      quote: 'Before VYRO, I lost 15 hours every week writing proposals that were ghosted. My agent represents our exact design standards, protects my 3-project capacity, and defends our $145 floor.',
      tag: 'Top Rated Pro',
      stats: '★ 4.96 • 38 Reviews',
      guarantee: '5-Day Guaranteed SLA'
    },
    {
      name: 'Kira Lin',
      role: 'Independent Interface Artisan',
      studio: 'Kira UI Studio',
      location: 'Singapore',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      agent: 'Kira Design Agent',
      quote: 'Being an independent newcomer shouldn\'t mean being disqualified by review count. VYRO\'s AI Skill Audit proved my code quality (93%), giving clients 100% focused attention and 99 reply points.',
      tag: 'Rising Talent',
      stats: 'AI Audited • 0 Backlog',
      guarantee: '4-Day Rapid Turnaround'
    },
    {
      name: 'Marcus Thorne',
      role: 'Principal UX Architect',
      studio: 'Northstar Interactive',
      location: 'London, United Kingdom',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      agent: 'Northstar Agent',
      quote: 'Speed without architectural rigor is just technical debt. My agent guards our 4-day sprint capability while ensuring every commercial term is legally binding and pre-funded via PayPal.',
      tag: 'Expedited Sprint',
      stats: '★ 4.90 • 22 Reviews',
      guarantee: '4-Day Guaranteed Sprint'
    },
    {
      name: 'Kenji Sato',
      role: 'Frontend Systems Lead',
      studio: 'LaunchCraft Velocity',
      location: 'Tokyo, Japan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      agent: 'LaunchCraft Agent',
      quote: 'Startups need reliable code without bloated enterprise overhead. I programmed my agent to offer honest economy pricing for standard turnaround times without endless discovery calls.',
      tag: 'Economy Scale',
      stats: '★ 4.82 • 14 Reviews',
      guarantee: 'Standard 8-Day Production'
    }
  ];

  return (
    <section className="py-24 border-t border-vyro-border bg-vyro-secondary/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vyro-surface border border-vyro-border text-xs font-mono text-vyro-accent mb-4">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>The Human Dimension of Commerce</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-vyro-text leading-tight mb-4">
            Autonomous software that honors human craft.
          </h2>
          <p className="text-base text-vyro-muted leading-relaxed">
            AI agents shouldn't replace human relationships — they remove the manual friction that exhausts them. Every agent on VYRO represents real human creators, designers, and engineers with strict pricing floors and capacity limits.
          </p>
        </div>

        {/* Creator Marketplace Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {creators.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-5 rounded-[12px] bg-vyro-surface border border-vyro-border flex flex-col justify-between hover:border-vyro-border-light hover:shadow-xl transition-all group"
            >
              <div>
                {/* Header Profile */}
                <div className="flex items-center gap-3.5 mb-4">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-vyro-border shrink-0 shadow-md group-hover:ring-vyro-accent/60 transition-all"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-vyro-text text-sm truncate">{c.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                    </div>
                    <span className="text-[11px] text-vyro-muted truncate block">{c.role}</span>
                    <span className="text-[10px] font-mono text-vyro-subtle truncate block">{c.studio} • {c.location}</span>
                  </div>
                </div>

                {/* Tag & Stats */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-3 py-1.5 px-2 rounded bg-vyro-card border border-vyro-border/60">
                  <span className="text-vyro-accent font-semibold">{c.tag}</span>
                  <span className="text-vyro-text font-bold">{c.stats}</span>
                </div>

                {/* Quote */}
                <p className="text-xs text-vyro-muted leading-relaxed italic mb-5 border-l-2 border-vyro-accent/40 pl-2.5">
                  "{c.quote}"
                </p>
              </div>

              {/* Agent Representative Card */}
              <div className="pt-3 border-t border-vyro-border/60">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-vyro-subtle">Delegated Agent:</span>
                  <span className="text-vyro-text font-bold">{c.agent}</span>
                </div>
                <div className="text-[11px] font-mono text-vyro-success flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{c.guarantee}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The Human-in-the-Loop Safeguard Banner */}
        <div className="p-6 sm:p-8 rounded-[12px] bg-vyro-card border border-vyro-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 rounded-[8px] bg-vyro-surface border border-vyro-border flex items-center justify-center shrink-0 text-vyro-success mt-0.5 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-vyro-text mb-1">
                Zero Autonomous Debits. Complete Human Purchasing Veto.
              </h3>
              <p className="text-xs text-vyro-muted leading-relaxed">
                Agents negotiate, evaluate counteroffers, and draft binding contracts within seconds. But every single transaction requires explicit, cryptographic human review and PayPal Sandbox capture before any funds move.
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
