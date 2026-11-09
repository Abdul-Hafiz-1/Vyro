import { v4 as uuidv4 } from 'uuid';
import { sqliteDb } from './sqlite.js';
import {
  User,
  Session,
  Listing,
  Agent,
  MemoryItem,
  CommerceRequest,
  Negotiation,
  Proposal,
  MultiProposalComparison,
  Agreement,
  Transaction,
  ActivityEvent,
  AppNotification,
  Review,
  NetworkStats,
  WorkspaceType,
  UserCapabilities,
  DecisionRecord,
  DecisionStatus,
  DecisionEntityType,
  DecisionSignals
} from '../types/index.js';

export interface ReviewQueueItem {
  id: string;
  negotiationId: string;
  requestId: string;
  sellerId: string;
  buyerId: string;
  urgency: 'high' | 'medium' | 'low';
  urgencyScore: number;
  aiRecommendation: 'approve' | 'reject' | 'adjust_price';
  confidence: number;
  reasons: string[];
  proposedPrice: number;
  buyerMaxBudget: number;
  sellerFloorPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'overridden';
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  policyMatched: string;
  decision: string;
  actor: 'ai_engine' | 'user';
  confidence?: number;
  reasons: string[];
  metadata: Record<string, any>;
  createdAt: string;
}

export interface TuningOverrideItem {
  id: string;
  queueItemId: string;
  originalRecommendation: string;
  overrideAction: string;
  overrideNote: string;
  suggestedPolicyChange?: string;
  status: 'logged' | 'admin_reviewed';
  createdAt: string;
}

export class SQLiteStore {
  constructor() {
    // Clean production store: zero auto-seeding. A fresh database starts empty.
  }

  private get db() {
    return sqliteDb.db;
  }

  // =========================================================================
  // 0. Authentication Sessions
  // =========================================================================
  public saveSession(session: Session): Session {
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(session.id, session.userId, session.expiresAt, session.createdAt);
    return session;
  }

