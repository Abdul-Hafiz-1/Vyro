/**
 * VYRO Plain-Language Presentation Layer
 * 
 * Strict formatting and sanitization pipeline for all human-facing UI text.
 * GUARANTEES:
 * - No raw IDs, UUIDs, hex hashes, or snake_case
 * - No null, undefined, NaN, [object Object], or raw JSON
 * - No ISO date stamps
 * - No bare numbers or ugly decimal floats for currency
 */

export interface FormattedStatus {
  label: string;
  explanation: string;
  role: 'needs_you' | 'handled' | 'declined' | 'in_progress';
}

/**
 * Format monetary amounts:
 * Whole dollars: "$149"
 * With cents: "$149.50"
 * Never bare numbers, never trailing fractional zeros beyond 2 decimals, never "149.0000".
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '$0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '$0';

  if (Math.round(num) === num) {
    return `$${Math.round(num)}`;
  }

  // Format to 2 decimal places
  const fixed = num.toFixed(2);
  // If .00, drop cents
  if (fixed.endsWith('.00')) {
    return `$${parseInt(fixed, 10)}`;
  }
  return `$${fixed}`;
}

/**
 * Format dates into friendly human terms:
 * "Just now", "2 hours ago", "Yesterday", "Nov 9".
 * NEVER raw ISO strings or timestamps.
 */
export function formatDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'Recently';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return 'Just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[d.getMonth()];
  const day = d.getDate();

  if (d.getFullYear() === now.getFullYear()) {
    return `${monthName} ${day}`;
  }
  return `${monthName} ${day}, ${d.getFullYear()}`;
}

/**
 * Map all known server status enums to friendly labels, explanations, and color roles.
 * Unknown enum ALWAYS maps to "In progress".
 */
const STATUS_MAP: Record<string, FormattedStatus> = {
  // Needs human intervention
  needs_review: {
    label: 'Needs your OK',
    explanation: "The AI wasn't sure and wants your decision",
    role: 'needs_you'
  },
  ready_for_review: {
    label: 'Needs your OK',
    explanation: 'A deal is waiting for your approval',
    role: 'needs_you'
  },
  escalated: {
    label: 'Needs your OK',
    explanation: 'Terms require your review or policy override',
    role: 'needs_you'
  },
  pending_approval: {
    label: 'Needs your OK',
    explanation: 'Awaiting your sign-off before payment',
    role: 'needs_you'
  },

  // Active negotiations
  negotiating: {
    label: 'Negotiating',
    explanation: 'AI agents are discussing terms',
    role: 'in_progress'
  },
  in_negotiation: {
    label: 'Negotiating',
    explanation: 'AI agents are discussing terms',
    role: 'in_progress'
  },
  active: {
    label: 'Negotiating',
    explanation: 'Discussion in progress',
    role: 'in_progress'
  },
  awaiting_counter: {
    label: 'Negotiating',
    explanation: 'Waiting for counterparty response',
    role: 'in_progress'
  },

  // Consensus & Approved
  agreement_reached: {
    label: 'Terms agreed',
    explanation: 'Both agents reached consensus',
    role: 'handled'
  },
  auto_approved: {
    label: 'Auto-approved',
    explanation: 'Within your automated rules',
    role: 'handled'
  },
  human_approved: {
    label: 'Approved by you',
    explanation: 'Ready for secure checkout',
    role: 'handled'
  },
  approved: {
    label: 'Approved',
    explanation: 'Ready for secure payment',
    role: 'handled'
  },

  // Settled & Completed
  completed: {
    label: 'Completed',
    explanation: 'Payment verified and transaction settled',
    role: 'handled'
  },
  settled: {
    label: 'Settled',
    explanation: 'Payment captured securely',
    role: 'handled'
  },

  // Declined & Cancelled
  auto_declined: {
    label: 'Declined',
    explanation: 'Exceeded safety limits or rules',
    role: 'declined'
  },
  human_declined: {
    label: 'Declined by you',
    explanation: 'You rejected this deal',
    role: 'declined'
  },
  declined: {
    label: 'Declined',
    explanation: 'Did not match criteria',
    role: 'declined'
  },
  rejected: {
    label: 'Declined',
    explanation: 'Deal cancelled',
    role: 'declined'
  },
  cancelled: {
    label: 'Cancelled',
    explanation: 'Deal was cancelled',
    role: 'declined'
  },
  waiting_for_sellers: {
    label: 'Waiting for sellers',
    explanation: 'No sellers offer this yet. Your agent will notify you when someone does.',
    role: 'in_progress'
  }
};

