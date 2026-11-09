export type PaymentTerm = 'upfront' | 'escrow_milestone' | 'net_30';

export interface ScopeItem {
  id: string;
  name: string;
  priority: 'must-have' | 'nice-to-have';
  estimatedHours?: number;
}

export interface IssueWeights {
  price: number;
  time: number;
  scope: number;
  terms: number;
}

export type BuyerStrategy = 'conceder' | 'linear' | 'hard-line';
export type SellerStrategy = 'value-trader' | 'volume-seeker' | 'firm';

export interface SellerDiscounts {
  longerDeadlinePctPerDay: number; // e.g. 0.02 (2% per extra day)
  scopeReductionPctPerItem: number; // e.g. 0.08 (8% per optional scope item removed)
  repeatBuyerPct: number; // e.g. 0.05 (5% repeat discount)
  upfrontPaymentPct: number; // e.g. 0.06 (6% discount for instant upfront capture)
  bundlePct: number; // e.g. 0.05
}

export interface SellerProfile {
  id: string;
  userId: string;
  agentId: string;
  businessName: string;
  listPrice: number;
  standardFloor: number;
  stretchPct: number; // default 0.12 (12% stretch below standard floor)
  hardFloor: number; // calculated: standardFloor * (1 - stretchPct), never below
  capacity: number; // 1 (overloaded) to 10 (wide open capacity)
  minDeliveryDays: number;
  standardDeliveryDays: number;
  rushFeePctPerDay: number; // e.g. 0.10 (10% surcharge per day under standard)
  discounts: SellerDiscounts;
  weights: IssueWeights;
  strategy: SellerStrategy;
}

export interface BuyerProfile {
  id: string;
  userId: string;
  agentId: string;
  displayName: string;
  targetPrice: number;
  maxBudget: number; // hard ceiling, never above
  idealDeliveryDays: number;
  latestDeliveryDays: number; // hard deadline
  scopeItems: ScopeItem[];
  acceptedPaymentTerms: PaymentTerm[];
  preferredPaymentTerm: PaymentTerm;
  weights: IssueWeights;
  strategy: BuyerStrategy;
  isRepeatBuyer?: boolean;
}

export interface PackageOffer {
  id: string;
  round: number;
  senderRole: 'buyer' | 'seller';
  senderAgentId: string;
  price: number;
  deliveryDays: number;
  scopeItems: string[]; // names or IDs of included deliverables
  revisions: number;
  paymentTerms: PaymentTerm;
  validUntil: string;
  tradesMade?: string[]; // e.g. ["+2 delivery days", "-1 revision", "upfront payment discount"]
  rationale?: string;
  utilityBuyer?: number;
  utilitySeller?: number;
}

export interface TradeEvaluation {
  priceDelta: number;
  timeDelta: number;
  scopeDelta: string[];
  termsChanged: boolean;
  buyerGave: string[];
  sellerGave: string[];
  summary: string;
}

export interface NegotiationResult {
  status: 'agreement_reached' | 'rejected' | 'in_negotiation';
  finalPackage?: PackageOffer;
  rejectionReason?: string;
  roundsTaken: number;
  softFloorReached: boolean;
  tradesSummary: string[];
  history: PackageOffer[];
}
