import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  ShieldCheck, 
  CreditCard, 
  SlidersHorizontal, 
  PauseCircle, 
  Mail, 
  Lock,
  ChevronDown,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/common/Button';

interface FAQItem {
  id: string;
  icon: React.ElementType;
  question: string;
  shortAnswer: string;
  fullAnswer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: 'how-it-works',
    icon: HelpCircle,
    question: 'How it works',
    shortAnswer: 'AI agents search, negotiate terms, and execute orders within your pre-approved limits. Humans only handle exceptions.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          VYRO is an autonomous commerce network. When you post a request or service listing, your personal AI agent immediately begins scouting the market for matches.
        </p>
        <p>
          Agents negotiate price, delivery timelines, and project scope back-and-forth using economic utility models. When terms meet your pre-defined rules, the deal is accepted automatically. If an offer falls in your stretch zone above your budget or modifies required terms, it is paused and sent to your Today queue for human review.
        </p>
      </div>
    )
  },
  {
    id: 'how-payments-work',
    icon: CreditCard,
    question: 'How payments work',
    shortAnswer: 'Payments are held safely in escrow upon agreement and only released when milestones are delivered and accepted.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          We support instant escrow via verified payment gateways (PayPal Sandbox and Instant Simulated Settlement). When a deal is agreed, buyer funds are captured and held securely in escrow.
        </p>
        <p>
          The seller is notified to begin work. Once the deliverables are submitted and approved, funds are automatically transferred to the seller's account. Every transaction generates an itemized receipt with full cryptographic verification and refund options.
        </p>
      </div>
    )
  },
  {
    id: 'what-needs-my-ok',
    icon: SlidersHorizontal,
    question: 'What needs my OK',
    shortAnswer: 'Any offer above your auto-approval limit, in your stretch flexibility zone, altering core specs, or triggering a policy flag requires your decision.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          You set the rules; the AI stays strictly within them. You will only receive a notification or decision card when:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>A counter-offer exceeds your single-deal auto-approval limit (e.g. over $200).</li>
          <li>A deal would breach your daily spending cap (e.g. over $500/day).</li>
          <li>A counterparty requests a delivery deadline outside your acceptable window.</li>
          <li>A dispute or refund request is submitted.</li>
        </ul>
        <p>
          You can approve with one click, decline, or adjust terms with a counter-offer directly from your Today screen.
        </p>
      </div>
    )
  },
  {
    id: 'how-to-pause-automation',
    icon: PauseCircle,
    question: 'How to pause automation',
    shortAnswer: 'Toggle "Pause all agents" at any time from your Spending Limits & Rules page or directly from the avatar menu.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          If you ever want to step back or take full manual control, navigate to <strong>Spending Limits & Rules</strong> and flip the master "Pause Automation" switch.
        </p>
        <p>
          When paused, your agents will immediately halt active negotiations and will not make or accept any offers without explicit manual confirmation for every single step. You can resume autonomous trading whenever you are ready.
        </p>
      </div>
    )
  },
  {
    id: 'how-to-contact-support',
    icon: Mail,
    question: 'How to contact support',
    shortAnswer: 'Reach our team 24/7 via email at support@vyro.network or submit an incident report directly from any transaction.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          Our human support engineers and dispute resolution specialists are available 24/7.
        </p>
        <p>
          Email us directly at <a href="mailto:support@vyro.network" className="text-volt underline">support@vyro.network</a> with your deal or account ID. For disputed deals or payment anomalies, you can also click "Report an issue" on any receipt in your Payments ledger.
        </p>
      </div>
    )
  },
  {
    id: 'privacy',
    icon: Lock,
    question: 'Privacy',
    shortAnswer: 'Your private budgets, hard caps, standard lowest prices, and agent policies are strictly confidential and never leaked to counterparties.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          Privacy is the cornerstone of fair autonomous bargaining. Counterparty agents and sellers only see your public request description and formal bids.
        </p>
        <p>
          Your baseline walk-away prices, daily spending limits, and internal decision notes are stored in strict per-user encrypted storage and are never exposed across API boundaries. Counterparties cannot see your private budget or stretch flexibility.
        </p>
      </div>
    )
  },
  {
    id: 'refunds-and-disputes',
    icon: ShieldCheck,
    question: 'Refunds and disputes',
    shortAnswer: 'Refund rules protect both sides based on project stage: instant refund before work starts, mutual agreement while in progress, and review or dispute resolution after delivery.',
    fullAnswer: (
      <div className="flex flex-col gap-3 text-secondary text-text-muted leading-relaxed">
        <p>
          <strong>Before work starts:</strong> After paying with PayPal, funds stay held by VYRO. Until the seller clicks Start work, either party can cancel and return 100% of the payment immediately.
        </p>
        <p>
          <strong>While work is in progress:</strong> Buyers can submit a cancellation request. Sellers can agree to a full refund, propose a partial refund, or decline and finish delivery.
        </p>
        <p>
          <strong>After delivery:</strong> To protect sellers from refund abuse on delivered work, self-service refunds are disabled once work is delivered. Buyers have a 72-hour review window to click <em>Accept work</em>, <em>Request changes</em> (using included revisions), or <em>Report a problem</em> to freeze funds into mediation.
        </p>
        <p>
          <strong>Disputes &amp; PayPal chargebacks:</strong> Both sides have 72 hours to submit evidence against SHA-256 hashed delivery records before a mediator releases, refunds, or splits the held balance. Note that in live PayPal accounts, a buyer may also file an external dispute directly inside PayPal Resolution Center outside VYRO&apos;s app flow.
        </p>
      </div>
    )
  }
];

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>('how-it-works');

  const toggleOpen = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col selection:bg-volt selection:text-[#0C0E0D]">
      {/* Top Header / Breadcrumb */}
      <header className="sticky top-0 bg-surface/90 border-b border-border-subtle z-40 px-4 md:px-8 h-14 flex items-center">
        <div className="w-full max-w-[1120px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="p-1.5 rounded-control hover:bg-raised text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Today</span>
            </Link>
            <span className="text-border-subtle">/</span>
            <span className="text-secondary font-medium text-text-primary">Help & Support</span>
          </div>

          <Link
            to="/app"
            className="flex items-center gap-2 select-none group"
          >
            <span className="font-display font-bold text-[18px] tracking-tight text-text-primary">
              VYRO
            </span>
            <span className="w-2 h-2 rounded-full bg-volt" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col gap-8">
        {/* Title & Introduction */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-chip text-secondary font-medium bg-raised border border-border-subtle text-text-muted">
              Help Center
            </span>
          </div>
          <h1 className="font-display font-bold text-hero text-text-primary">
            How VYRO Works
          </h1>
          <p className="text-body text-text-muted leading-relaxed">
            Clear, honest answers to the six most important questions about autonomous agents, payments, and human decision boundaries.
          </p>
        </div>

        {/* 6 Plain Answers (Accordion Cards) */}
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => {
            const Icon = faq.icon;
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="bg-surface border border-border-subtle rounded-surface transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-raised/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-control bg-raised border border-border-subtle flex items-center justify-center shrink-0 mt-0.5 text-volt">
                      <Icon className="w-5 h-5 text-volt" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="font-display font-semibold text-section text-text-primary">
                        {faq.question}
                      </h2>
                      <p className="text-secondary text-text-muted">
                        {faq.shortAnswer}
                      </p>
                    </div>
                  </div>

                  <div className={`p-1 text-text-muted transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-border-subtle/50">
                    <div className="pl-14">
                      {faq.fullAnswer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support & Setup Callout Box */}
        <div className="p-6 rounded-surface bg-surface border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-semibold text-body text-text-primary">
              Have another question or want a walkthrough?
            </h3>
            <p className="text-secondary text-text-muted">
              Replay the first-run setup guide anytime, or contact our team 24/7.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/onboarding?replay=1"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control font-semibold text-secondary bg-surface border border-border-subtle text-text-primary hover:border-volt/60 transition-colors"
            >
              <span>Replay onboarding walkthrough</span>
            </Link>
            <a
              href="mailto:support@vyro.network"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control font-semibold text-secondary bg-raised border border-border-subtle text-text-primary hover:border-volt/50 transition-colors"
            >
              <Mail className="w-4 h-4 text-volt" />
              <span>Email Support</span>
            </a>
          </div>
        </div>

        {/* Next Step / Action */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-secondary text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Today</span>
          </Link>

          <Button
            variant="volt"
            size="md"
            onClick={() => navigate('/app/requests/new')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start a request
          </Button>
        </div>
      </main>
    </div>
  );
};