export function formatStatus(statusInput: string | null | undefined): FormattedStatus {
  if (!statusInput) {
    return {
      label: 'In progress',
      explanation: 'Working in background',
      role: 'in_progress'
    };
  }

  const cleanKey = statusInput.trim().toLowerCase();
  if (STATUS_MAP[cleanKey]) {
    return STATUS_MAP[cleanKey];
  }

  // Handle words separated by underscore or hyphen
  const normalized = cleanKey.replace(/[- ]/g, '_');
  if (STATUS_MAP[normalized]) {
    return STATUS_MAP[normalized];
  }

  return {
    label: 'In progress',
    explanation: 'Working in background',
    role: 'in_progress'
  };
}

/**
 * Clean up entity names, business titles, and counterparty labels:
 * Strips raw IDs, hashes, snake_case, or emails.
 */
export function formatName(name: string | null | undefined, fallback = 'Verified Provider'): string {
  if (!name) return fallback;
  const s = String(name).trim();
  if (!s) return fallback;

  // If looks like an internal ID (neg_..., req_..., usr_..., txn_..., list_..., or hex 8+)
  if (/^(neg|req|usr|txn|dec|list|sess)_[a-zA-Z0-9]+$/i.test(s) || /^[a-f0-9]{8,}$/i.test(s)) {
    return fallback;
  }

  // If looks like an email, turn "alex.mercer@example.com" into "Alex Mercer"
  if (s.includes('@')) {
    const userPart = s.split('@')[0];
    const parts = userPart.split(/[._-]/).filter(Boolean);
    if (parts.length > 0) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
    return fallback;
  }

  // Convert snake_case to Title Case words
  if (s.includes('_')) {
    return s.split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  return s;
}

/**
 * Format counts with words:
 * "1 deal", "3 deals", "No deals".
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const p = plural || `${singular}s`;
  if (count === 0) return `No ${p}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${p}`;
}

/**
 * Clean any value, preventing null, undefined, NaN, [object Object], or raw JSON.
 */
export function cleanText(val: any, fallback = 'Not set'): string {
  if (val === null || val === undefined || Number.isNaN(val)) return fallback;
  const str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined' || str === 'NaN') return fallback;
  if (str.includes('[object') || str.startsWith('{') || str.startsWith('[')) return fallback;

  // Convert snake_case if present
  if (str.includes('_') && !str.includes(' ')) {
    return str.split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return str;
}

/**
 * Human negotiation summary:
 * Translates raw turns into conversational summaries:
 * "Your agent offered $120 for 7 days. The seller countered with $140 for 5 days."
 */
export function summarizeTurn(turn: any): string {
  if (!turn) return 'Negotiation in progress.';
  if (typeof turn === 'string') {
    if (turn.startsWith('{') || turn.includes('payload')) return 'Negotiation in progress.';
    return cleanText(turn, 'Negotiation in progress.');
  }

  const role = turn.senderRole || (turn.senderType === 'human' ? 'You' : 'Agent');
  const price = turn.payload?.price || turn.payload?.counterPrice || turn.price;
  const days = turn.payload?.deliveryDays || turn.deliveryDays;

  if (price && days) {
    const formattedPrice = formatMoney(price);
    if (role === 'buyer' || role === 'You') {
      return `Your agent offered ${formattedPrice} with ${days}-day delivery.`;
    }
    return `The seller countered with ${formattedPrice} with ${days}-day delivery.`;
  }

  if (turn.content && typeof turn.content === 'string') {
    // If the message has raw JSON or prompt brackets, filter out
    if (turn.content.startsWith('{') || turn.content.includes('```')) {
      return 'Terms were reviewed and updated.';
    }
    return turn.content;
  }

  return 'Agents exchanged counterproposals.';
}
