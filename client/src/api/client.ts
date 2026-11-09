import {
  User,
  Listing,
  Agent,
  MemoryItem,
  CommerceRequest,
  Negotiation,
  Agreement,
  Transaction,
  ActivityEvent,
  AppNotification,
  NetworkStats,
  MultiProposalComparison,
  UserCapabilities,
  WorkspaceType,
  HomePayload,
  Proposal
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  let json: any;
  try {
    json = await res.json();
  } catch (err) {
    if (!res.ok) {
      throw new Error(`Request failed with HTTP status ${res.status}: ${res.statusText}`);
    }
    throw new Error('Server returned an invalid JSON response');
  }

  const extractErrorMessage = (data: any): string => {
    if (!data) return '';
    const baseMsg = typeof data.error === 'string' 
      ? data.error 
      : data.message || (data.data?.errorMessage ? data.data.errorMessage : '');
    if (baseMsg) {
      if (data.nextStep) {
        return `${baseMsg} ${data.nextStep}`;
      }
      return baseMsg;
    }
    if (data.error && typeof data.error === 'object') {
      if (data.error._errors && Array.isArray(data.error._errors) && data.error._errors.length > 0) {
        return data.error._errors.join(', ');
      }
      return JSON.stringify(data.error);
    }
    return '';
  };

  if (!res.ok) {
    const errorMsg = extractErrorMessage(json) || `Request failed with HTTP status ${res.status}`;
    throw new Error(errorMsg);
  }

  if (json.success === false) {
    const errorMsg = extractErrorMessage(json) || 'Operation was not successful';
    throw new Error(errorMsg);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Unified Home Dashboard & Autonomous Commerce Queue
  getHome: () => fetchJson<HomePayload>(`${API_BASE}/home`),
  approveReviewItem: (id: string, note?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/home/review/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note })
    }),
  declineReviewItem: (id: string, note?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/home/review/${id}/decline`, {
      method: 'POST',
      body: JSON.stringify({ note })
    }),
  counterReviewItem: (id: string, counterPrice: number, note?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/home/review/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify({ counterPrice, note })
    }),
  overrideReviewItem: (id: string, action: string, note: string, suggestRule?: boolean) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/home/review/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({ action, note, suggestRule })
    }),
  setAutomationPaused: (isPaused: boolean) =>
    fetchJson<{ success: boolean; data: { isAutomationPaused: boolean } }>(`${API_BASE}/home/automation-pause`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaused })
    }),
  updateLimits: (autoApprovalLimit: number, dailyBudgetCap: number) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/home/limits`, {
      method: 'PATCH',
      body: JSON.stringify({ autoApprovalLimit, dailyBudgetCap })
    }),
  getOverrides: () => fetchJson<any[]>(`${API_BASE}/home/overrides`),
  applyOverride: (id: string) => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/home/overrides/${id}/apply`, { method: 'POST' }),

  // Authentication & Unified Identity
  getMe: () => fetchJson<User>(`${API_BASE}/auth/me`),
  login: (email: string, password?: string) =>
    fetchJson<User>(`${API_BASE}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload: { email: string; password?: string; displayName: string; username?: string; capabilities?: UserCapabilities }) =>
    fetchJson<User>(`${API_BASE}/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/auth/logout`, { method: 'POST' }),
  updateCapabilities: (capabilities: UserCapabilities) =>
    fetchJson<User>(`${API_BASE}/auth/capabilities`, { method: 'PATCH', body: JSON.stringify(capabilities) }),
  updateWorkspace: (workspace: WorkspaceType) =>
    fetchJson<User>(`${API_BASE}/auth/workspace`, { method: 'PATCH', body: JSON.stringify({ workspace }) }),
  updateOnboarding: (payload: any) =>
    fetchJson<User>(`${API_BASE}/auth/onboarding`, { method: 'POST', body: JSON.stringify(payload) }),

  // Marketplace Listings (Products & Services)
  getListings: (params?: { sellerId?: string; category?: string; type?: string; status?: string; search?: string; maxPrice?: number }) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All') {
          cleanParams[k] = String(v);
        }
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return fetchJson<Listing[]>(`${API_BASE}/listings${query ? `?${query}` : ''}`);
  },
  getListing: (id: string) => fetchJson<Listing & { seller?: User; sellerAgent?: Agent }>(`${API_BASE}/listings/${id}`),
  createListing: (data: Partial<Listing>) => fetchJson<Listing>(`${API_BASE}/listings`, { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (id: string, data: Partial<Listing>) => fetchJson<Listing>(`${API_BASE}/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteListing: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/listings/${id}`, { method: 'DELETE' }),

  // Personal AI Context & Memory
  getMemoryItems: (role?: 'buyer' | 'seller') => {
    const query = role ? `?role=${role}` : '';
    return fetchJson<MemoryItem[]>(`${API_BASE}/memory${query}`);
  },
  addMemoryItem: (item: { role: 'buyer' | 'seller'; type?: string; key: string; value: string }) =>
    fetchJson<MemoryItem>(`${API_BASE}/memory`, { method: 'POST', body: JSON.stringify(item) }),
  deleteMemoryItem: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/memory/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => fetchJson<AppNotification[]>(`${API_BASE}/notifications`),
  markNotificationRead: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH' }),

  // System & AI Diagnostics
  getSystemStatus: () => fetchJson<{ service: string; version: string; providers: any }>(`${API_BASE}/system/status`),
  getAIStatus: () => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/status`),
  testAI: (apiKey?: string) => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/test`, { method: 'POST', body: JSON.stringify({ apiKey }) }),
  configureAI: (apiKey: string) => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/configure`, { method: 'POST', body: JSON.stringify({ apiKey }) }),

  // Network & Agents
  getAgents: (params?: { ownerId?: string; type?: string; category?: string; status?: string }) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All') {
          cleanParams[k] = String(v);
        }
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return fetchJson<Agent[]>(`${API_BASE}/agents${query ? `?${query}` : ''}`);
  },
  getAgent: (id: string) => fetchJson<Agent>(`${API_BASE}/agents/${id}`),
  createAgent: (data: Partial<Agent>) => fetchJson<Agent>(`${API_BASE}/agents`, { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Partial<Agent>) => fetchJson<Agent>(`${API_BASE}/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAgent: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/agents/${id}`, { method: 'DELETE' }),
  auditAgentSkill: (id: string) => fetchJson<{ agent: Agent; audit: any }>(`${API_BASE}/agents/${id}/ai-review`, { method: 'POST' }),

  // Requests
  parsePurchasingPrompt: (prompt: string) => fetchJson<any>(`${API_BASE}/requests/parse`, { method: 'POST', body: JSON.stringify({ prompt }) }),
  createRequest: (data: Partial<CommerceRequest>) => fetchJson<CommerceRequest>(`${API_BASE}/requests`, { method: 'POST', body: JSON.stringify(data) }),
  getRequests: () => fetchJson<CommerceRequest[]>(`${API_BASE}/requests`),
  getRequest: (id: string) => fetchJson<CommerceRequest>(`${API_BASE}/requests/${id}`),

  // Negotiations
  getNegotiations: (params?: { requestId?: string; agentId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<Negotiation[]>(`${API_BASE}/negotiations${query ? `?${query}` : ''}`);
  },
  getNegotiationDetail: (id: string) => fetchJson<Negotiation & {
    buyerAgent: Agent;
    sellerAgent: Agent;
    request: CommerceRequest;
    agreement?: Agreement;
    decision?: any;
    queueItem?: any;
    proposals?: Proposal[];
  }>(`${API_BASE}/negotiations/${id}`),
  initiateNegotiation: (requestId: string, sellerAgentId: string) => fetchJson<Negotiation>(`${API_BASE}/negotiations/initiate`, { method: 'POST', body: JSON.stringify({ requestId, sellerAgentId }) }),
  stepNegotiation: (id: string) => fetchJson<Negotiation>(`${API_BASE}/negotiations/${id}/step`, { method: 'POST' }),
  sendMessage: (
    negotiationId: string,
    payloadOrContent: string | { content: string; senderRole?: 'buyer' | 'seller'; senderType?: 'human' | 'agent' },
    senderRole: 'buyer' | 'seller' = 'buyer'
  ) => {
    const body = typeof payloadOrContent === 'string'
      ? { content: payloadOrContent, senderRole }
      : payloadOrContent;
    return fetchJson<{ data: any; negotiation: Negotiation }>(`${API_BASE}/negotiations/${negotiationId}/message`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  runMultiAgentNegotiation: (requestId: string, sellerIds: string[]) => fetchJson<{ negotiations: Negotiation[]; evaluation: MultiProposalComparison }>(`${API_BASE}/negotiations/multi-agent`, { method: 'POST', body: JSON.stringify({ requestId, sellerIds }) }),
  getEvaluation: (requestId: string) => fetchJson<MultiProposalComparison>(`${API_BASE}/negotiations/evaluation/${requestId}`),

  // Agreements
  getAgreements: () => fetchJson<Agreement[]>(`${API_BASE}/agreements`),
  getAgreement: (id: string) => fetchJson<Agreement & { negotiation: Negotiation; transaction?: Transaction }>(`${API_BASE}/agreements/${id}`),
  authorizeAgreement: (id: string) => fetchJson<Agreement>(`${API_BASE}/agreements/${id}/authorize`, { method: 'POST' }),
  sellerAcceptAgreement: (id: string) => fetchJson<Agreement>(`${API_BASE}/agreements/${id}/seller-accept`, { method: 'POST' }),

  // Payments & PayPal Sandbox
  getPayPalConfig: () => fetchJson<{ clientId: string; env: string; mode: string; isConfigured: boolean }>(`${API_BASE}/payments/config`),
  getPaymentsHealth: () => fetchJson<{ ok: boolean; connected: boolean; env: string; appId?: string; debugId?: string; reason?: string }>(`${API_BASE}/payments/health`),
  createPayPalOrder: (agreementId: string, idempotencyKey?: string) => fetchJson<{ orderId: string; approvalUrl?: string; amount: number; currency: string; status: string; isSimulated: boolean }>(`${API_BASE}/payments/create-order`, { method: 'POST', body: JSON.stringify({ agreementId, idempotencyKey }) }),
  capturePayPalOrder: (orderId: string, idempotencyKey?: string) => fetchJson<Transaction>(`${API_BASE}/payments/capture-order`, { method: 'POST', body: JSON.stringify({ orderId, idempotencyKey }) }),

  // Transactions
  getTransactions: () => fetchJson<Transaction[]>(`${API_BASE}/transactions`),
  getTransaction: (id: string) => fetchJson<Transaction & { agreement: Agreement; negotiation: Negotiation; sellerAgent: Agent }>(`${API_BASE}/transactions/${id}`),

  // Analytics & Activity
  getAnalytics: () => fetchJson<{ stats: NetworkStats; categoryDistribution: Record<string, number>; transactionStatusDistribution: Record<string, number>; recentVolume: number; agentCount: number }>(`${API_BASE}/analytics`),
  getActivity: (limit = 30) => fetchJson<ActivityEvent[]>(`${API_BASE}/activity?limit=${limit}`)
};
