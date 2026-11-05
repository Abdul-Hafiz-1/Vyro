import {
  Agent,
  CommerceRequest,
  Negotiation,
  Agreement,
  Transaction,
  ActivityEvent,
  NetworkStats,
  MultiProposalComparison
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data;
}

export const api = {
  // System & AI Diagnostics
  getSystemStatus: () => fetchJson<{ service: string; version: string; providers: any }>(`${API_BASE}/system/status`),
  resetDemoData: () => fetchJson<{ message: string }>(`${API_BASE}/system/reset-demo`, { method: 'POST' }),
  seedDemoFlow: () => fetchJson<{ request: CommerceRequest; negotiations: Negotiation[]; evaluation: MultiProposalComparison; agreement: Agreement }>(`${API_BASE}/system/seed-demo-flow`, { method: 'POST' }),
  getAIStatus: () => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/status`),
  testAI: (apiKey?: string) => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/test`, { method: 'POST', body: JSON.stringify({ apiKey }) }),
  configureAI: (apiKey: string) => fetchJson<{ status: string; model: string; isLive: boolean; latencyMs?: number; lastTestedAt?: string; errorMessage?: string }>(`${API_BASE}/ai/configure`, { method: 'POST', body: JSON.stringify({ apiKey }) }),

  // Network & Agents
  getAgents: (params?: { type?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<Agent[]>(`${API_BASE}/agents${query ? `?${query}` : ''}`);
  },
  getAgent: (id: string) => fetchJson<Agent>(`${API_BASE}/agents/${id}`),
  createAgent: (data: Partial<Agent>) => fetchJson<Agent>(`${API_BASE}/agents`, { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Partial<Agent>) => fetchJson<Agent>(`${API_BASE}/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAgent: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/agents/${id}`, { method: 'DELETE' }),

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
  getNegotiationDetail: (id: string) => fetchJson<Negotiation & { buyerAgent: Agent; sellerAgent: Agent; request: CommerceRequest; agreement?: Agreement }>(`${API_BASE}/negotiations/${id}`),
  initiateNegotiation: (requestId: string, sellerAgentId: string) => fetchJson<Negotiation>(`${API_BASE}/negotiations/initiate`, { method: 'POST', body: JSON.stringify({ requestId, sellerAgentId }) }),
  stepNegotiation: (id: string) => fetchJson<Negotiation>(`${API_BASE}/negotiations/${id}/step`, { method: 'POST' }),
  runMultiAgentNegotiation: (requestId: string, sellerIds: string[]) => fetchJson<{ negotiations: Negotiation[]; evaluation: MultiProposalComparison }>(`${API_BASE}/negotiations/multi-agent`, { method: 'POST', body: JSON.stringify({ requestId, sellerIds }) }),
  getEvaluation: (requestId: string) => fetchJson<MultiProposalComparison>(`${API_BASE}/negotiations/evaluation/${requestId}`),

  // Agreements
  getAgreements: () => fetchJson<Agreement[]>(`${API_BASE}/agreements`),
  getAgreement: (id: string) => fetchJson<Agreement & { negotiation: Negotiation; transaction?: Transaction }>(`${API_BASE}/agreements/${id}`),
  authorizeAgreement: (id: string) => fetchJson<Agreement>(`${API_BASE}/agreements/${id}/authorize`, { method: 'POST' }),

  // Payments & PayPal Sandbox
  getPayPalConfig: () => fetchJson<{ clientId: string; mode: string; isConfigured: boolean }>(`${API_BASE}/payments/config`),
  createPayPalOrder: (agreementId: string, idempotencyKey?: string) => fetchJson<{ orderId: string; approvalUrl?: string; amount: number; currency: string; status: string; isSimulated: boolean }>(`${API_BASE}/payments/create-order`, { method: 'POST', body: JSON.stringify({ agreementId, idempotencyKey }) }),
  capturePayPalOrder: (orderId: string, idempotencyKey?: string) => fetchJson<Transaction>(`${API_BASE}/payments/capture-order`, { method: 'POST', body: JSON.stringify({ orderId, idempotencyKey }) }),

  // Transactions
  getTransactions: () => fetchJson<Transaction[]>(`${API_BASE}/transactions`),
  getTransaction: (id: string) => fetchJson<Transaction & { agreement: Agreement; negotiation: Negotiation; sellerAgent: Agent }>(`${API_BASE}/transactions/${id}`),

  // Analytics & Activity
  getAnalytics: () => fetchJson<{ stats: NetworkStats; categoryDistribution: Record<string, number>; transactionStatusDistribution: Record<string, number>; recentVolume: number; agentCount: number }>(`${API_BASE}/analytics`),
  getActivity: (limit = 30) => fetchJson<ActivityEvent[]>(`${API_BASE}/activity?limit=${limit}`)
};
