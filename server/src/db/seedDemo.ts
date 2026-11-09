import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { store } from './store.js';
import { User, Agent, Listing, MemoryItem } from '../types/index.js';

export async function seedDemoAccounts(): Promise<{ buyer: User; seller: User }> {
  console.log('[DB] Seeding explicit Demo Accounts (demo.buyer@example.com, demo.seller@example.com)...');

  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Demo Buyer User
  const buyerId = 'usr_demo_buyer';
  const buyerAgentId = 'agt_demo_buyer';
  
  const buyerUser: User = {
    id: buyerId,
    email: 'demo.buyer@example.com',
    passwordHash,
    displayName: 'Demo Buyer',
    username: 'demobuyer',
    avatarUrl: undefined,
    bio: 'Autonomous procurement lead managing product requests.',
    capabilities: { buying: true, selling: false },
    activeWorkspace: 'buyer',
    onboardingCompleted: true,
    onboardingStep: 3,
    autoApprovalLimit: 200,
    dailyBudgetCap: 500,
    balance: 2500,
    isAutomationPaused: false,
    createdAt: now,
    updatedAt: now
  };
  store.saveUser(buyerUser);

  const buyerAgent: Agent = {
    id: buyerAgentId,
    ownerId: buyerId,
    userId: buyerId,
    businessName: 'Apex Procurement Team',
    name: 'Buyer Operations Agent',
    type: 'buyer',
    description: 'Autonomous purchasing representative negotiating scopes, pricing, and turnarounds.',
    category: 'Procurement',
    capabilities: ['Autonomous Negotiation', 'Policy Enforcement', 'Price Convergence'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [],
    pricingConstraints: {
      defaultBudget: 250,
      maxBudget: 400
    },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    createdAt: now,
    updatedAt: now
  };
  store.saveAgent(buyerAgent);

  const buyerRule1: MemoryItem = {
    id: `mem_${uuidv4().substring(0, 8)}`,
    userId: buyerId,
    role: 'buyer',
    type: 'decision_rule',
    key: 'OWASP Compliance Verification',
    value: 'All security audits must test against OWASP Top 10 vulnerabilities.',
    source: 'user_provided',
    confidence: 1.0,
    verifiedByUser: true,
    createdAt: now
  };
  const buyerRule2: MemoryItem = {
    id: `mem_${uuidv4().substring(0, 8)}`,
    userId: buyerId,
    role: 'buyer',
    type: 'constraint',
    key: 'Maximum Delivery Window',
    value: 'Standard projects must deliver within 5 business days with full documentation.',
    source: 'user_provided',
    confidence: 1.0,
    verifiedByUser: true,
    createdAt: now
  };
  store.saveMemoryItem(buyerRule1);
  store.saveMemoryItem(buyerRule2);

  // 2. Demo Seller User
  const sellerId = 'usr_demo_seller';
  const sellerAgentId = 'agt_demo_seller';

  const sellerUser: User = {
    id: sellerId,
    email: 'demo.seller@example.com',
    passwordHash,
    displayName: 'Demo Seller',
    username: 'demoseller',
    avatarUrl: undefined,
    bio: 'Product design & development studio specializing in modern web interfaces.',
    capabilities: { buying: false, selling: true },
    activeWorkspace: 'seller',
    onboardingCompleted: true,
    onboardingStep: 3,
    sellerProfile: {
      businessName: 'Vance Design & Engineering',
      headline: 'Full-Stack Interface & Systems Engineering',
      description: 'Specialized boutique consultancy delivering high-performance UI and APIs.',
      categories: ['Design', 'Development'],
      location: 'San Francisco, CA',
      serviceCoverage: 'Global',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 5,
      activeProjects: 1,
      rating: 4.9,
      reviewCount: 18,
      replyPoints: 98,
      avgResponseTime: '10m',
      verifiedAt: now
    },
    autoApprovalLimit: 200,
    dailyBudgetCap: 500,
    balance: 2500,
    isAutomationPaused: false,
    createdAt: now,
    updatedAt: now
  };
  store.saveUser(sellerUser);

  const sellerAgent: Agent = {
    id: sellerAgentId,
    ownerId: sellerId,
    userId: sellerId,
    businessName: 'Vance Design & Engineering',
    name: 'Marcus Vance Representative',
    type: 'seller',
    description: 'Senior product designer and frontend systems architect.',
    category: 'Design',
    capabilities: ['Landing Page Design', 'Design Systems', 'Full Stack Development'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [
      {
        id: 'cat_design_sys',
        name: 'Design System & Component Architecture',
        description: 'Comprehensive tokens, Tailwind config, and production React components.',
        startingPrice: 300,
        minPrice: 200,
        deliveryDays: 5,
        includedDeliverables: ['Figma System Tokens', 'Production React Components', 'Documentation']
      }
    ],
    pricingConstraints: {
      startingPrice: 300,
      minAcceptablePrice: 200
    },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    rating: 4.9,
    reviewCount: 18,
    createdAt: now,
    updatedAt: now
  };
  store.saveAgent(sellerAgent);

  const sellerListing1: Listing = {
    id: 'list_vance_design',
    sellerId: sellerId,
    sellerUserId: sellerId,
    sellerAgentId: sellerAgentId,
    title: 'Brand Design System & Component Library',
    description: 'Complete brand tokens, accessible Tailwind styles, and production React UI components.',
    category: 'Design',
    type: 'service',
    price: 300,
    minAcceptablePrice: 200, // STRICTLY PRIVATE TO SELLER
    currency: 'USD',
    pricingModel: 'fixed',
    deliveryDays: 5,
    deliverables: ['Design Tokens Export', 'Interactive UI Prototype', 'Component Library'],
    images: [],
    isNegotiable: true,
    status: 'active',
    tags: ['Design', 'Tailwind', 'UI/UX'],
    sellerName: 'Vance Design & Engineering',
    sellerRating: 4.9,
    sellerReviewCount: 18,
    createdAt: now,
    updatedAt: now
  };

  const sellerListing2: Listing = {
    id: 'list_vance_security',
    sellerId: sellerId,
    sellerUserId: sellerId,
    sellerAgentId: sellerAgentId,
    title: 'OWASP Express API Security Audit & Remediation',
    description: 'Comprehensive static analysis, penetration probe, and code patches for Node/Express backends.',
    category: 'Security',
    type: 'service',
    price: 350,
    minAcceptablePrice: 250, // STRICTLY PRIVATE TO SELLER
    currency: 'USD',
    pricingModel: 'fixed',
    deliveryDays: 4,
    deliverables: ['Threat Model Document', 'Penetration Test Report', 'Security Patches Pull Request'],
    images: [],
    isNegotiable: true,
    status: 'active',
    tags: ['Security', 'OWASP', 'Node.js'],
    sellerName: 'Vance Design & Engineering',
    sellerRating: 4.9,
    sellerReviewCount: 18,
    createdAt: now,
    updatedAt: now
  };

  store.saveListing(sellerListing1);
  store.saveListing(sellerListing2);

  const sellerRule: MemoryItem = {
    id: `mem_${uuidv4().substring(0, 8)}`,
    userId: sellerId,
    role: 'seller',
    type: 'decision_rule',
    key: 'Minimum Engagement Floor',
    value: 'Reject or escalate any custom project scope priced below $200.',
    source: 'user_provided',
    confidence: 1.0,
    verifiedByUser: true,
    createdAt: now
  };
  store.saveMemoryItem(sellerRule);

  console.log('[DB] Demo accounts created successfully:');
  console.log('     Buyer:  demo.buyer@example.com  / password123');
  console.log('     Seller: demo.seller@example.com / password123');

  return { buyer: buyerUser, seller: sellerUser };
}

if (process.argv[1] && process.argv[1].endsWith('seedDemo.ts')) {
  seedDemoAccounts().then(() => process.exit(0)).catch(err => {
    console.error('[DB] Failed to seed demo accounts:', err);
    process.exit(1);
  });
}
