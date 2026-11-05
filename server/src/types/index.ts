export type AgentType = 'buyer' | 'seller';
export type AgentStatus = 'active' | 'paused';
export type VerificationStatus = 'verified' | 'community';
export type NegotiationStrategy = 'balanced' | 'aggressive_cost' | 'quality_first' | 'expedited';
export type ApprovalPolicy = 'explicit_human_required';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  startingPrice: number;
  minPrice: number;
  deliveryDays: number;
  includedDeliverables: string[];
}

export interface PricingConstraints {
  defaultBudget?: number;
  maxBudget?: number;
  startingPrice?: number;
  minAcceptablePrice?: number;
  flexibilityPercent?: number; // e.g. 15 = up to 15% discount
}

export interface Agent {
  id: string;
  ownerId: string;
  businessName: string;
  name: string;
  type: AgentType;
  description: string;
  category: string;
  capabilities: string[];
  status: AgentStatus;
  verificationStatus: VerificationStatus;
  catalog: ServiceCatalogItem[];
  pricingConstraints: PricingConstraints;
  negotiationStrategy: NegotiationStrategy;
  approvalPolicy: ApprovalPolicy;
  isDemo?: boolean;
  avatarSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommerceRequest {
  id: string;
  userId: string;
  buyerAgentId: string;
  rawInput: string;
  title: string;
  category: string;
  requiredCapabilities: string[];
  deliverables: string[];
  maxBudget: number;
  currency: string;
  deadlineDays: number;
  qualityRequirements: string;
  additionalConditions?: string;
  status: 'draft' | 'analyzed' | 'active' | 'negotiating' | 'agreement_reached' | 'completed' | 'cancelled';
  selectedSellerAgentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 
  | 'request'
  | 'discovery_result'
  | 'proposal'
  | 'counteroffer'
  | 'acceptance'
  | 'rejection'
  | 'clarification'
  | 'system_event';

export interface ToolCallTrace {
  name: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  timestamp: string;
}

export interface NegotiationMessage {
  id: string;
  negotiationId: string;
  senderAgentId: string;
  recipientAgentId: string;
  senderRole: 'buyer' | 'seller' | 'evaluator' | 'system';
  round: number;
  messageType: MessageType;
  content: string;
  payload?: Record<string, any>;
  toolCalls?: ToolCallTrace[];
  timestamp: string;
}

export interface Proposal {
  id: string;
  negotiationId: string;
  senderAgentId: string;
  round: number;
  price: number;
  currency: string;
  deliverables: string[];
  deliveryDays: number;
  terms: string;
  validUntil: string;
  status: 'pending' | 'accepted' | 'countered' | 'rejected' | 'superseded';
  createdAt: string;
}

export interface Negotiation {
  id: string;
  requestId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  status: 'initiated' | 'in_negotiation' | 'agreement_reached' | 'rejected' | 'expired' | 'completed';
  currentRound: number;
  maxRounds: number;
  currentProposal: Proposal | null;
  messages: NegotiationMessage[];
  agreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationScore {
  overall: number; // 0 - 100
  priceScore: number; // 0 - 100
  capabilityScore: number; // 0 - 100
  deliveryScore: number; // 0 - 100
  riskScore: number; // 0 - 100 (100 = lowest risk)
}

export interface ProposalEvaluation {
  id: string;
  negotiationId: string;
  sellerAgentId: string;
  sellerBusinessName: string;
  proposalPrice: number;
  deliveryDays: number;
  score: EvaluationScore;
  strengths: string[];
  weaknesses: string[];
  missingDeliverables: string[];
  riskFactors: string[];
  verdict: 'recommended' | 'acceptable' | 'unfavorable' | 'disqualified';
  explanation: string;
  timestamp: string;
}

export interface MultiProposalComparison {
  requestId: string;
  evaluations: ProposalEvaluation[];
  recommendedNegotiationId: string;
  summaryVerdict: string;
  evaluatedAt: string;
}

export interface Agreement {
  id: string;
  negotiationId: string;
  requestId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  buyerUserId: string;
  sellerBusinessName: string;
  finalPrice: number;
  currency: string;
  finalDeliverables: string[];
  deliveryDays: number;
  commercialTerms: string;
  humanApprovalStatus: 'pending' | 'approved' | 'rejected';
  humanApprovedAt?: string;
  rejectionReason?: string;
  paypalReady: boolean;
  createdAt: string;
}

export type PaymentStatus = 
  | 'awaiting_approval'
  | 'awaiting_paypal'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Transaction {
  id: string;
  agreementId: string;
  negotiationId: string;
  requestId: string;
  buyerUserId: string;
  buyerAgentName: string;
  sellerAgentId: string;
  sellerBusinessName: string;
  serviceTitle: string;
  amount: number;
  currency: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalPayerEmail?: string;
  paypalPayerName?: string;
  paymentStatus: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  isSandbox: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 
    | 'request_created'
    | 'agent_discovered'
    | 'negotiation_started'
    | 'proposal_submitted'
    | 'counteroffer_made'
    | 'agreement_reached'
    | 'approval_requested'
    | 'approval_granted'
    | 'paypal_order_created'
    | 'paypal_payment_completed'
    | 'payment_failed';
  title: string;
  description: string;
  agentId?: string;
  negotiationId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface NetworkStats {
  activeAgents: number;
  totalAgents: number;
  activeNegotiations: number;
  agreementsReached: number;
  completedTransactions: number;
  totalTransactionVolume: number;
  averageTransactionValue: number;
  averageNegotiationRounds: number;
  successRatePercentage: number;
  isSimulatedDataIncluded: boolean;
}
