import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  CommerceRequest,
  Negotiation,
  Proposal,
  MultiProposalComparison,
  Agreement,
  Transaction,
  ActivityEvent,
  NetworkStats
} from '../types/index.js';

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface StoreData {
  agents: Record<string, Agent>;
  requests: Record<string, CommerceRequest>;
  negotiations: Record<string, Negotiation>;
  proposals: Record<string, Proposal>;
  evaluations: Record<string, MultiProposalComparison>;
  agreements: Record<string, Agreement>;
  transactions: Record<string, Transaction>;
  activityEvents: ActivityEvent[];
}

export class MemoryStore {
  private data: StoreData = {
    agents: {},
    requests: {},
    negotiations: {},
    proposals: {},
    evaluations: {},
    agreements: {},
    transactions: {},
    activityEvents: []
  };

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
    if (Object.keys(this.data.agents).length === 0) {
      this.seedDefaultData();
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to write store to disk:', err);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[Store] Loaded persisted store: ${Object.keys(this.data.agents).length} agents, ${Object.keys(this.data.negotiations).length} negotiations, ${Object.keys(this.data.transactions).length} transactions`);
      }
    } catch (err) {
      console.warn('[Store] Could not load from disk, using fresh store:', err);
    }
  }

  public resetToSeed() {
    this.data = {
      agents: {},
      requests: {},
      negotiations: {},
      proposals: {},
      evaluations: {},
      agreements: {},
      transactions: {},
      activityEvents: []
    };
    this.seedDefaultData();
    this.saveToDisk();
  }

  // --- Agents ---
  public getAgents(filter?: { type?: 'buyer' | 'seller'; category?: string; status?: 'active' | 'paused' }): Agent[] {
    let list = Object.values(this.data.agents);
    if (filter?.type) list = list.filter(a => a.type === filter.type);
    if (filter?.category && filter.category !== 'all') {
      list = list.filter(a => a.category.toLowerCase() === filter.category?.toLowerCase());
    }
    if (filter?.status) list = list.filter(a => a.status === filter.status);
    return list;
  }

  public getAgent(id: string): Agent | undefined {
    return this.data.agents[id];
  }

  public saveAgent(agent: Agent): Agent {
    agent.updatedAt = new Date().toISOString();
    this.data.agents[agent.id] = agent;
    this.saveToDisk();
    return agent;
  }

  public deleteAgent(id: string): boolean {
    if (this.data.agents[id]) {
      // Soft-delete or mark inactive to protect historical transactions
      this.data.agents[id].status = 'paused';
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Requests ---
  public getRequests(userId?: string): CommerceRequest[] {
    let list = Object.values(this.data.requests);
    if (userId) list = list.filter(r => r.userId === userId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getRequest(id: string): CommerceRequest | undefined {
    return this.data.requests[id];
  }

  public saveRequest(request: CommerceRequest): CommerceRequest {
    request.updatedAt = new Date().toISOString();
    this.data.requests[request.id] = request;
    this.saveToDisk();
    return request;
  }

  // --- Negotiations ---
  public getNegotiations(filter?: { requestId?: string; agentId?: string; status?: string }): Negotiation[] {
    let list = Object.values(this.data.negotiations);
    if (filter?.requestId) list = list.filter(n => n.requestId === filter.requestId);
    if (filter?.agentId) list = list.filter(n => n.buyerAgentId === filter.agentId || n.sellerAgentId === filter.agentId);
    if (filter?.status && filter.status !== 'all') list = list.filter(n => n.status === filter.status);
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getNegotiation(id: string): Negotiation | undefined {
    return this.data.negotiations[id];
  }

  public saveNegotiation(negotiation: Negotiation): Negotiation {
    negotiation.updatedAt = new Date().toISOString();
    this.data.negotiations[negotiation.id] = negotiation;
    this.saveToDisk();
    return negotiation;
  }

  // --- Proposals ---
  public getProposals(negotiationId: string): Proposal[] {
    return Object.values(this.data.proposals)
      .filter(p => p.negotiationId === negotiationId)
      .sort((a, b) => a.round - b.round);
  }

  public saveProposal(proposal: Proposal): Proposal {
    this.data.proposals[proposal.id] = proposal;
    this.saveToDisk();
    return proposal;
  }

  // --- Evaluations ---
  public getEvaluation(requestId: string): MultiProposalComparison | undefined {
    return this.data.evaluations[requestId];
  }

  public saveEvaluation(evaluation: MultiProposalComparison): MultiProposalComparison {
    this.data.evaluations[evaluation.requestId] = evaluation;
    this.saveToDisk();
    return evaluation;
  }

  // --- Agreements ---
  public getAgreements(): Agreement[] {
    return Object.values(this.data.agreements)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAgreement(id: string): Agreement | undefined {
    return this.data.agreements[id];
  }

  public saveAgreement(agreement: Agreement): Agreement {
    this.data.agreements[agreement.id] = agreement;
    this.saveToDisk();
    return agreement;
  }

  // --- Transactions ---
  public getTransactions(userId?: string): Transaction[] {
    let list = Object.values(this.data.transactions);
    if (userId) list = list.filter(t => t.buyerUserId === userId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTransaction(id: string): Transaction | undefined {
    return this.data.transactions[id];
  }

  public getTransactionByAgreement(agreementId: string): Transaction | undefined {
    return Object.values(this.data.transactions).find(t => t.agreementId === agreementId);
  }

  public getTransactionByPaypalOrderId(orderId: string): Transaction | undefined {
    return Object.values(this.data.transactions).find(t => t.paypalOrderId === orderId);
  }

  public saveTransaction(tx: Transaction): Transaction {
    this.data.transactions[tx.id] = tx;
    this.saveToDisk();
    return tx;
  }

  // --- Activity Events ---
  public logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
    const fullEvent: ActivityEvent = {
      ...event,
      id: `evt_${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString()
    };
    this.data.activityEvents.unshift(fullEvent);
    if (this.data.activityEvents.length > 250) {
      this.data.activityEvents = this.data.activityEvents.slice(0, 250);
    }
    this.saveToDisk();
    return fullEvent;
  }

  public getActivityEvents(limit = 30): ActivityEvent[] {
    return this.data.activityEvents.slice(0, limit);
  }

  // --- Network Stats ---
  public getNetworkStats(): NetworkStats {
    const allAgents = Object.values(this.data.agents);
    const activeAgents = allAgents.filter(a => a.status === 'active');
    const allNegotiations = Object.values(this.data.negotiations);
    const activeNegotiations = allNegotiations.filter(n => n.status === 'in_negotiation' || n.status === 'initiated');
    const agreementsReached = Object.values(this.data.agreements).length;
    const allTxs = Object.values(this.data.transactions);
    const completedTxs = allTxs.filter(t => t.paymentStatus === 'completed');

    const totalTransactionVolume = completedTxs.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionValue = completedTxs.length > 0 
      ? Math.round((totalTransactionVolume / completedTxs.length) * 100) / 100 
      : 0;

    const completedNegotiations = allNegotiations.filter(n => n.status === 'agreement_reached' || n.status === 'completed');
    const totalRounds = allNegotiations.reduce((sum, n) => sum + n.currentRound, 0);
    const averageNegotiationRounds = allNegotiations.length > 0 
      ? Math.round((totalRounds / allNegotiations.length) * 10) / 10 
      : 0;

    const successRatePercentage = allNegotiations.length > 0
      ? Math.round((completedNegotiations.length / allNegotiations.length) * 100)
      : 0;

    return {
      activeAgents: activeAgents.length,
      totalAgents: allAgents.length,
      activeNegotiations: activeNegotiations.length,
      agreementsReached,
      completedTransactions: completedTxs.length,
      totalTransactionVolume,
      averageTransactionValue,
      averageNegotiationRounds,
      successRatePercentage,
      isSimulatedDataIncluded: allTxs.some(t => t.isSandbox)
    };
  }

  // --- Seed Data ---
  private seedDefaultData() {
    console.log('[Store] Seeding initial demonstration agents and catalog...');
    const now = new Date().toISOString();

    // 1. Studio Buyer (Demonstration Buyer Agent)
    const studioBuyer: Agent = {
      id: 'agent_buyer_studio',
      ownerId: 'user_main',
      businessName: 'Apex Studio Ventures',
      name: 'Studio Buyer',
      type: 'buyer',
      description: 'Autonomous procurement agent for digital services, landing pages, and UI engineering.',
      category: 'Design',
      capabilities: ['Requirements Analysis', 'Autonomous Negotiation', 'Budget Enforcement', 'Specification Review'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [],
      pricingConstraints: {
        defaultBudget: 150,
        maxBudget: 200,
        flexibilityPercent: 10
      },
      negotiationStrategy: 'balanced',
      approvalPolicy: 'explicit_human_required',
      isDemo: true,
      avatarSeed: 'studio-buyer',
      createdAt: now,
      updatedAt: now
    };

    // 2. Seller A — Pixel Studio (Initial: $180, Min: $145, Delivery: 5d)
    const pixelStudio: Agent = {
      id: 'agent_seller_pixel',
      ownerId: 'seller_pixel_co',
      businessName: 'Pixel Studio Collective',
      name: 'Pixel Studio Agent',
      type: 'seller',
      description: 'Specialized in high-conversion SaaS landing pages, Tailwind CSS, and responsive layouts.',
      category: 'Design',
      capabilities: ['Landing Page Design', 'Tailwind CSS', 'Framer Motion', 'Responsive UI', 'Contact Forms'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [
        {
          id: 'cat_pixel_landing',
          name: 'Professional Responsive Landing Page',
          description: 'Custom modern landing page with hero, pricing matrix, responsive layout, and form integration.',
          startingPrice: 180,
          minPrice: 145,
          deliveryDays: 5,
          includedDeliverables: [
            'Responsive Landing Page Layout',
            'Interactive Pricing Section',
            'Integrated Contact Form',
            'Mobile Optimization',
            'Framer Motion Micro-interactions'
          ]
        }
      ],
      pricingConstraints: {
        startingPrice: 180,
        minAcceptablePrice: 145,
        flexibilityPercent: 20
      },
      negotiationStrategy: 'balanced',
      approvalPolicy: 'explicit_human_required',
      isDemo: true,
      avatarSeed: 'pixel-studio',
      createdAt: now,
      updatedAt: now
    };

    // 3. Seller B — LaunchCraft Velocity (Initial: $130, Min: $120, Delivery: 8d)
    const launchCraft: Agent = {
      id: 'agent_seller_launchcraft',
      ownerId: 'seller_launchcraft_ltd',
      businessName: 'LaunchCraft Velocity',
      name: 'LaunchCraft Agent',
      type: 'seller',
      description: 'Budget-oriented web engineering. Lower costs with standard 8-day turnaround schedule.',
      category: 'Development',
      capabilities: ['Rapid Prototyping', 'Vite & React Deployments', 'SEO Optimization', 'Analytics Setup', 'Forms & Webhooks'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [
        {
          id: 'cat_launchcraft_rapid',
          name: 'Economy SaaS Landing Page Package',
          description: 'Standard 8-day turnaround landing page with basic analytics and conversion sections.',
          startingPrice: 130,
          minPrice: 120,
          deliveryDays: 8,
          includedDeliverables: [
            'Lightweight Fast-Loading Page',
            'Conversion-Focused Copy Layout',
            'Contact Form with Email Routing',
            'Responsive Mobile Navigation',
            'Production Vercel/Netlify Ready'
          ]
        }
      ],
      pricingConstraints: {
        startingPrice: 130,
        minAcceptablePrice: 120,
        flexibilityPercent: 10
      },
      negotiationStrategy: 'balanced',
      approvalPolicy: 'explicit_human_required',
      isDemo: true,
      avatarSeed: 'launchcraft',
      createdAt: now,
      updatedAt: now
    };

    // 4. Seller C — Northstar Interactive (Initial: $160, Min: $150, Delivery: 4d)
    const northstarDesign: Agent = {
      id: 'agent_seller_northstar',
      ownerId: 'seller_northstar_inc',
      businessName: 'Northstar Interactive',
      name: 'Northstar Agent',
      type: 'seller',
      description: 'Fast-track premium UI/UX design studio. Expedited 4-day delivery turnaround with strict pricing floors.',
      category: 'Design',
      capabilities: ['Design Systems', 'SaaS Landing Pages', 'Design-to-Code', 'Accessibility QA', 'Interactive Prototypes'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [
        {
          id: 'cat_northstar_saas',
          name: 'Expedited Enterprise SaaS Web Interface',
          description: 'Fast 4-day turnaround SaaS landing page with dark mode, interactive components, and lead form.',
          startingPrice: 160,
          minPrice: 150,
          deliveryDays: 4,
          includedDeliverables: [
            'Bespoke Dark Design System',
            'Interactive Component Highlights',
            'Validated Contact / Lead Form',
            'Performance-Optimized Codebase',
            'Expedited 4-Day SLA Guarantee'
          ]
        }
      ],
      pricingConstraints: {
        startingPrice: 160,
        minAcceptablePrice: 150,
        flexibilityPercent: 8
      },
      negotiationStrategy: 'expedited',
      approvalPolicy: 'explicit_human_required',
      isDemo: true,
      avatarSeed: 'northstar',
      createdAt: now,
      updatedAt: now
    };

    // 5. Aether Security Labs (Specialized Seller Agent)
    const aetherSecurity: Agent = {
      id: 'agent_seller_aether',
      ownerId: 'seller_aether_sec',
      businessName: 'Aether Security Labs',
      name: 'Aether Sec Agent',
      type: 'seller',
      description: 'Automated and human-augmented security audits for APIs, smart contracts, and auth flows.',
      category: 'Security',
      capabilities: ['API Security Auditing', 'OWASP Top 10 Review', 'Penetration Testing', 'Compliance Review'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [
        {
          id: 'cat_aether_audit',
          name: 'Fast-Track API & Auth Security Audit',
          description: 'Comprehensive static & dynamic vulnerability assessment with actionable remediation reports.',
          startingPrice: 420,
          minPrice: 360,
          deliveryDays: 7,
          includedDeliverables: [
            'Vulnerability Scan & Triage',
            'Auth Token & Session Safety Report',
            'Actionable Remediation Patches',
            'Executive Security Certificate'
          ]
        }
      ],
      pricingConstraints: {
        startingPrice: 420,
        minAcceptablePrice: 360,
        flexibilityPercent: 14
      },
      negotiationStrategy: 'quality_first',
      approvalPolicy: 'explicit_human_required',
      isDemo: true,
      avatarSeed: 'aether-sec',
      createdAt: now,
      updatedAt: now
    };

    this.data.agents[studioBuyer.id] = studioBuyer;
    this.data.agents[pixelStudio.id] = pixelStudio;
    this.data.agents[northstarDesign.id] = northstarDesign;
    this.data.agents[launchCraft.id] = launchCraft;
    this.data.agents[aetherSecurity.id] = aetherSecurity;

    // Log seed event
    this.logActivity({
      type: 'agent_discovered',
      title: 'Autonomous Network Initialized',
      description: '5 high-reputation commercial agents discovered across Design, Development, and Security registries.',
      severity: 'info'
    });
  }
}

export const store = new MemoryStore();
