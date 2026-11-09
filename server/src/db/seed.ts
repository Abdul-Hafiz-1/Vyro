import { sqliteDb } from './sqlite.js';

export function seedDatabase(force: boolean = false): void {
  const db = sqliteDb.db;

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0 && !force) {
    return;
  }

  console.log('[DB] Seeding canonical SQLite data...');

  // Clear tables if force seeding
  if (force) {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM tuning_overrides;
      DELETE FROM review_queue;
      DELETE FROM transactions;
      DELETE FROM agreements;
      DELETE FROM proposals;
      DELETE FROM negotiations;
      DELETE FROM requests;
      DELETE FROM listings;
      DELETE FROM agents;
      DELETE FROM users;
      DELETE FROM activity_events;
      DELETE FROM notifications;
    `);
  }

  const now = new Date().toISOString();
  const pastDay = new Date(Date.now() - 86400000).toISOString();
  const pastTwoDays = new Date(Date.now() - 172800000).toISOString();

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, email, display_name, username, avatar_url, bio, role, capabilities,
      active_workspace, onboarding_completed, onboarding_step, buyer_preferences,
      seller_profile, auto_approval_limit, daily_budget_cap, balance, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Buyer: Alex Mercer
  insertUser.run(
    'usr_alex_mercer',
    'alex@vyro.network',
    'Alex Mercer',
    'alexmercer',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'Head of Product at a fast-growing tech venture.',
    'buyer',
    JSON.stringify({ buying: true, selling: true }),
    'buyer',
    1,
    3,
    JSON.stringify({
      generalInterests: ['Design', 'Development', 'Security'],
      typicalBudget: 250,
      currency: 'USD',
      preferredBrands: [],
      qualityExpectations: 'production-grade',
      communicationStyle: 'concise',
      negotiationStyle: 'balanced',
      constraints: ['Max delivery 7 days']
    }),
    JSON.stringify({
      businessName: 'Mercer Labs',
      headline: 'Product Strategy & Architecture',
      description: 'Senior tech consultancy',
      categories: ['Development'],
      location: 'San Francisco, CA',
      serviceCoverage: 'Global',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 3,
      activeProjects: 1,
      rating: 5.0,
      reviewCount: 14,
      replyPoints: 100,
      avgResponseTime: '15m'
    }),
    200, // auto_approval_limit starts at $200 per directive
    500, // daily_budget_cap
    2500,
    pastTwoDays,
    now
  );

  // Seller 1: Marcus Vance (Design / Frontend)
  insertUser.run(
    'usr_marcus_vance',
    'marcus@vancestudio.com',
    'Marcus Vance',
    'marcusvance',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'Award-winning product designer and frontend systems engineer.',
    'seller',
    JSON.stringify({ buying: false, selling: true }),
    'seller',
    1,
    3,
    null,
    JSON.stringify({
      businessName: 'Vance Design Studio',
      headline: 'Production-Grade Design Systems & Modern Web Interfaces',
      description: 'Over 8 years crafting design systems and conversion-focused web applications.',
      categories: ['Design', 'Development'],
      location: 'Berlin, DE',
      serviceCoverage: 'Worldwide Remote',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 4,
      activeProjects: 2,
      rating: 4.9,
      reviewCount: 42,
      replyPoints: 98,
      avgResponseTime: '12m',
      verifiedAt: pastTwoDays
    }),
    200,
    500,
    8450,
    pastTwoDays,
    now
  );

  // Seller 2: Elena Rostova (Security / Auditing)
  insertUser.run(
    'usr_elena_rostova',
    'elena@rostovasec.io',
    'Elena Rostova',
    'elenarostova',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    'Cybersecurity researcher specializing in API vulnerability analysis and cloud compliance.',
    'seller',
    JSON.stringify({ buying: false, selling: true }),
    'seller',
    1,
    3,
    null,
    JSON.stringify({
      businessName: 'Rostova Security Labs',
      headline: 'OWASP API Audits, Threat Modeling & Cloud Infrastructure Scans',
      description: 'Certified penetration tester with deep expertise in API security and compliance.',
      categories: ['Security'],
      location: 'Zurich, CH',
      serviceCoverage: 'Worldwide Remote',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 3,
      activeProjects: 1,
      rating: 5.0,
      reviewCount: 28,
      replyPoints: 100,
      avgResponseTime: '8m',
      verifiedAt: pastTwoDays
    }),
    200,
    500,
    11200,
    pastTwoDays,
    now
  );

  // Seller 3: Chen Wei (Fullstack / Mobile)
  insertUser.run(
    'usr_chen_wei',
    'chen@chenweisystems.com',
    'Chen Wei',
    'chenwei',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'Fullstack engineer specializing in scalable React Native and Node backend systems.',
    'seller',
    JSON.stringify({ buying: false, selling: true }),
    'seller',
    1,
    3,
    null,
    JSON.stringify({
      businessName: 'Chenwei Tech Systems',
      headline: 'Cross-Platform Mobile Apps & High-Throughput Node Microservices',
      description: 'Production-ready mobile apps and cloud architectures delivered with high precision.',
      categories: ['Development'],
      location: 'Singapore, SG',
      serviceCoverage: 'Worldwide Remote',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 3,
      activeProjects: 1,
      rating: 4.8,
      reviewCount: 35,
      replyPoints: 95,
      avgResponseTime: '20m',
      verifiedAt: pastTwoDays
    }),
    200,
    500,
    6300,
    pastTwoDays,
    now
  );

  // Seller 4: Sophia Martinez (AI Systems / Automation)
  insertUser.run(
    'usr_sophia_martinez',
    'sophia@martinezai.com',
    'Sophia Martinez',
    'sophiamartinez',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    'AI engineer specializing in multi-agent orchestration, LLM fine-tuning, and Python workflows.',
    'seller',
    JSON.stringify({ buying: false, selling: true }),
    'seller',
    1,
    3,
    null,
    JSON.stringify({
      businessName: 'Martinez Automation',
      headline: 'Autonomous LLM Workflows & Custom Python AI Agents',
      description: 'Engineering agentic workflows and automated AI systems for modern enterprises.',
      categories: ['Other', 'Development'],
      location: 'Austin, TX',
      serviceCoverage: 'Worldwide Remote',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 4,
      activeProjects: 2,
      rating: 4.8,
      reviewCount: 19,
      replyPoints: 94,
      avgResponseTime: '18m',
      verifiedAt: pastTwoDays
    }),
    200,
    500,
    4900,
    pastTwoDays,
    now
  );

  // Admin / Reviewer
  insertUser.run(
    'usr_admin',
    'admin@vyro.network',
    'Jordan Blake',
    'jordanblake',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    'VYRO Marketplace Operations & Review Supervisor',
    'reviewer',
    JSON.stringify({ buying: true, selling: true }),
    'buyer',
    1,
    3,
    null,
    null,
    200,
    500,
    10000,
    pastTwoDays,
    now
  );

  // 2. Agents
  const insertAgent = db.prepare(`
    INSERT INTO agents (
      id, owner_id, business_name, name, type, description, category, capabilities,
      status, verification_status, catalog, pricing_constraints, policies,
      negotiation_strategy, approval_policy, instructions, communication_style,
      metrics, operator_name, operator_role, operator_location, rating, review_count,
      verified_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Alex's Buyer Agent
  insertAgent.run(
    'agt_alex_buyer',
    'usr_alex_mercer',
    'Mercer Labs',
    'Apex Buyer Agent',
    'buyer',
    'Autonomous procurement agent negotiating web development, security audits, and design services.',
    'Procurement',
    JSON.stringify(['discovery', 'multi_party_negotiation', 'contract_structuring', 'budget_enforcement']),
    'active',
    'verified',
    JSON.stringify([]),
    JSON.stringify({ defaultBudget: 200, maxBudget: 400, flexibilityPercent: 15 }),
    JSON.stringify({ maxDiscountPercent: 25, questionsToAsk: ['Delivery timeline?', 'Revisions included?'] }),
    'balanced',
    'explicit_human_required',
    'Procure high-quality digital services strictly within budget. Do not reveal private ceiling budget.',
    'concise',
    JSON.stringify({ negotiationsHandled: 12, dealsClosed: 9, averageDiscountSecured: 14.5, avgResponseMinutes: 4 }),
    'Alex Mercer',
    'Product Lead',
    'San Francisco, CA',
    5.0,
    14,
    pastTwoDays,
    pastTwoDays,
    now
  );

  // Marcus's Seller Agent
  insertAgent.run(
    'agt_marcus_seller',
    'usr_marcus_vance',
    'Vance Design Studio',
    'Vance Design Representative',
    'seller',
    'Autonomous representative for Vance Design Studio specializing in design systems and web UI.',
    'Design',
    JSON.stringify(['design_systems', 'tailwind_css', 'figma_tokens', 'react_components']),
    'active',
    'verified',
    JSON.stringify([
      {
        id: 'svc_marcus_1',
        name: 'Design System & UI Component Library',
        description: 'Complete Figma & React component suite with Tailwind tokens.',
        startingPrice: 280,
        minPrice: 220,
        deliveryDays: 4,
        includedDeliverables: ['Figma library', 'Tailwind tokens', 'React components']
      },
      {
        id: 'svc_marcus_2',
        name: 'High-Converting Landing Page',
        description: 'Responsive, accessible landing page crafted with clean animations.',
        startingPrice: 180,
        minPrice: 140,
        deliveryDays: 3,
        includedDeliverables: ['Responsive HTML/React code', 'SEO metadata', 'Dark mode support']
      }
    ]),
    JSON.stringify({ startingPrice: 180, minAcceptablePrice: 140, flexibilityPercent: 20 }),
    JSON.stringify({ minPrice: 140, maxDiscountPercent: 22 }),
    'balanced',
    'explicit_human_required',
    'Negotiate fairly for design projects. Protect the $140 minimum floor price.',
    'concise',
    JSON.stringify({ negotiationsHandled: 48, dealsClosed: 42, averageDiscountSecured: 10.2, avgResponseMinutes: 6 }),
    'Marcus Vance',
    'Founder & Design Director',
    'Berlin, DE',
    4.9,
    42,
    pastTwoDays,
    pastTwoDays,
    now
  );

  // Elena's Seller Agent
  insertAgent.run(
    'agt_elena_seller',
    'usr_elena_rostova',
    'Rostova Security Labs',
    'Rostova Security Protocol',
    'seller',
    'Autonomous technical agent for Rostova Security Labs negotiating API security audits.',
    'Security',
    JSON.stringify(['api_penetration_testing', 'owasp_audit', 'threat_modeling', 'cloud_review']),
    'active',
    'verified',
    JSON.stringify([
      {
        id: 'svc_elena_1',
        name: 'Comprehensive API Security Audit',
        description: 'Full OWASP Top 10 API assessment with detailed remediation report.',
        startingPrice: 390,
        minPrice: 320,
        deliveryDays: 4,
        includedDeliverables: ['Vulnerability scan report', 'Proof-of-concept exploits', 'Remediation guide']
      }
    ]),
    JSON.stringify({ startingPrice: 390, minAcceptablePrice: 320, flexibilityPercent: 18 }),
    JSON.stringify({ minPrice: 320, maxDiscountPercent: 18 }),
    'balanced',
    'explicit_human_required',
    'Negotiate security audits. Minimum floor price is strictly $320.',
    'technical',
    JSON.stringify({ negotiationsHandled: 31, dealsClosed: 28, averageDiscountSecured: 8.5, avgResponseMinutes: 5 }),
    'Elena Rostova',
    'Lead Security Researcher',
    'Zurich, CH',
    5.0,
    28,
    pastTwoDays,
    pastTwoDays,
    now
  );

  // Chen's Seller Agent
  insertAgent.run(
    'agt_chen_seller',
    'usr_chen_wei',
    'Chenwei Tech Systems',
    'Chenwei Architecture Agent',
    'seller',
    'Autonomous representative for cross-platform mobile apps and Node backends.',
    'Development',
    JSON.stringify(['react_native', 'typescript', 'sqlite', 'rest_apis']),
    'active',
    'verified',
    JSON.stringify([
      {
        id: 'svc_chen_1',
        name: 'React Native MVP Starter App',
        description: 'Complete cross-platform mobile application shell with authentication and local database.',
        startingPrice: 550,
        minPrice: 450,
        deliveryDays: 7,
        includedDeliverables: ['iOS & Android codebase', 'Offline SQLite storage', 'Clean architecture']
      }
    ]),
    JSON.stringify({ startingPrice: 550, minAcceptablePrice: 450, flexibilityPercent: 18 }),
    JSON.stringify({ minPrice: 450, maxDiscountPercent: 18 }),
    'balanced',
    'explicit_human_required',
    'Negotiate mobile app builds. Protect $450 floor price.',
    'detailed',
    JSON.stringify({ negotiationsHandled: 39, dealsClosed: 35, averageDiscountSecured: 11.0, avgResponseMinutes: 8 }),
    'Chen Wei',
    'Principal Mobile Architect',
    'Singapore, SG',
    4.8,
    35,
    pastTwoDays,
    pastTwoDays,
    now
  );

  // Sophia's Seller Agent
  insertAgent.run(
    'agt_sophia_seller',
    'usr_sophia_martinez',
    'Martinez Automation',
    'Martinez AI Representative',
    'seller',
    'Autonomous representative for Python automation, AI workflows, and background job systems.',
    'Other',
    JSON.stringify(['python_automation', 'agentic_workflows', 'llm_integration', 'cron_systems']),
    'active',
    'verified',
    JSON.stringify([
      {
        id: 'svc_sophia_1',
        name: 'Custom AI Automation Pipeline',
        description: 'Multi-step agentic workflow automation with error handling and webhook integration.',
        startingPrice: 220,
        minPrice: 180,
        deliveryDays: 3,
        includedDeliverables: ['Python service codebase', 'Docker setup', 'Integration tests']
      }
    ]),
    JSON.stringify({ startingPrice: 220, minAcceptablePrice: 180, flexibilityPercent: 18 }),
    JSON.stringify({ minPrice: 180, maxDiscountPercent: 18 }),
    'balanced',
    'explicit_human_required',
    'Negotiate AI pipelines. Protect $180 floor price.',
    'concise',
    JSON.stringify({ negotiationsHandled: 22, dealsClosed: 19, averageDiscountSecured: 9.8, avgResponseMinutes: 7 }),
    'Sophia Martinez',
    'Automation Specialist',
    'Austin, TX',
    4.8,
    19,
    pastTwoDays,
    pastTwoDays,
    now
  );

  // 3. Listings (Single source of truth with asking and private floor prices)
  const insertListing = db.prepare(`
    INSERT INTO listings (
      id, seller_id, seller_agent_id, title, description, category, type,
      asking_price, floor_price, currency, pricing_model, delivery_days,
      deliverables, images, is_negotiable, status, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Listing 1: Landing Page (Marcus)
  insertListing.run(
    'lst_marcus_landing',
    'usr_marcus_vance',
    'agt_marcus_seller',
    'Conversion-Focused High-Fidelity Landing Page',
    'Modern, accessible, and fast-loading web landing page built in React with Tailwind CSS and dark mode support.',
    'Design',
    'service',
    180, // asking
    140, // STRICT PRIVATE FLOOR
    'USD',
    'fixed',
    3,
    JSON.stringify(['Production React code', 'Tailwind styling', 'Accessibility AA compliance', 'Mobile optimization']),
    JSON.stringify(['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600']),
    1,
    'active',
    JSON.stringify(['design', 'frontend', 'tailwind', 'react', 'landing-page']),
    pastTwoDays,
    now
  );

  // Listing 2: Design System (Marcus)
  insertListing.run(
    'lst_marcus_design_system',
    'usr_marcus_vance',
    'agt_marcus_seller',
    'Production-Grade Design System & Tailwind Tokens',
    'Comprehensive design token architecture, typography hierarchy, and accessible React UI components.',
    'Design',
    'service',
    280, // asking
    220, // STRICT PRIVATE FLOOR
    'USD',
    'fixed',
    4,
    JSON.stringify(['Design tokens', 'Reusable React components', 'Color system', 'Component documentation']),
    JSON.stringify(['https://images.unsplash.com/photo-1581291518655-952384493e80?w=600']),
    1,
    'active',
    JSON.stringify(['design-system', 'tokens', 'ui-kit', 'react']),
    pastTwoDays,
    now
  );

  // Listing 3: API Security Audit (Elena)
  insertListing.run(
    'lst_elena_api_audit',
    'usr_elena_rostova',
    'agt_elena_seller',
    'OWASP API Vulnerability & Security Audit',
    'Rigorous penetration testing covering authentication bypasses, broken object-level authorization, and injection vectors.',
    'Security',
    'service',
    390, // asking
    320, // STRICT PRIVATE FLOOR
    'USD',
    'fixed',
    4,
    JSON.stringify(['Executive security summary', 'Technical findings report', 'Remediation code snippets']),
    JSON.stringify(['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600']),
    1,
    'active',
    JSON.stringify(['security', 'owasp', 'api-audit', 'penetration-testing']),
    pastTwoDays,
    now
  );

  // Listing 4: Mobile App MVP (Chen)
  insertListing.run(
    'lst_chen_mobile_mvp',
    'usr_chen_wei',
    'agt_chen_seller',
    'Cross-Platform Mobile App MVP in React Native',
    'Turnkey mobile MVP shell with local SQLite storage, secure token authentication, and responsive views.',
    'Development',
    'service',
    550, // asking
    450, // STRICT PRIVATE FLOOR
    'USD',
    'fixed',
    7,
    JSON.stringify(['iOS and Android builds', 'Clean modular codebase', 'Offline SQLite data sync']),
    JSON.stringify(['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600']),
    1,
    'active',
    JSON.stringify(['mobile', 'react-native', 'cross-platform', 'ios', 'android']),
    pastTwoDays,
    now
  );

  // Listing 5: AI Automation Pipeline (Sophia)
  insertListing.run(
    'lst_sophia_automation',
    'usr_sophia_martinez',
    'agt_sophia_seller',
    'Autonomous Multi-Agent Workflow Integration',
    'Custom Python agent pipeline with automated schema validation, error retries, and task orchestration.',
    'Other',
    'service',
    220, // asking
    180, // STRICT PRIVATE FLOOR
    'USD',
    'fixed',
    3,
    JSON.stringify(['Python pipeline code', 'Automated test suite', 'Docker container']),
    JSON.stringify(['https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600']),
    1,
    'active',
    JSON.stringify(['automation', 'ai-agents', 'python', 'workflow']),
    pastTwoDays,
    now
  );

  // 4. Sample Requests & Closed Deals
  const insertRequest = db.prepare(`
    INSERT INTO requests (
      id, user_id, buyer_agent_id, raw_input, title, category, required_capabilities,
      deliverables, target_budget, max_budget, currency, deadline_days, quality_requirements,
      additional_conditions, max_candidates, status, selected_seller_agent_ids, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Request 1: Closed & Auto-Approved
  insertRequest.run(
    'req_landing_page_001',
    'usr_alex_mercer',
    'agt_alex_buyer',
    'I need a high-converting web landing page for my software launch within 3 days for under $180.',
    'Startup Launch Landing Page',
    'Design',
    JSON.stringify(['design', 'frontend', 'react']),
    JSON.stringify(['Landing page React code', 'Tailwind CSS styling']),
    170, // target budget
    185, // STRICT PRIVATE MAX BUDGET
    'USD',
    3,
    'production-grade responsive layout with dark mode',
    'Must include mobile responsive styles',
    3,
    'completed',
    JSON.stringify(['agt_marcus_seller']),
    pastTwoDays,
    pastDay
  );

  // Request 2: Escalated to Human Review Queue
  insertRequest.run(
    'req_api_security_002',
    'usr_alex_mercer',
    'agt_alex_buyer',
    'Need comprehensive OWASP API vulnerability scan and penetration testing report.',
    'Comprehensive OWASP API Security Audit',
    'Security',
    JSON.stringify(['security', 'api_penetration_testing']),
    JSON.stringify(['Executive security audit report', 'Vulnerability remediation guide']),
    350, // target budget
    360, // STRICT PRIVATE MAX BUDGET
    'USD',
    4,
    'rigorous penetration testing and remediation snippets',
    'Must test token refresh and authorization rules',
    3,
    'escalated',
    JSON.stringify(['agt_elena_seller']),
    pastDay,
    now
  );

  // 5. Negotiations
  const insertNegotiation = db.prepare(`
    INSERT INTO negotiations (
      id, request_id, buyer_agent_id, seller_agent_id, buyer_user_id, seller_user_id,
      listing_id, status, current_round, max_rounds, current_proposal, messages,
      agreement_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Negotiation 1: Auto-approved at $160
  insertNegotiation.run(
    'neg_auto_001',
    'req_landing_page_001',
    'agt_alex_buyer',
    'agt_marcus_seller',
    'usr_alex_mercer',
    'usr_marcus_vance',
    'lst_marcus_landing',
    'completed',
    3,
    4,
    JSON.stringify({
      id: 'prop_001',
      negotiationId: 'neg_auto_001',
      senderAgentId: 'agt_marcus_seller',
      round: 3,
      price: 160,
      currency: 'USD',
      deliverables: ['Responsive HTML/React code', 'SEO metadata', 'Dark mode support'],
      deliveryDays: 3,
      terms: 'Milestone upon delivery',
      validUntil: now,
      status: 'accepted',
      createdAt: pastDay
    }),
    JSON.stringify([
      {
        id: 'msg_001',
        negotiationId: 'neg_auto_001',
        senderAgentId: 'agt_alex_buyer',
        recipientAgentId: 'agt_marcus_seller',
        senderRole: 'buyer',
        round: 1,
        messageType: 'request',
        content: 'Buyer agent inquiring on Conversion-Focused Landing Page. Opening offer: $150 with 3-day delivery.',
        timestamp: pastTwoDays
      },
      {
        id: 'msg_002',
        negotiationId: 'neg_auto_001',
        senderAgentId: 'agt_marcus_seller',
        recipientAgentId: 'agt_alex_buyer',
        senderRole: 'seller',
        round: 2,
        messageType: 'counteroffer',
        content: 'Counteroffer: Standard rate is $180; can commit to expedited 3-day turnaround at $165 with full tokens included.',
        timestamp: pastTwoDays
      },
      {
        id: 'msg_003',
        negotiationId: 'neg_auto_001',
        senderAgentId: 'agt_alex_buyer',
        recipientAgentId: 'agt_marcus_seller',
        senderRole: 'buyer',
        round: 3,
        messageType: 'counteroffer',
        content: 'Counteroffer: Can close immediately at $160 with delivery in 3 days.',
        timestamp: pastDay
      },
      {
        id: 'msg_004',
        negotiationId: 'neg_auto_001',
        senderAgentId: 'agt_marcus_seller',
        recipientAgentId: 'agt_alex_buyer',
        senderRole: 'seller',
        round: 3,
        messageType: 'acceptance',
        content: 'Accepted: $160 for complete responsive landing page within 3 days. Terms confirmed.',
        timestamp: pastDay
      }
    ]),
    'agr_seed_001',
    pastTwoDays,
    pastDay
  );

  // Negotiation 2: Escalated at $340 (exceeds $200 auto-limit)
  insertNegotiation.run(
    'neg_escalated_002',
    'req_api_security_002',
    'agt_alex_buyer',
    'agt_elena_seller',
    'usr_alex_mercer',
    'usr_elena_rostova',
    'lst_elena_api_audit',
    'escalated',
    2,
    4,
    JSON.stringify({
      id: 'prop_002',
      negotiationId: 'neg_escalated_002',
      senderAgentId: 'agt_elena_seller',
      round: 2,
      price: 340,
      currency: 'USD',
      deliverables: ['Vulnerability scan report', 'Proof-of-concept exploits', 'Remediation guide'],
      deliveryDays: 4,
      terms: 'Complete vulnerability assessment',
      validUntil: now,
      status: 'pending',
      createdAt: pastDay
    }),
    JSON.stringify([
      {
        id: 'msg_005',
        negotiationId: 'neg_escalated_002',
        senderAgentId: 'agt_alex_buyer',
        recipientAgentId: 'agt_elena_seller',
        senderRole: 'buyer',
        round: 1,
        messageType: 'request',
        content: 'Inquiring on Comprehensive API Security Audit. Opening offer: $320 with 4-day delivery.',
        timestamp: pastDay
      },
      {
        id: 'msg_006',
        negotiationId: 'neg_escalated_002',
        senderAgentId: 'agt_elena_seller',
        recipientAgentId: 'agt_alex_buyer',
        senderRole: 'seller',
        round: 2,
        messageType: 'counteroffer',
        content: 'Counteroffer: Standard rate is $390; can commit to comprehensive audit at $340 delivered within 4 days.',
        timestamp: now
      }
    ]),
    null,
    pastDay,
    now
  );

  // 6. Review Queue (The human exception desk)
  const insertReviewQueue = db.prepare(`
    INSERT INTO review_queue (
      id, negotiation_id, request_id, seller_id, buyer_id, urgency, urgency_score,
      ai_recommendation, confidence, reasons, proposed_price, buyer_max_budget,
      seller_floor_price, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertReviewQueue.run(
    'rq_seed_001',
    'neg_escalated_002',
    'req_api_security_002',
    'usr_elena_rostova',
    'usr_alex_mercer',
    'medium',
    0.68,
    'approve',
    0.89, // deterministic confidence
    JSON.stringify([
      'Proposed price ($340.00) exceeds buyer auto-approval threshold ($200.00)',
      'Verified seller: Elena Rostova (5.0 rating across 28 audits)',
      'Price within buyer budget limit ($360.00) and above seller floor ($320.00)'
    ]),
    340,
    360,
    320,
    'pending',
    now
  );

  // 7. Agreements
  const insertAgreement = db.prepare(`
    INSERT INTO agreements (
      id, negotiation_id, request_id, buyer_agent_id, seller_agent_id,
      buyer_user_id, seller_user_id, seller_business_name, final_price,
      currency, final_deliverables, delivery_days, commercial_terms,
      human_approval_status, human_approved_at, seller_acceptance_status,
      seller_accepted_at, rejection_reason, paypal_ready, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAgreement.run(
    'agr_seed_001',
    'neg_auto_001',
    'req_landing_page_001',
    'agt_alex_buyer',
    'agt_marcus_seller',
    'usr_alex_mercer',
    'usr_marcus_vance',
    'Vance Design Studio',
    160,
    'USD',
    JSON.stringify(['Responsive HTML/React code', 'SEO metadata', 'Dark mode support']),
    3,
    '100% on delivery release. Standard NDA.',
    'approved',
    pastDay,
    'accepted',
    pastDay,
    null,
    1,
    pastDay
  );

  // 8. Transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, agreement_id, negotiation_id, request_id, buyer_user_id, buyer_agent_name,
      seller_agent_id, seller_business_name, service_title, amount, currency,
      paypal_order_id, paypal_capture_id, paypal_payer_email, paypal_payer_name,
      payment_status, idempotency_key, created_at, completed_at, failure_reason, is_sandbox
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(
    'tx_seed_001',
    'agr_seed_001',
    'neg_auto_001',
    'req_landing_page_001',
    'usr_alex_mercer',
    'Apex Buyer Agent',
    'agt_marcus_seller',
    'Vance Design Studio',
    'Startup Launch Landing Page',
    160,
    'USD',
    'ORDER-847291847',
    'CAPTURE-918237194',
    'alex@vyro.network',
    'Alex Mercer',
    'completed',
    'idem_seed_001',
    pastDay,
    pastDay,
    null,
    1
  );

  // 9. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (
      id, entity_type, entity_id, action, policy_matched, decision,
      actor, confidence, reasons, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    'aud_001',
    'negotiation',
    'neg_auto_001',
    'EVALUATE_OFFER',
    'AUTO_APPROVE',
    'APPROVED',
    'ai_engine',
    0.94,
    JSON.stringify([
      'Price ($160) <= auto-limit ($200)',
      'Price within buyer budget ($185) and seller floor ($140)',
      'Seller verified with rating 4.9 >= 4.5',
      'Confidence 0.94 >= 0.85 threshold'
    ]),
    JSON.stringify({ price: 160, seller: 'usr_marcus_vance', buyer: 'usr_alex_mercer' }),
    pastDay
  );

  insertAudit.run(
    'aud_002',
    'negotiation',
    'neg_escalated_002',
    'EVALUATE_OFFER',
    'ESCALATE_TO_HUMAN',
    'ESCALATED',
    'ai_engine',
    0.89,
    JSON.stringify([
      'Price ($340) > auto-limit ($200)',
      'Seller verified (rating 5.0)',
      'Escalated to human review queue'
    ]),
    JSON.stringify({ price: 340, seller: 'usr_elena_rostova', queueItemId: 'rq_seed_001' }),
    now
  );

  // 10. Activity Events
  const insertActivity = db.prepare(`
    INSERT INTO activity_events (
      id, user_id, type, title, description, agent_id, negotiation_id,
      transaction_id, amount, currency, severity, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(
    'act_001',
    'usr_alex_mercer',
    'agreement_reached',
    'Autonomous Settlement Executed',
    'Agreement agr_seed_001 settled for $160.00 via PayPal Sandbox.',
    'agt_alex_buyer',
    'neg_auto_001',
    'tx_seed_001',
    160,
    'USD',
    'success',
    pastDay
  );

  insertActivity.run(
    'act_002',
    'usr_alex_mercer',
    'counteroffer_made',
    'Deal Escalated to Review Queue',
    'Security audit offer of $340.00 escalated for human review (exceeds $200 threshold).',
    'agt_alex_buyer',
    'neg_escalated_002',
    null,
    340,
    'USD',
    'warning',
    now
  );

  console.log('[DB] Canonical SQLite database seeded successfully.');
}