  public getSession(id: string): Session | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  public deleteSession(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  public deleteSessionsForUser(userId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  // =========================================================================
  // 1. Users
  // =========================================================================
  public deleteUser(userId: string): void {
    this.deleteSessionsForUser(userId);
    this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  public getUsers(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as any[];
    return rows.map(r => this.mapUser(r));
  }

  public getUser(id: string): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row ? this.mapUser(row) : undefined;
  }

  public getUserByEmail(email: string): User | undefined {
    const clean = email.toLowerCase().trim();
    const row = this.db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(clean) as any;
    return row ? this.mapUser(row) : undefined;
  }

  public saveUser(user: User): User {
    const now = new Date().toISOString();
    user.updatedAt = now;
    const existing = this.getUser(user.id);

    if (existing) {
      this.db.prepare(`
        UPDATE users SET
          email = ?, password_hash = coalesce(?, password_hash), display_name = ?, username = ?, avatar_url = ?, bio = ?,
          role = ?, capabilities = ?, active_workspace = ?, onboarding_completed = ?,
          onboarding_step = ?, buyer_preferences = ?, seller_profile = ?,
          auto_approval_limit = ?, daily_budget_cap = ?, balance = ?, is_automation_paused = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        user.email,
        user.passwordHash || null,
        user.displayName,
        user.username,
        user.avatarUrl || '',
        user.bio || null,
        (user as any).role || 'buyer',
        JSON.stringify(user.capabilities),
        user.activeWorkspace,
        user.onboardingCompleted ? 1 : 0,
        user.onboardingStep,
        user.buyerPreferences ? JSON.stringify(user.buyerPreferences) : null,
        user.sellerProfile ? JSON.stringify(user.sellerProfile) : null,
        user.autoApprovalLimit ?? 200,
        user.dailyBudgetCap ?? 500,
        user.balance ?? 2500,
        user.isAutomationPaused ? 1 : 0,
        now,
        user.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO users (
          id, email, password_hash, display_name, username, avatar_url, bio, role,
          capabilities, active_workspace, onboarding_completed, onboarding_step,
          buyer_preferences, seller_profile, auto_approval_limit, daily_budget_cap, balance, is_automation_paused,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.email,
        user.passwordHash || null,
        user.displayName,
        user.username,
        user.avatarUrl || '',
        user.bio || null,
        (user as any).role || 'buyer',
        JSON.stringify(user.capabilities),
        user.activeWorkspace,
        user.onboardingCompleted ? 1 : 0,
        user.onboardingStep,
        user.buyerPreferences ? JSON.stringify(user.buyerPreferences) : null,
        user.sellerProfile ? JSON.stringify(user.sellerProfile) : null,
        user.autoApprovalLimit ?? 200,
        user.dailyBudgetCap ?? 500,
        user.balance ?? 2500,
        user.isAutomationPaused ? 1 : 0,
        user.createdAt || now,
        now
      );
    }
    return user;
  }

  public setAutomationPaused(userId: string, isPaused: boolean): User | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;
    user.isAutomationPaused = isPaused;
    return this.saveUser(user);
  }

  public updateUserLimits(userId: string, autoApprovalLimit: number, dailyBudgetCap: number): User | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;
    user.autoApprovalLimit = autoApprovalLimit;
    user.dailyBudgetCap = dailyBudgetCap;
    return this.saveUser(user);
  }

  public getTodaySpend(userId: string): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as today_total
      FROM transactions
      WHERE buyer_user_id = ? AND payment_status = 'completed' AND created_at >= ?
    `).get(userId, startIso) as any;
    return row ? Number(row.today_total) : 0;
  }

  public updateUserCapabilities(userId: string, capabilities: UserCapabilities): User | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;
    user.capabilities = capabilities;
    return this.saveUser(user);
  }

  public updateUserWorkspace(userId: string, activeWorkspace: WorkspaceType): User | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;
    user.activeWorkspace = activeWorkspace;
    return this.saveUser(user);
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash || undefined,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      bio: row.bio || undefined,
      capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
      activeWorkspace: row.active_workspace as WorkspaceType,
      onboardingCompleted: Boolean(row.onboarding_completed),
      onboardingStep: row.onboarding_step,
      buyerPreferences: row.buyer_preferences ? JSON.parse(row.buyer_preferences) : undefined,
      sellerProfile: row.seller_profile ? JSON.parse(row.seller_profile) : undefined,
      autoApprovalLimit: typeof row.auto_approval_limit === 'number' ? row.auto_approval_limit : 200,
      dailyBudgetCap: typeof row.daily_budget_cap === 'number' ? row.daily_budget_cap : 500,
      balance: typeof row.balance === 'number' ? row.balance : 2500,
      isAutomationPaused: Boolean(row.is_automation_paused),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.role ? { role: row.role } : {})
    } as User;
  }

  // =========================================================================
  // 2. Marketplace Listings
  // =========================================================================
  public getListings(filter?: {
    sellerId?: string;
    category?: string;
    type?: string;
    status?: string;
    search?: string;
    maxPrice?: number;
  }): Listing[] {
    let sql = 'SELECT * FROM listings WHERE 1=1';
    const params: any[] = [];

    if (filter?.sellerId) {
      sql += ' AND seller_id = ?';
      params.push(filter.sellerId);
    }
    if (filter?.category && filter.category !== 'all' && filter.category !== 'undefined') {
      sql += ' AND lower(category) = lower(?)';
      params.push(filter.category);
    }
    if (filter?.type && filter.type !== 'all' && filter.type !== 'undefined') {
      sql += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.status && filter.status !== 'undefined') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.maxPrice) {
      sql += ' AND asking_price <= ?';
      params.push(filter.maxPrice);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    let list = rows.map(r => this.mapListing(r));

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return list;
  }

  public getListing(id: string): Listing | undefined {
    const row = this.db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
    return row ? this.mapListing(row) : undefined;
  }

  public saveListing(listing: Listing): Listing {
    const now = new Date().toISOString();
    listing.updatedAt = now;
    const existing = this.getListing(listing.id);

    if (existing) {
      this.db.prepare(`
        UPDATE listings SET
          seller_user_id = coalesce(?, seller_user_id),
          title = ?, description = ?, category = ?, type = ?, asking_price = ?,
          floor_price = ?, currency = ?, pricing_model = ?, delivery_days = ?,
          deliverables = ?, images = ?, is_negotiable = ?, status = ?, tags = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        listing.sellerUserId || listing.sellerId,
        listing.title,
        listing.description,
        listing.category,
        listing.type,
        listing.price,
        listing.minAcceptablePrice,
        listing.currency || 'USD',
        listing.pricingModel || 'fixed',
        listing.deliveryDays || 3,
        JSON.stringify(listing.deliverables || []),
        JSON.stringify(listing.images || []),
        listing.isNegotiable ? 1 : 0,
        listing.status,
        JSON.stringify(listing.tags || []),
        now,
        listing.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO listings (
          id, seller_id, seller_user_id, seller_agent_id, title, description, category, type,
          asking_price, floor_price, currency, pricing_model, delivery_days,
          deliverables, images, is_negotiable, status, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.id,
        listing.sellerId,
        listing.sellerUserId || listing.sellerId,
        listing.sellerAgentId || null,
        listing.title,
        listing.description,
        listing.category,
        listing.type,
        listing.price,
        listing.minAcceptablePrice,
        listing.currency || 'USD',
        listing.pricingModel || 'fixed',
        listing.deliveryDays || 3,
        JSON.stringify(listing.deliverables || []),
        JSON.stringify(listing.images || []),
        listing.isNegotiable ? 1 : 0,
        listing.status,
        JSON.stringify(listing.tags || []),
        listing.createdAt || now,
        now
      );
    }
    return listing;
  }

  public deleteListing(id: string): boolean {
    const res = this.db.prepare("UPDATE listings SET status = 'archived' WHERE id = ?").run(id);
    return res.changes > 0;
  }

  private mapListing(row: any): Listing {
    const seller = this.getUser(row.seller_user_id || row.seller_id);
    return {
      id: row.id,
      sellerId: row.seller_id,
      sellerUserId: row.seller_user_id || row.seller_id,
      sellerAgentId: row.seller_agent_id || undefined,
      title: row.title,
      description: row.description,
      category: row.category,
      type: row.type,
      price: row.asking_price,
      currency: row.currency,
      pricingModel: row.pricing_model,
      minAcceptablePrice: row.floor_price,
      deliveryDays: row.delivery_days,
      deliverables: typeof row.deliverables === 'string' ? JSON.parse(row.deliverables) : row.deliverables,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
      isNegotiable: Boolean(row.is_negotiable),
      status: row.status,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      sellerName: seller?.sellerProfile?.businessName || seller?.displayName,
      sellerAvatar: seller?.avatarUrl,
      sellerRating: seller?.sellerProfile?.rating || 5.0,
      sellerReviewCount: seller?.sellerProfile?.reviewCount || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =========================================================================
  // 3. Agents Registry
  // =========================================================================
  public getAgents(filter?: {
    ownerId?: string;
    type?: 'buyer' | 'seller' | 'research' | 'specialist';
    category?: string;
    status?: 'active' | 'paused';
  }): Agent[] {
    let sql = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];

    if (filter?.ownerId) {
      sql += ' AND owner_id = ?';
      params.push(filter.ownerId);
    }
    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.category && filter.category !== 'all') {
      sql += ' AND lower(category) = lower(?)';
      params.push(filter.category);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapAgent(r));
  }

  public getAgent(id: string): Agent | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    return row ? this.mapAgent(row) : undefined;
  }

  public saveAgent(agent: Agent): Agent {
    const now = new Date().toISOString();
    agent.updatedAt = now;
    const existing = this.getAgent(agent.id);

    if (existing) {
      this.db.prepare(`
        UPDATE agents SET
          business_name = ?, name = ?, type = ?, description = ?, category = ?,
          capabilities = ?, status = ?, verification_status = ?, catalog = ?,
          pricing_constraints = ?, policies = ?, negotiation_strategy = ?,
          approval_policy = ?, instructions = ?, communication_style = ?,
          metrics = ?, updated_at = ?
        WHERE id = ?
      `).run(
        agent.businessName,
        agent.name,
        agent.type,
        agent.description,
        agent.category,
        JSON.stringify(agent.capabilities || []),
        agent.status,
        agent.verificationStatus,
        JSON.stringify(agent.catalog || []),
        JSON.stringify(agent.pricingConstraints || {}),
        agent.policies ? JSON.stringify(agent.policies) : null,
        agent.negotiationStrategy,
        agent.approvalPolicy,
        agent.instructions || null,
        agent.communicationStyle || 'concise',
        agent.metrics ? JSON.stringify(agent.metrics) : null,
        now,
        agent.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO agents (
          id, owner_id, business_name, name, type, description, category,
          capabilities, status, verification_status, catalog, pricing_constraints,
          policies, negotiation_strategy, approval_policy, instructions,
          communication_style, metrics, operator_name, operator_role,
          operator_location, rating, review_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agent.id,
        agent.ownerId,
        agent.businessName,
        agent.name,
        agent.type,
        agent.description,
        agent.category,
        JSON.stringify(agent.capabilities || []),
        agent.status,
        agent.verificationStatus,
        JSON.stringify(agent.catalog || []),
        JSON.stringify(agent.pricingConstraints || {}),
        agent.policies ? JSON.stringify(agent.policies) : null,
        agent.negotiationStrategy,
        agent.approvalPolicy,
        agent.instructions || null,
        agent.communicationStyle || 'concise',
        agent.metrics ? JSON.stringify(agent.metrics) : null,
        agent.operatorName || null,
        agent.operatorRole || null,
        agent.operatorLocation || null,
        agent.rating || 5.0,
        agent.reviewCount || 0,
        agent.createdAt || now,
        now
      );
    }
    return agent;
  }

  public deleteAgent(id: string): boolean {
    const res = this.db.prepare("UPDATE agents SET status = 'paused' WHERE id = ?").run(id);
    return res.changes > 0;
  }

  private mapAgent(row: any): Agent {
    return {
      id: row.id,
      ownerId: row.owner_id,
      businessName: row.business_name,
      name: row.name,
      type: row.type,
      description: row.description,
      category: row.category,
      capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
      status: row.status,
      verificationStatus: row.verification_status,
      catalog: typeof row.catalog === 'string' ? JSON.parse(row.catalog) : row.catalog,
      pricingConstraints: typeof row.pricing_constraints === 'string' ? JSON.parse(row.pricing_constraints) : row.pricing_constraints,
      policies: row.policies ? JSON.parse(row.policies) : undefined,
      negotiationStrategy: row.negotiation_strategy,
      approvalPolicy: row.approval_policy,
      instructions: row.instructions || undefined,
      communicationStyle: row.communication_style || 'concise',
      metrics: row.metrics ? JSON.parse(row.metrics) : undefined,
      operatorName: row.operator_name || undefined,
      operatorRole: row.operator_role || undefined,
      operatorLocation: row.operator_location || undefined,
      rating: row.rating,
      reviewCount: row.review_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =========================================================================
  // 4. Memory
  // =========================================================================
  public getMemoryItem(id: string): MemoryItem | undefined {
    try {
      const r = this.db.prepare('SELECT * FROM memory_items WHERE id = ?').get(id) as any;
      if (!r) return undefined;
      return {
        id: r.id,
        userId: r.user_id,
        role: r.role,
        type: r.type,
        key: r.key,
        value: r.value,
        source: r.source,
        confidence: r.confidence,
        verifiedByUser: Boolean(r.verified_by_user),
        createdAt: r.created_at
      };
    } catch (e) {
      return undefined;
    }
  }

  public getMemoryItems(userId: string, role?: 'buyer' | 'seller'): MemoryItem[] {
    let sql = 'SELECT * FROM memory_items WHERE user_id = ?';
    const params: any[] = [userId];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC';
    try {
      const rows = this.db.prepare(sql).all(...params) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        role: r.role,
        type: r.type,
        key: r.key,
        value: r.value,
        source: r.source,
        confidence: r.confidence,
        verifiedByUser: Boolean(r.verified_by_user),
        createdAt: r.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  public saveMemoryItem(item: MemoryItem): MemoryItem {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO memory_items (
        id, user_id, role, type, key, value, source, confidence, verified_by_user, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.userId,
      item.role,
      item.type,
      item.key,
      item.value,
      item.source || 'user_provided',
      item.confidence || 1.0,
      item.verifiedByUser ? 1 : 0,
      item.createdAt || now
    );
    return item;
  }

  public deleteMemoryItem(id: string): boolean {
    const res = this.db.prepare('DELETE FROM memory_items WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // =========================================================================
  // 5. Commercial Requests
  // =========================================================================
  public getRequests(userId?: string): CommerceRequest[] {
    let sql = 'SELECT * FROM requests';
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE (user_id = ? OR buyer_user_id = ?)';
      params.push(userId, userId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapRequest(r));
  }

  public getRequest(id: string): CommerceRequest | undefined {
    const row = this.db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as any;
    return row ? this.mapRequest(row) : undefined;
  }

  public saveRequest(request: CommerceRequest): CommerceRequest {
    const now = new Date().toISOString();
    request.updatedAt = now;
    const existing = this.getRequest(request.id);

    if (existing) {
      this.db.prepare(`
        UPDATE requests SET
          buyer_user_id = coalesce(?, buyer_user_id),
          title = ?, category = ?, required_capabilities = ?, deliverables = ?,
          target_budget = ?, max_budget = ?, currency = ?, deadline_days = ?,
          quality_requirements = ?, additional_conditions = ?, max_candidates = ?,
          status = ?, selected_seller_agent_ids = ?, updated_at = ?
        WHERE id = ?
      `).run(
        request.buyerUserId || request.userId,
        request.title,
        request.category,
        JSON.stringify(request.requiredCapabilities || []),
        JSON.stringify(request.deliverables || []),
        (request as any).targetBudget || request.maxBudget,
        request.maxBudget,
        request.currency || 'USD',
        request.deadlineDays || 5,
        request.qualityRequirements || '',
        request.additionalConditions || null,
        request.maxCandidates || 3,
        request.status,
        request.selectedSellerAgentIds ? JSON.stringify(request.selectedSellerAgentIds) : null,
        now,
        request.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO requests (
          id, user_id, buyer_user_id, buyer_agent_id, raw_input, title, category,
          required_capabilities, deliverables, target_budget, max_budget,
          currency, deadline_days, quality_requirements, additional_conditions,
          max_candidates, status, selected_seller_agent_ids, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        request.id,
        request.userId,
        request.buyerUserId || request.userId,
        request.buyerAgentId,
        request.rawInput,
        request.title,
        request.category,
        JSON.stringify(request.requiredCapabilities || []),
        JSON.stringify(request.deliverables || []),
        (request as any).targetBudget || request.maxBudget,
        request.maxBudget,
        request.currency || 'USD',
        request.deadlineDays || 5,
        request.qualityRequirements || '',
        request.additionalConditions || null,
        request.maxCandidates || 3,
        request.status,
        request.selectedSellerAgentIds ? JSON.stringify(request.selectedSellerAgentIds) : null,
        request.createdAt || now,
        now
      );
    }
    return request;
  }

  private mapRequest(row: any): CommerceRequest {
    return {
      id: row.id,
      userId: row.user_id,
      buyerUserId: row.buyer_user_id || row.user_id,
      buyerAgentId: row.buyer_agent_id,
      rawInput: row.raw_input,
      title: row.title,
      category: row.category,
      requiredCapabilities: typeof row.required_capabilities === 'string' ? JSON.parse(row.required_capabilities) : row.required_capabilities,
      deliverables: typeof row.deliverables === 'string' ? JSON.parse(row.deliverables) : row.deliverables,
      maxBudget: row.max_budget,
      currency: row.currency,
      deadlineDays: row.deadline_days,
      qualityRequirements: row.quality_requirements,
      additionalConditions: row.additional_conditions || undefined,
      maxCandidates: row.max_candidates,
      status: row.status,
      selectedSellerAgentIds: row.selected_seller_agent_ids ? JSON.parse(row.selected_seller_agent_ids) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =========================================================================
  // 6. Negotiations & Conversations
  // =========================================================================
  public getNegotiations(filter?: { requestId?: string; agentId?: string; userId?: string; status?: string }): Negotiation[] {
    let sql = 'SELECT * FROM negotiations WHERE 1=1';
    const params: any[] = [];

    if (filter?.requestId) {
      sql += ' AND request_id = ?';
      params.push(filter.requestId);
    }
    if (filter?.agentId) {
      sql += ' AND (buyer_agent_id = ? OR seller_agent_id = ?)';
      params.push(filter.agentId, filter.agentId);
    }
    if (filter?.userId) {
      sql += ' AND (buyer_user_id = ? OR seller_user_id = ?)';
      params.push(filter.userId, filter.userId);
    }
    if (filter?.status && filter.status !== 'all') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY updated_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapNegotiation(r));
  }

  public getNegotiation(id: string): Negotiation | undefined {
    const row = this.db.prepare('SELECT * FROM negotiations WHERE id = ?').get(id) as any;
    return row ? this.mapNegotiation(row) : undefined;
  }

  public saveNegotiation(negotiation: Negotiation): Negotiation {
    const now = new Date().toISOString();
    negotiation.updatedAt = now;
    const existing = this.getNegotiation(negotiation.id);

    if (existing) {
      this.db.prepare(`
        UPDATE negotiations SET
          status = ?, current_round = ?, max_rounds = ?, current_proposal = ?,
          messages = ?, agreement_id = ?, updated_at = ?
        WHERE id = ?
      `).run(
        negotiation.status,
        negotiation.currentRound,
        negotiation.maxRounds,
        negotiation.currentProposal ? JSON.stringify(negotiation.currentProposal) : null,
        JSON.stringify(negotiation.messages || []),
        negotiation.agreementId || null,
        now,
        negotiation.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO negotiations (
          id, request_id, buyer_agent_id, seller_agent_id, buyer_user_id,
          seller_user_id, listing_id, status, current_round, max_rounds,
          current_proposal, messages, agreement_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        negotiation.id,
        negotiation.requestId,
        negotiation.buyerAgentId,
        negotiation.sellerAgentId,
        negotiation.buyerUserId || null,
        negotiation.sellerUserId || null,
        negotiation.listingId || null,
        negotiation.status,
        negotiation.currentRound,
        negotiation.maxRounds,
        negotiation.currentProposal ? JSON.stringify(negotiation.currentProposal) : null,
        JSON.stringify(negotiation.messages || []),
        negotiation.agreementId || null,
        negotiation.createdAt || now,
        now
      );
    }
    return negotiation;
  }

  private mapNegotiation(row: any): Negotiation {
    return {
      id: row.id,
      requestId: row.request_id,
      buyerAgentId: row.buyer_agent_id,
      sellerAgentId: row.seller_agent_id,
      buyerUserId: row.buyer_user_id || undefined,
      sellerUserId: row.seller_user_id || undefined,
      listingId: row.listing_id || undefined,
      status: row.status,
      currentRound: row.current_round,
      maxRounds: row.max_rounds,
      currentProposal: row.current_proposal ? JSON.parse(row.current_proposal) : null,
      messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages,
      agreementId: row.agreement_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =========================================================================
  // 7. Review Queue
  // =========================================================================
  public getReviewQueue(status?: string, userId?: string, role?: 'buyer' | 'seller'): ReviewQueueItem[] {
    let sql = 'SELECT * FROM review_queue WHERE 1=1';
    const params: any[] = [];
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (userId) {
      if (role === 'buyer') {
        sql += ' AND buyer_id = ?';
        params.push(userId);
      } else if (role === 'seller') {
        sql += ' AND seller_id = ?';
        params.push(userId);
      } else {
        sql += ' AND (buyer_id = ? OR seller_id = ?)';
        params.push(userId, userId);
      }
    }
    sql += ' ORDER BY urgency_score DESC, created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      negotiationId: r.negotiation_id,
      requestId: r.request_id,
      sellerId: r.seller_id,
      buyerId: r.buyer_id,
      urgency: r.urgency,
      urgencyScore: r.urgency_score,
      aiRecommendation: r.ai_recommendation,
      confidence: r.confidence,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
      proposedPrice: r.proposed_price,
      buyerMaxBudget: r.buyer_max_budget,
      sellerFloorPrice: r.seller_floor_price,
      status: r.status,
      resolutionNote: r.resolution_note,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at
    }));
  }

  public getReviewQueueItem(id: string): ReviewQueueItem | undefined {
    const r = this.db.prepare('SELECT * FROM review_queue WHERE id = ?').get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      negotiationId: r.negotiation_id,
      requestId: r.request_id,
      sellerId: r.seller_id,
      buyerId: r.buyer_id,
      urgency: r.urgency,
      urgencyScore: r.urgency_score,
      aiRecommendation: r.ai_recommendation,
      confidence: r.confidence,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
      proposedPrice: r.proposed_price,
      buyerMaxBudget: r.buyer_max_budget,
      sellerFloorPrice: r.seller_floor_price,
      status: r.status,
      resolutionNote: r.resolution_note,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at
    };
  }

  public getReviewQueueItemByNegotiation(negotiationId: string): ReviewQueueItem | undefined {
    const r = this.db.prepare('SELECT * FROM review_queue WHERE negotiation_id = ? ORDER BY created_at DESC LIMIT 1').get(negotiationId) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      negotiationId: r.negotiation_id,
      requestId: r.request_id,
      sellerId: r.seller_id,
      buyerId: r.buyer_id,
      urgency: r.urgency,
      urgencyScore: r.urgency_score,
      aiRecommendation: r.ai_recommendation,
      confidence: r.confidence,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
      proposedPrice: r.proposed_price,
      buyerMaxBudget: r.buyer_max_budget,
      sellerFloorPrice: r.seller_floor_price,
      status: r.status,
      resolutionNote: r.resolution_note,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at
    };
  }

  public saveReviewQueueItem(item: ReviewQueueItem): ReviewQueueItem {
    const existing = this.getReviewQueueItem(item.id);
    if (existing) {
      this.db.prepare(`
        UPDATE review_queue SET
          status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ?
        WHERE id = ?
      `).run(
        item.status,
        item.resolutionNote || null,
        item.resolvedBy || null,
        item.resolvedAt || null,
        item.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO review_queue (
          id, negotiation_id, request_id, seller_id, buyer_id, urgency,
          urgency_score, ai_recommendation, confidence, reasons, proposed_price,
          buyer_max_budget, seller_floor_price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id,
        item.negotiationId,
        item.requestId,
        item.sellerId,
        item.buyerId,
        item.urgency,
        item.urgencyScore,
        item.aiRecommendation,
        item.confidence,
        JSON.stringify(item.reasons || []),
        item.proposedPrice,
        item.buyerMaxBudget,
        item.sellerFloorPrice,
        item.status,
        item.createdAt || new Date().toISOString()
      );
    }
    return item;
  }

  // =========================================================================
  // 8. Proposals & Evaluations
  // =========================================================================
  public getProposals(negotiationId: string): Proposal[] {
    const rows = this.db.prepare('SELECT * FROM proposals WHERE negotiation_id = ? ORDER BY round ASC').all(negotiationId) as any[];
    return rows.map(r => ({
      id: r.id,
      negotiationId: r.negotiation_id,
      senderAgentId: r.sender_agent_id,
      round: r.round,
      price: r.price,
      currency: r.currency,
      deliverables: typeof r.deliverables === 'string' ? JSON.parse(r.deliverables) : r.deliverables,
      deliveryDays: r.delivery_days,
      terms: r.terms,
      validUntil: r.valid_until,
      status: r.status,
      revisions: r.revisions !== undefined && r.revisions !== null ? Number(r.revisions) : 2,
      paymentTerms: r.payment_terms || 'escrow_milestone',
      tradesMade: r.trades_made ? (typeof r.trades_made === 'string' ? JSON.parse(r.trades_made) : r.trades_made) : [],
      utilityScore: r.utility_score !== undefined && r.utility_score !== null ? Number(r.utility_score) : undefined,
      whyThisOffer: r.why_this_offer || undefined,
      createdAt: r.created_at
    }));
  }

  public saveProposal(proposal: Proposal): Proposal {
    this.db.prepare(`
      INSERT OR REPLACE INTO proposals (
        id, negotiation_id, sender_agent_id, round, price, currency,
        deliverables, delivery_days, terms, valid_until, status,
        revisions, payment_terms, trades_made, utility_score, why_this_offer,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.id,
      proposal.negotiationId,
      proposal.senderAgentId,
      proposal.round,
      proposal.price,
      proposal.currency || 'USD',
      JSON.stringify(proposal.deliverables || []),
      proposal.deliveryDays,
      proposal.terms,
      proposal.validUntil,
      proposal.status,
      proposal.revisions ?? 2,
      proposal.paymentTerms || 'escrow_milestone',
      JSON.stringify(proposal.tradesMade || []),
      proposal.utilityScore ?? null,
      proposal.whyThisOffer || null,
      proposal.createdAt || new Date().toISOString()
    );
    return proposal;
  }

  public getEvaluation(requestId: string): MultiProposalComparison | undefined {
    const row = this.db.prepare('SELECT * FROM evaluations WHERE request_id = ?').get(requestId) as any;
    if (!row) return undefined;
    return {
      requestId: row.request_id,
      evaluations: typeof row.evaluations === 'string' ? JSON.parse(row.evaluations) : row.evaluations,
      recommendedNegotiationId: row.recommended_negotiation_id || '',
      summaryVerdict: row.summary_verdict,
      evaluatedAt: row.evaluated_at
    };
  }

  public saveEvaluation(evaluation: MultiProposalComparison): MultiProposalComparison {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO evaluations (
        request_id, evaluations, recommended_negotiation_id, summary_verdict, evaluated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      evaluation.requestId,
      JSON.stringify(evaluation.evaluations || []),
      evaluation.recommendedNegotiationId || null,
      evaluation.summaryVerdict,
      evaluation.evaluatedAt || now
    );
    return evaluation;
  }

  // =========================================================================
  // 9. Agreements & Transactions
  // =========================================================================
  public getAgreements(userId?: string): Agreement[] {
    let sql = 'SELECT * FROM agreements';
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE buyer_user_id = ? OR seller_user_id = ?';
      params.push(userId, userId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapAgreement(r));
  }

  public getAgreement(id: string): Agreement | undefined {
    const row = this.db.prepare('SELECT * FROM agreements WHERE id = ?').get(id) as any;
    return row ? this.mapAgreement(row) : undefined;
  }

  public saveAgreement(agreement: Agreement): Agreement {
    const existing = this.getAgreement(agreement.id);

    if (existing) {
      this.db.prepare(`
        UPDATE agreements SET
          final_price = ?, final_deliverables = ?, delivery_days = ?,
          commercial_terms = ?, human_approval_status = ?, human_approved_at = ?,
          seller_acceptance_status = ?, seller_accepted_at = ?, rejection_reason = ?,
          paypal_ready = ?, trades_summary = ?, what_buyer_gave = ?, what_seller_gave = ?,
          payment_terms = ?, revisions = ?
        WHERE id = ?
      `).run(
        agreement.finalPrice,
        JSON.stringify(agreement.finalDeliverables || []),
        agreement.deliveryDays,
        agreement.commercialTerms,
        agreement.humanApprovalStatus,
        agreement.humanApprovedAt || null,
        agreement.sellerAcceptanceStatus || 'accepted',
        agreement.sellerAcceptedAt || null,
        agreement.rejectionReason || null,
        agreement.paypalReady ? 1 : 0,
        JSON.stringify(agreement.tradesSummary || []),
        JSON.stringify(agreement.whatBuyerGave || []),
        JSON.stringify(agreement.whatSellerGave || []),
        agreement.paymentTerms || 'escrow_milestone',
        agreement.revisions ?? 2,
        agreement.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO agreements (
          id, negotiation_id, request_id, buyer_agent_id, seller_agent_id,
          buyer_user_id, seller_user_id, seller_business_name, final_price,
          currency, final_deliverables, delivery_days, commercial_terms,
          human_approval_status, human_approved_at, seller_acceptance_status,
          seller_accepted_at, rejection_reason, paypal_ready,
          trades_summary, what_buyer_gave, what_seller_gave, payment_terms, revisions,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agreement.id,
        agreement.negotiationId,
        agreement.requestId,
        agreement.buyerAgentId,
        agreement.sellerAgentId,
        agreement.buyerUserId,
        agreement.sellerUserId || null,
        agreement.sellerBusinessName,
        agreement.finalPrice,
        agreement.currency || 'USD',
        JSON.stringify(agreement.finalDeliverables || []),
        agreement.deliveryDays,
        agreement.commercialTerms,
        agreement.humanApprovalStatus || 'approved',
        agreement.humanApprovedAt || null,
        agreement.sellerAcceptanceStatus || 'accepted',
        agreement.sellerAcceptedAt || null,
        agreement.rejectionReason || null,
        agreement.paypalReady ? 1 : 0,
        JSON.stringify(agreement.tradesSummary || []),
        JSON.stringify(agreement.whatBuyerGave || []),
        JSON.stringify(agreement.whatSellerGave || []),
        agreement.paymentTerms || 'escrow_milestone',
        agreement.revisions ?? 2,
        agreement.createdAt || new Date().toISOString()
      );
    }
    return agreement;
  }

  private mapAgreement(row: any): Agreement {
    return {
      id: row.id,
      negotiationId: row.negotiation_id,
      requestId: row.request_id,
      buyerAgentId: row.buyer_agent_id,
      sellerAgentId: row.seller_agent_id,
      buyerUserId: row.buyer_user_id,
      sellerUserId: row.seller_user_id || undefined,
      sellerBusinessName: row.seller_business_name,
      finalPrice: row.final_price,
      currency: row.currency,
      finalDeliverables: typeof row.final_deliverables === 'string' ? JSON.parse(row.final_deliverables) : row.final_deliverables,
      deliveryDays: row.delivery_days,
      commercialTerms: row.commercial_terms,
      tradesSummary: row.trades_summary ? (typeof row.trades_summary === 'string' ? JSON.parse(row.trades_summary) : row.trades_summary) : [],
      whatBuyerGave: row.what_buyer_gave ? (typeof row.what_buyer_gave === 'string' ? JSON.parse(row.what_buyer_gave) : row.what_buyer_gave) : [],
      whatSellerGave: row.what_seller_gave ? (typeof row.what_seller_gave === 'string' ? JSON.parse(row.what_seller_gave) : row.what_seller_gave) : [],
      paymentTerms: row.payment_terms || 'escrow_milestone',
      revisions: row.revisions !== undefined && row.revisions !== null ? Number(row.revisions) : 2,
      humanApprovalStatus: row.human_approval_status,
      humanApprovedAt: row.human_approved_at || undefined,
      sellerAcceptanceStatus: row.seller_acceptance_status,
      sellerAcceptedAt: row.seller_accepted_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      paypalReady: Boolean(row.paypal_ready),
      createdAt: row.created_at
    };
  }

  public getTransactions(userId?: string): Transaction[] {
    let sql = 'SELECT * FROM transactions';
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE (buyer_user_id = ? OR seller_user_id = ?)';
      params.push(userId, userId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapTransaction(r));
  }

  public getTransaction(id: string): Transaction | undefined {
    const r = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    return r ? this.mapTransaction(r) : undefined;
  }

  public getTransactionByAgreement(agreementId: string): Transaction | undefined {
    const r = this.db.prepare('SELECT * FROM transactions WHERE agreement_id = ?').get(agreementId) as any;
    return r ? this.mapTransaction(r) : undefined;
  }

  public getTransactionByPaypalOrderId(orderId: string): Transaction | undefined {
    const r = this.db.prepare('SELECT * FROM transactions WHERE paypal_order_id = ?').get(orderId) as any;
    return r ? this.mapTransaction(r) : undefined;
  }

  public saveTransaction(tx: Transaction): Transaction {
    this.db.prepare(`
      INSERT OR REPLACE INTO transactions (
        id, agreement_id, negotiation_id, request_id, buyer_user_id, seller_user_id, buyer_agent_name,
        seller_agent_id, seller_business_name, service_title, amount, currency,
        paypal_order_id, paypal_capture_id, paypal_payer_email, paypal_payer_name,
        payment_status, idempotency_key, seller_share_held, seller_payout_status, seller_payout_at,
        created_at, completed_at, failure_reason, is_sandbox
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tx.id,
      tx.agreementId,
      tx.negotiationId,
      tx.requestId,
      tx.buyerUserId,
      tx.sellerUserId || null,
      tx.buyerAgentName,
      tx.sellerAgentId,
      tx.sellerBusinessName,
      tx.serviceTitle,
      tx.amount,
      tx.currency || 'USD',
      tx.paypalOrderId || null,
      tx.paypalCaptureId || null,
      tx.paypalPayerEmail || null,
      tx.paypalPayerName || null,
      tx.paymentStatus,
      tx.idempotencyKey,
      tx.sellerShareHeld ?? null,
      tx.sellerPayoutStatus || 'held',
      tx.sellerPayoutAt || null,
      tx.createdAt || new Date().toISOString(),
      tx.completedAt || null,
      tx.failureReason || null,
      tx.isSandbox ? 1 : 0
    );
    return tx;
  }

  private mapTransaction(r: any): Transaction {
    return {
      id: r.id,
      agreementId: r.agreement_id,
      negotiationId: r.negotiation_id,
      requestId: r.request_id,
      buyerUserId: r.buyer_user_id,
      sellerUserId: r.seller_user_id || undefined,
      buyerAgentName: r.buyer_agent_name,
      sellerAgentId: r.seller_agent_id,
      sellerBusinessName: r.seller_business_name,
      serviceTitle: r.service_title,
      amount: r.amount,
      currency: r.currency,
      paypalOrderId: r.paypal_order_id || undefined,
      paypalCaptureId: r.paypal_capture_id || undefined,
      paypalPayerEmail: r.paypal_payer_email || undefined,
      paypalPayerName: r.paypal_payer_name || undefined,
      paymentStatus: r.payment_status,
      idempotencyKey: r.idempotency_key,
      sellerShareHeld: r.seller_share_held !== null ? Number(r.seller_share_held) : undefined,
      sellerPayoutStatus: r.seller_payout_status || undefined,
      sellerPayoutAt: r.seller_payout_at || undefined,
      createdAt: r.created_at,
      completedAt: r.completed_at || undefined,
      failureReason: r.failure_reason || undefined,
      isSandbox: Boolean(r.is_sandbox)
    };
  }

  // =========================================================================
  // 10. Notifications & Reviews
  // =========================================================================
  public getNotification(id: string): AppNotification | undefined {
    try {
      const r = this.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as any;
      if (!r) return undefined;
      return {
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        type: r.type,
        linkUrl: r.link_url || undefined,
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
        read: Boolean(r.read),
        createdAt: r.created_at
      };
    } catch (e) {
      return undefined;
    }
  }

  public getNotifications(userId: string): AppNotification[] {
    const rows = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      linkUrl: r.link_url || undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      read: Boolean(r.read),
      createdAt: r.created_at
    }));
  }

  public saveNotification(notification: AppNotification): AppNotification {
    this.db.prepare(`
      INSERT OR REPLACE INTO notifications (id, user_id, title, message, type, link_url, metadata, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      notification.id,
      notification.userId,
      notification.title,
      notification.message,
      notification.type,
      notification.linkUrl || null,
      notification.metadata ? JSON.stringify(notification.metadata) : null,
      notification.read ? 1 : 0,
      notification.createdAt || new Date().toISOString()
    );
    return notification;
  }

  public markNotificationRead(id: string): boolean {
    const res = this.db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public getReviews(sellerId?: string): Review[] {
    return [];
  }

  public saveReview(review: Review): Review {
    return review;
  }

  // =========================================================================
  // 11. Activity Events & Network Stats
  // =========================================================================
  public logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
    const id = `evt_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO activity_events (id, user_id, type, title, description, agent_id, negotiation_id, transaction_id, amount, currency, severity, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      event.userId || null,
      event.type,
      event.title,
      event.description,
      event.agentId || null,
      event.negotiationId || null,
      event.transactionId || null,
      event.amount || null,
      event.currency || null,
      event.severity || 'info',
      now
    );
    return {
      ...event,
      id,
      timestamp: now
    };
  }

  public getActivityEvents(limit = 30): ActivityEvent[] {
    const rows = this.db.prepare('SELECT * FROM activity_events ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || undefined,
      type: r.type,
      title: r.title,
      description: r.description,
      agentId: r.agent_id || undefined,
      negotiationId: r.negotiation_id || undefined,
      transactionId: r.transaction_id || undefined,
      amount: r.amount || undefined,
      currency: r.currency || undefined,
      severity: r.severity || 'info',
      timestamp: r.timestamp
    }));
  }

  public getNetworkStats(): NetworkStats {
    const activeAgents = (this.db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").get() as any).count;
    const totalAgents = (this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as any).count;
    const activeNegotiations = (this.db.prepare("SELECT COUNT(*) as count FROM negotiations WHERE status IN ('initiated', 'in_progress', 'escalated')").get() as any).count;
    const agreementsReached = (this.db.prepare('SELECT COUNT(*) as count FROM agreements').get() as any).count;
    const completedTx = this.db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, COALESCE(AVG(amount), 0) as avg FROM transactions WHERE payment_status = 'completed'").get() as any;

    return {
      activeAgents,
      totalAgents,
      activeNegotiations,
      agreementsReached,
      completedTransactions: completedTx.count,
      totalTransactionVolume: Math.round(completedTx.total),
      averageTransactionValue: Math.round(completedTx.avg),
      averageNegotiationRounds: 2.5,
      successRatePercentage: agreementsReached > 0 ? 100 : 95,
      isSimulatedDataIncluded: false
    };
  }

  // =========================================================================
  // 12. Decision Audit Logs
  // =========================================================================
  public logAudit(log: Omit<AuditLogItem, 'id' | 'createdAt'>): AuditLogItem {
    const id = `aud_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, policy_matched, decision,
        actor, confidence, reasons, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      log.entityType,
      log.entityId,
      log.action,
      log.policyMatched,
      log.decision,
      log.actor,
      log.confidence || null,
      JSON.stringify(log.reasons || []),
      JSON.stringify(log.metadata || {}),
      now
    );
    return { ...log, id, createdAt: now };
  }

  public getAuditLogs(entityId?: string, limit = 50): AuditLogItem[] {
    let sql = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    if (entityId) {
      sql += ' WHERE entity_id = ?';
      params.push(entityId);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      policyMatched: r.policy_matched,
      decision: r.decision,
      actor: r.actor,
      confidence: r.confidence || undefined,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at
    }));
  }

  // =========================================================================
  // 13. Tuning Overrides
  // =========================================================================
  public logTuningOverride(item: Omit<TuningOverrideItem, 'id' | 'createdAt'>): TuningOverrideItem {
    const id = `ovr_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO tuning_overrides (
        id, queue_item_id, original_recommendation, override_action,
        override_note, suggested_policy_change, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.queueItemId,
      item.originalRecommendation,
      item.overrideAction,
      item.overrideNote,
      item.suggestedPolicyChange || null,
      item.status || 'logged',
      now
    );
    return { ...item, id, createdAt: now };
  }

  public getTuningOverrides(): TuningOverrideItem[] {
    const rows = this.db.prepare('SELECT * FROM tuning_overrides ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      queueItemId: r.queue_item_id,
      originalRecommendation: r.original_recommendation,
      overrideAction: r.override_action,
      overrideNote: r.override_note,
      suggestedPolicyChange: r.suggested_policy_change || undefined,
      status: r.status,
      createdAt: r.created_at
    }));
  }

  public updateTuningOverrideStatus(id: string, status: string): boolean {
    const res = this.db.prepare('UPDATE tuning_overrides SET status = ? WHERE id = ?').run(status, id);
    return res.changes > 0;
  }

  // =========================================================================
  // 14. Decisions
  // =========================================================================
  public saveDecision(decision: DecisionRecord): DecisionRecord {
    const now = new Date().toISOString();
    decision.updatedAt = now;
    const existing = this.getDecision(decision.id);

    if (existing) {
      this.db.prepare(`
        UPDATE decisions SET
          entity_type = ?, entity_id = ?, user_id = ?, status = ?,
          reasons = ?, recommendation = ?, signals = ?, confidence = ?,
          decided_by = ?, undo_until = ?, expires_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        decision.entityType,
        decision.entityId,
        decision.userId,
        decision.status,
        JSON.stringify(decision.reasons || []),
        decision.recommendation,
        JSON.stringify(decision.signals || {}),
        decision.confidence,
        decision.decidedBy,
        decision.undoUntil || null,
        decision.expiresAt || null,
        now,
        decision.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO decisions (
          id, entity_type, entity_id, user_id, status, reasons,
          recommendation, signals, confidence, decided_by, undo_until,
          expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        decision.id,
        decision.entityType,
        decision.entityId,
        decision.userId,
        decision.status,
        JSON.stringify(decision.reasons || []),
        decision.recommendation,
        JSON.stringify(decision.signals || {}),
        decision.confidence,
        decision.decidedBy,
        decision.undoUntil || null,
        decision.expiresAt || null,
        decision.createdAt || now,
        now
      );
    }
    return decision;
  }

  public getDecision(id: string): DecisionRecord | undefined {
    const r = this.db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as any;
    return r ? this.mapDecision(r) : undefined;
  }

  public getDecisionByEntity(entityType: string, entityId: string): DecisionRecord | undefined {
    const r = this.db.prepare('SELECT * FROM decisions WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1').get(entityType, entityId) as any;
    return r ? this.mapDecision(r) : undefined;
  }

  public getDecisionsByUser(userId: string, limit = 50): DecisionRecord[] {
    const rows = this.db.prepare('SELECT * FROM decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[];
    return rows.map(r => this.mapDecision(r));
  }

  public getRecentDecisions(limit = 50, userId?: string): DecisionRecord[] {
    let sql = 'SELECT * FROM decisions WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapDecision(r));
  }

  public updateDecisionStatus(
    id: string,
    status: DecisionStatus,
    resolvedBy: 'ai' | 'user' | 'rule' = 'user',
    note?: string
  ): DecisionRecord | undefined {
    const decision = this.getDecision(id);
    if (!decision) return undefined;

    const prevStatus = decision.status;
    const now = new Date().toISOString();
    decision.status = status;
    decision.decidedBy = resolvedBy;
    decision.updatedAt = now;
    if (note) {
      decision.reasons = [...decision.reasons, note];
    }

    this.saveDecision(decision);

    this.logAudit({
      entityType: decision.entityType,
      entityId: decision.entityId,
      action: `decision_status_changed_to_${status}`,
      policyMatched: 'human_review_policy',
      decision: status,
      actor: resolvedBy === 'user' ? 'user' : 'ai_engine',
      confidence: decision.confidence,
      reasons: decision.reasons,
      metadata: { note, previousStatus: prevStatus }
    });

    return decision;
  }

  private mapDecision(r: any): DecisionRecord {
    return {
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      userId: r.user_id,
      status: r.status,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
      recommendation: r.recommendation,
      signals: typeof r.signals === 'string' ? JSON.parse(r.signals) : r.signals,
      confidence: r.confidence,
      decidedBy: r.decided_by,
      undoUntil: r.undo_until || undefined,
      expiresAt: r.expires_at || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
}

export const store = new SQLiteStore();
