// Core Type Definitions for VYRO Autonomous AI Commerce Network

export type UserCapability = 'buying' | 'selling';
export type WorkspaceType = 'buyer' | 'seller' | 'studio';

export interface UserCapabilities {
  buying: boolean;
  selling: boolean;
}

export interface BuyerPreferences {
  generalInterests: string[];
  typicalBudget: number;
  currency: string;
  preferredBrands: string[];
  qualityExpectations: string;
  communicationStyle: 'concise' | 'detailed' | 'balanced';
  negotiationStyle: 'balanced' | 'aggressive_cost' | 'quality_first' | 'expedited';
  constraints: string[];
}

export interface SellerProfile {
  businessName: string;
  headline: string;
  description: string;
  categories: string[];
  location: string;
  serviceCoverage: string;
  availabilityStatus: 'immediate' | 'queue' | 'busy';
  maxConcurrentProjects: number;
  activeProjects: number;
  rating: number;
  reviewCount: number;
  replyPoints: number;
  avgResponseTime: string;
  verifiedAt?: string;
}

export interface User {
  id: string; // UID
  email: string;
  passwordHash?: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  language?: string;
  capabilities: UserCapabilities;
  activeWorkspace: WorkspaceType;
  onboardingCompleted: boolean;
  onboardingStep: number;
  buyerPreferences?: BuyerPreferences;
  sellerProfile?: SellerProfile;
  autoApprovalLimit?: number;
  dailyBudgetCap?: number;
  balance?: number;
  isAutomationPaused?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export type DecisionStatus =
  | 'auto_approved'
  | 'needs_review'
  | 'auto_declined'
  | 'human_approved'
  | 'human_declined'
  | 'expired';

export type DecisionEntityType = 'deal' | 'payment' | 'seller_onboarding' | 'dispute';
export type DecisionDecidedBy = 'ai' | 'user' | 'rule';

export interface DecisionSignals {
  priceWithinCeiling: boolean;
  priceAboveFloor: boolean;
  sellerVerified: boolean;
  underAutoLimit: boolean;
  categoryAllowed: boolean;
  withinDailyBudget: boolean;
  automationPaused: boolean;
  redFlags: string[];
  proposedPrice: number;
  buyerMaxBudget: number;
  sellerFloorPrice: number;
  userAutoLimit: number;
  userDailyCap: number;
  todaySpend: number;
}

export interface DecisionRecord {
  id: string;
  entityType: DecisionEntityType;
  entityId: string;
  userId: string;
  status: DecisionStatus;
  reasons: string[];
  recommendation: string;
  signals: DecisionSignals;
  confidence: number;
  decidedBy: DecisionDecidedBy;
  undoUntil?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ListingCategory = 'Design' | 'Development' | 'Security' | 'Marketing' | 'Hardware' | 'Other';
export type ListingType = 'service' | 'physical_product' | 'digital_product' | 'custom_project';
export type ListingPricingModel = 'fixed' | 'hourly' | 'starting_at';
export type ListingStatus = 'active' | 'paused' | 'draft' | 'archived';

export interface Listing {
  id: string;
  sellerId: string; // User UID
  sellerUserId?: string;
  sellerAgentId?: string;
  title: string;
  description: string;
  category: ListingCategory;
  type: ListingType;
  price: number;
  currency: string;
  pricingModel: ListingPricingModel;
  minAcceptablePrice: number;
  deliveryDays: number;
  deliverables: string[];
  images: string[];
  isNegotiable: boolean;
  status: ListingStatus;
  tags: string[];
  sellerName?: string;
  sellerAvatar?: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type AgentType = 'buyer' | 'seller' | 'research' | 'specialist';
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

export interface AgentPolicies {
  minPrice?: number;
  targetPrice?: number;
  maxDiscountPercent?: number;
  deliveryConditions?: string;
  questionsToAsk?: string[];
  escalationTriggers?: string[];
}

export interface AgentMetrics {
  negotiationsHandled: number;
  dealsClosed: number;
  averageDiscountSecured: number;
  avgResponseMinutes: number;
}

export interface Agent {
  id: string;
  ownerId: string; // User UID
  userId?: string;
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
  policies?: AgentPolicies;
  negotiationStrategy: NegotiationStrategy;
  approvalPolicy: ApprovalPolicy;
  instructions?: string;
  communicationStyle?: 'concise' | 'detailed' | 'polite' | 'technical';
  enabledTools?: string[];
  metrics?: AgentMetrics;
  isDemo?: boolean;
  avatarSeed?: string;
  operatorName?: string;
  operatorRole?: string;
  operatorLocation?: string;
  operatorAvatar?: string;
  craftPhilosophy?: string;
  rating?: number;
  reviewCount?: number;
  isNewTalent?: boolean;
  activeProjects?: number;
  maxConcurrentProjects?: number;
  languages?: string[];
  replyPoints?: number;
  avgResponseTime?: string;
  aiReviewed?: boolean;
  aiSkillAudit?: {
    verifiedAt: string;
    score: number;
    strengths: string[];
    suggestedImprovements: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  userId: string; // User UID
  agentId?: string;
  type: 'preference' | 'constraint' | 'decision_rule' | 'inference';
  role: 'buyer' | 'seller';
  key: string;
  value: string;
  source: 'user_provided' | 'ai_inferred' | 'past_transaction';
  confidence: number;
  verifiedByUser: boolean;
  createdAt: string;
}

export interface CommerceRequest {
  id: string;
  userId: string; // User UID
  buyerUserId?: string;
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
  targetLanguage?: string;
  maxCandidates?: number;
  status: 'draft' | 'analyzed' | 'active' | 'negotiating' | 'agreement_reached' | 'completed' | 'cancelled' | 'waiting_for_sellers';
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
  | 'human_escalation'
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
  requiresHumanResponse?: boolean;
  humanResponded?: boolean;
  humanResponseDueAt?: string;
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
  revisions?: number;
  paymentTerms?: string;
  tradesMade?: string[];
  utilityScore?: number;
  whyThisOffer?: string;
  createdAt: string;
}

export type NegotiationStatus = 
  | 'DISCOVERY'
  | 'MATCHED'
  | 'CONTACT_INITIATED'
  | 'NEGOTIATING'
  | 'COUNTEROFFER_PENDING'
  | 'AGREEMENT_PROPOSED'
  | 'HUMAN_APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'CANCELLED'
  // Legacy aliases for backwards-compat during transition
  | 'initiated'
  | 'in_negotiation'
  | 'escalated'
  | 'agreement_reached'
  | 'completed'
  | 'rejected';

export interface Negotiation {
  id: string;
  requestId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  buyerUserId?: string;
  sellerUserId?: string;
  listingId?: string;
  status: NegotiationStatus;
  currentRound: number;
  maxRounds: number;
  currentProposal: Proposal | null;
  messages: NegotiationMessage[];
  agreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationScore {
  overall: number;
  priceScore: number;
  capabilityScore: number;
  deliveryScore: number;
  capacityScore?: number;
  responsivenessScore?: number;
  riskScore: number;
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
  sellerRating?: number;
  sellerReviewCount?: number;
  sellerActiveProjects?: number;
  sellerReplyPoints?: number;
  urgencyWeightApplied?: string;
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
  sellerUserId?: string;
  sellerBusinessName: string;
  finalPrice: number;
  currency: string;
  finalDeliverables: string[];
  deliveryDays: number;
  commercialTerms: string;
  tradesSummary?: string[];
  whatBuyerGave?: string[];
  whatSellerGave?: string[];
  paymentTerms?: string;
  revisions?: number;
  humanApprovalStatus: 'pending' | 'approved' | 'rejected';
  humanApprovedAt?: string;
  sellerAcceptanceStatus?: 'pending' | 'accepted' | 'rejected';
  sellerAcceptedAt?: string;
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
  sellerUserId?: string;
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
  sellerShareHeld?: number;
  sellerPayoutStatus?: 'held' | 'simulated_paid';
  sellerPayoutAt?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  isSandbox: boolean;
}

export interface ActivityEvent {
  id: string;
  userId?: string;
  type: 
    | 'request_created'
    | 'agent_discovered'
    | 'agent_updated'
    | 'listing_created'
    | 'listing_updated'
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

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'action_required' | 'offer_received' | 'agreement_ready' | 'payment_settled' | 'system';
  read: boolean;
  linkUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Review {
  id: string;
  transactionId: string;
  listingId?: string;
  sellerId: string;
  buyerId: string;
  rating: number; // 1 - 5
  feedback: string;
  createdAt: string;
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
