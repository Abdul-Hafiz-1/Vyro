/**
 * VYRO Integer-Cents Money Engine & Multi-Format Currency Parser
 *
 * All negotiation arithmetic uses integer cents internally to avoid floating-point drift.
 * Handles "$1,750", "1750", "1750.50", "1.750,00" (EU format), "1,750.00", numbers, etc.
 */

export type FlexibilityTier = 'strict' | 'flexible' | 'very_flexible';

export const FLEXIBILITY_PCT: Record<FlexibilityTier, number> = {
  strict: 0.0,
  flexible: 0.10,
  very_flexible: 0.20,
};

/**
 * Parses a numeric or string monetary input into integer cents.
 * Returns null if invalid, negative, NaN, or unparseable.
 */
export function parseMoneyToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }

  let raw = String(input).trim();
  if (!raw) return null;

  // Reject negative numbers explicitly
  if (raw.startsWith('-') || raw.includes('(-')) return null;

  // Strip currency symbols and spaces
  raw = raw.replace(/[$€£¥USD\s]/gi, '');
  if (!raw) return null;

  // Must only contain digits, dots, commas
  if (!/^[0-9.,]+$/.test(raw)) return null;

  const dotCount = (raw.match(/\./g) || []).length;
  const commaCount = (raw.match(/,/g) || []).length;

  let normalized = raw;

  if (dotCount > 0 && commaCount > 0) {
    const lastDot = raw.lastIndexOf('.');
    const lastComma = raw.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European format: "1.750,00" -> remove dots, comma to dot
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: "1,750.50" -> remove commas
      normalized = raw.replace(/,/g, '');
    }
  } else if (commaCount > 0) {
    // Only commas: either "1,750" (thousands) or "175,50" (decimal)
    if (commaCount === 1) {
      const parts = raw.split(',');
      if (parts[1].length === 2 || parts[1].length === 1) {
        normalized = raw.replace(',', '.');
      } else if (parts[1].length === 3 && parts[0].length >= 1) {
        normalized = raw.replace(/,/g, '');
      } else {
        return null;
      }
    } else {
      // Multiple commas like "1,250,000" -> verify groups of 3
      const parts = raw.split(',');
      const validGroups = parts.slice(1).every(p => p.length === 3);
      if (!validGroups) return null;
      normalized = raw.replace(/,/g, '');
    }
  } else if (dotCount > 1) {
    // Multiple dots like "1.250.000" -> thousands separators
    const parts = raw.split('.');
    const validGroups = parts.slice(1).every(p => p.length === 3);
    if (!validGroups) return null;
    normalized = raw.replace(/\./g, '');
  } else if (dotCount === 1) {
    const parts = raw.split('.');
    // Wait: "1.750" vs "1.75"
    // If 3 digits after single dot and prefix >= 1 digit (unless small like 0.xxx), treat standard decimal unless >2 digits?
    // Actually standard JSON/US strings rarely use "1.750" as 1750 without trailing ",00", wait: handle standard decimal for single dot unless exact 3 zeros not preceded by 0.
    if (parts[1].length > 2 && parts[1].length === 3 && parts[0] !== '0' && Number(parts[0]) >= 1 && parts[1] === '000') {
      normalized = raw.replace('.', '');
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100);
}

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function formatCents(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = abs % 100 === 0;
  const val = abs / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(val);
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Computes natural-number rounded cents:
 * - Above $100 (>= 10000c): snaps to $5 increments (500c), unless snapping collapses to minStep
 * - Below $100 (< 10000c): snaps to $1 increments (100c)
 */
export function roundNaturalCents(cents: number, allowFineDollar: boolean = false): number {
  const clean = Math.max(100, Math.round(cents));
  if (allowFineDollar || clean < 10000) {
    return Math.round(clean / 100) * 100;
  }
  return Math.round(clean / 500) * 500;
}

export function computeBuyerHardCapCents(budgetCents: number, flexibility: FlexibilityTier = 'flexible'): number {
  const pct = FLEXIBILITY_PCT[flexibility] ?? 0.10;
  return Math.round(budgetCents * (1 + pct));
}

export function computeSellerAbsoluteMinCents(standardLowestCents: number, flexibility: FlexibilityTier = 'flexible'): number {
  const pct = FLEXIBILITY_PCT[flexibility] ?? 0.10;
  return Math.round(standardLowestCents * (1 - pct));
}

export function computeFeeAndPayoutCents(grossCents: number, feePercent: number = 5): {
  grossCents: number;
  feeCents: number;
  payoutCents: number;
} {
  const cleanGross = Math.max(0, Math.round(grossCents));
  const cleanRate = Math.max(0, Math.min(30, feePercent));
  const feeCents = Math.round((cleanGross * cleanRate) / 100);
  const payoutCents = Math.max(0, cleanGross - feeCents);
  return {
    grossCents: cleanGross,
    feeCents,
    payoutCents,
  };
}
