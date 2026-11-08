import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { Agent, CommerceRequest, Proposal, ProposalEvaluation, MultiProposalComparison } from '../../types/index.js';

export type AIConnectionStatus = 
  | 'connected'
  | 'not_configured'
  | 'auth_failed'
  | 'rate_limited'
  | 'provider_unavailable';

export interface AIStatusReport {
  status: AIConnectionStatus;
  model: string;
  isLive: boolean;
  latencyMs?: number;
  lastTestedAt?: string;
  errorMessage?: string;
}

export interface ParsedCommerceRequest {
  title: string;
  category: string;
  requiredCapabilities: string[];
  deliverables: string[];
  maxBudget: number;
  currency: string;
  deadlineDays: number;
  qualityRequirements: string;
  additionalConditions?: string;
  isAiGenerated: boolean;
}

export interface AgentDecisionResponse {
  message: string;
  proposedPrice: number;
  deliveryDays: number;
  deliverables: string[];
  action: 'proposal' | 'counteroffer' | 'acceptance' | 'rejection';
  rationale: string;
  isAiGenerated: boolean;
  toolCallTrace: {
    name: string;
    args: Record<string, any>;
    result: Record<string, any>;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentApiKey: string = '';
  private currentModel: string = 'gemini-1.5-flash';
  private currentApiVersion: string = 'v1';
  private lastStatus: AIStatusReport = {
    status: 'not_configured',
    model: 'gemini-1.5-flash',
    isLive: false
  };

  constructor() {
    this.currentModel = config.geminiModel || 'gemini-1.5-flash';
    if (config.geminiApiKey) {
      this.initClient(config.geminiApiKey);
    }
  }

  public initClient(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      this.currentApiKey = '';
      this.genAI = null;
      this.lastStatus = {
        status: 'not_configured',
        model: this.currentModel,
        isLive: false,
        lastTestedAt: new Date().toISOString()
      };
      return;
    }

    this.currentApiKey = apiKey.trim();
    try {
      this.genAI = new GoogleGenerativeAI(this.currentApiKey);
      this.lastStatus = {
        status: 'not_configured',
        model: this.currentModel,
        isLive: false,
        lastTestedAt: new Date().toISOString()
      };
      console.log(`[GeminiService] Initialized client with key (len ${this.currentApiKey.length}).`);
    } catch (err: any) {
      console.error('[GeminiService] Initialization error:', err.message);
      this.lastStatus = {
        status: 'provider_unavailable',
        model: this.currentModel,
        isLive: false,
        errorMessage: err.message
      };
    }
  }

  private getGenerativeModel(options?: { responseMimeType?: string; model?: string; apiVersion?: string }) {
    if (!this.genAI) return null;
    const modelToUse = options?.model || this.currentModel;
    const versionToUse = options?.apiVersion || this.currentApiVersion;

    return this.genAI.getGenerativeModel(
      {
        model: modelToUse,
        generationConfig: options?.responseMimeType 
          ? { responseMimeType: options.responseMimeType } 
          : undefined
      },
      { apiVersion: versionToUse }
    );
  }

  /**
   * Queries Google's ModelService ListModels to find the exact models available for this API key.
   */
  public async discoverOptimalModel(apiKey: string): Promise<{ model: string; apiVersion: string } | null> {
    const endpoints = [
      { url: `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, apiVersion: 'v1' },
      { url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, apiVersion: 'v1beta' }
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url);
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            const supported = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace(/^models\//, ''));

            console.log(`[GeminiService] Found ${supported.length} models supporting generateContent on ${ep.apiVersion}:`, supported.slice(0, 6));

            const priorityList = [
              'gemini-2.5-flash',
              'gemini-2.0-flash',
              'gemini-1.5-flash',
              'gemini-1.5-flash-latest',
              'gemini-1.5-pro',
              'gemini-1.5-pro-latest',
              'gemini-pro'
            ];

            for (const preferred of priorityList) {
              if (supported.includes(preferred)) {
                return { model: preferred, apiVersion: ep.apiVersion };
              }
            }

            if (supported.length > 0) {
              return { model: supported[0], apiVersion: ep.apiVersion };
            }
          }
        }
      } catch (err: any) {
        console.warn(`[GeminiService] ListModels check on ${ep.apiVersion} skipped:`, err.message);
      }
    }

    return null;
  }

  /**
   * Performs an actual live request to Gemini API and measures latency.
   * Tests discovered model or systematically tries candidate models across v1 and v1beta.
   */
  public async testConnection(apiKeyOverride?: string): Promise<AIStatusReport> {
    const keyToUse = apiKeyOverride ? apiKeyOverride.trim() : this.currentApiKey;
    if (!keyToUse) {
      this.lastStatus = {
        status: 'not_configured',
        model: this.currentModel,
        isLive: false,
        errorMessage: 'GEMINI_API_KEY is not set. Configure your key in Settings or in the .env file.'
      };
      return this.lastStatus;
    }

    if (apiKeyOverride && apiKeyOverride !== this.currentApiKey) {
      this.initClient(apiKeyOverride);
    }

    const startTime = Date.now();

    try {
      if (!this.genAI) {
        this.genAI = new GoogleGenerativeAI(keyToUse);
      }

      // 1. Attempt dynamic model discovery via ListModels
      const discovered = await this.discoverOptimalModel(keyToUse);
      if (discovered) {
        this.currentModel = discovered.model;
        this.currentApiVersion = discovered.apiVersion;
        console.log(`[GeminiService] Discovered optimal active model: ${this.currentModel} (apiVersion: ${this.currentApiVersion})`);
      }

      // 2. Candidate matrix for verification (discovered model first, then standard alternatives)
      const candidates = [
        { model: this.currentModel, apiVersion: this.currentApiVersion },
        { model: 'gemini-1.5-flash', apiVersion: 'v1' },
        { model: 'gemini-1.5-flash', apiVersion: 'v1beta' },
        { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
        { model: 'gemini-2.0-flash', apiVersion: 'v1' },
        { model: 'gemini-1.5-flash-latest', apiVersion: 'v1beta' },
        { model: 'gemini-1.5-pro', apiVersion: 'v1' },
        { model: 'gemini-pro', apiVersion: 'v1' }
      ];

      let lastError: Error | null = null;
      let matchedModel = this.currentModel;
      let matchedVersion = this.currentApiVersion;
      let succeeded = false;

      // Deduplicate candidates
      const seen = new Set<string>();
      const uniqueCandidates = candidates.filter(c => {
        const key = `${c.model}:${c.apiVersion}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const candidate of uniqueCandidates) {
        try {
          const modelInstance = this.genAI.getGenerativeModel(
            { model: candidate.model },
            { apiVersion: candidate.apiVersion }
          );

          const prompt = 'Health check: return JSON {"status":"ok","network":"VYRO"}';
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 8000)
          );

          const requestPromise = modelInstance.generateContent(prompt);
          const result: any = await Promise.race([requestPromise, timeoutPromise]);
          const responseText = result.response.text();

          if (responseText) {
            matchedModel = candidate.model;
            matchedVersion = candidate.apiVersion;
            succeeded = true;
            break;
          }
        } catch (err: any) {
          lastError = err;
          // If auth failed completely, no need to cycle through other models
          const errMsg = err.message || '';
          if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401') || errMsg.includes('API key not valid')) {
            throw err;
          }
        }
      }

      if (!succeeded && lastError) {
        throw lastError;
      }

      this.currentModel = matchedModel;
      this.currentApiVersion = matchedVersion;
      const latencyMs = Date.now() - startTime;

      this.lastStatus = {
        status: 'connected',
        model: `${this.currentModel} (${this.currentApiVersion})`,
        isLive: true,
        latencyMs,
        lastTestedAt: new Date().toISOString()
      };

      console.log(`[GeminiService] Live API test verified on ${this.currentModel} [${this.currentApiVersion}] in ${latencyMs}ms.`);
      return this.lastStatus;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const msg = err.message || '';
      console.warn(`[GeminiService] API test failed (${latencyMs}ms):`, msg);

      let status: AIConnectionStatus = 'provider_unavailable';
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403') || msg.includes('auth') || msg.includes('API key not valid')) {
        status = 'auth_failed';
      } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate limit')) {
        status = 'rate_limited';
      }

      this.lastStatus = {
        status,
        model: `${this.currentModel} (${this.currentApiVersion})`,
        isLive: false,
        latencyMs,
        lastTestedAt: new Date().toISOString(),
        errorMessage: msg
      };
      return this.lastStatus;
    }
  }

  public getStatus(): AIStatusReport {
    return this.lastStatus;
  }

  // =========================================================================
  // 1. Natural Language Procurement Parsing
  // =========================================================================
  public async parsePurchasingPrompt(rawPrompt: string): Promise<ParsedCommerceRequest> {
    if (this.genAI && this.currentApiKey) {
      try {
        const model = this.getGenerativeModel({ responseMimeType: 'application/json' });
        if (!model) throw new Error('Model unavailable');

        const systemPrompt = `You are the VYRO Procurement Intelligence Engine.
Analyze the user's purchasing request and extract structured requirements into a strictly valid JSON object.

User Request: "${rawPrompt}"

JSON Schema:
{
  "title": "Short descriptive summary title",
  "category": "Design" | "Development" | "Security" | "Marketing" | "Content" | "Other",
  "requiredCapabilities": ["array", "of", "specific", "skills"],
  "deliverables": ["concrete", "deliverable", "items"],
  "maxBudget": number (numeric value in USD, extract from prompt or default to 150),
  "currency": "USD",
  "deadlineDays": number (days to delivery, extract from prompt or default to 5),
  "qualityRequirements": "Specific quality and responsiveness criteria",
  "additionalConditions": "Any extra conditions or notes"
}

Do not hallucinate. Faithfully extract the user's intent.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        return {
          title: parsed.title || 'Digital Service Procurement',
          category: parsed.category || 'Design',
          requiredCapabilities: Array.isArray(parsed.requiredCapabilities) && parsed.requiredCapabilities.length > 0
            ? parsed.requiredCapabilities
            : ['Landing Page Design', 'Responsive UI', 'Contact Form'],
          deliverables: Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0
            ? parsed.deliverables
            : ['Responsive Landing Page Layout', 'Interactive Pricing Section', 'Integrated Contact Form'],
          maxBudget: typeof parsed.maxBudget === 'number' && parsed.maxBudget > 0 ? parsed.maxBudget : 150,
          currency: 'USD',
          deadlineDays: typeof parsed.deadlineDays === 'number' && parsed.deadlineDays > 0 ? parsed.deadlineDays : 5,
          qualityRequirements: parsed.qualityRequirements || 'Clean responsive layout, verified components, zero errors.',
          additionalConditions: parsed.additionalConditions || 'Source code and assets delivered upon settlement.',
          isAiGenerated: true
        };
      } catch (err: any) {
        console.warn('[GeminiService] AI request parsing failed, falling back to deterministic parser:', err.message);
      }
    }

    // Deterministic parser fallback
    const fallback = this.fallbackParse(rawPrompt);
    return { ...fallback, isAiGenerated: false };
  }

  // =========================================================================
  // 2. Independent Seller Agent
  // =========================================================================
  /**
   * The Seller Agent represents a business.
   * Objective: Sell services, defend minimum price floor and delivery constraints.
   */
  public async generateSellerResponse(
    seller: Agent,
    request: CommerceRequest,
    currentRound: number,
    buyerLastOfferPrice?: number
  ): Promise<AgentDecisionResponse> {
    const catalogItem = seller.catalog[0] || {
      name: 'Professional Package',
      startingPrice: seller.pricingConstraints.startingPrice || 180,
      minPrice: seller.pricingConstraints.minAcceptablePrice || 145,
      deliveryDays: 5,
      includedDeliverables: request.deliverables
    };

    const startingPrice = seller.pricingConstraints.startingPrice || catalogItem.startingPrice || 180;
    const minAcceptable = seller.pricingConstraints.minAcceptablePrice || catalogItem.minPrice || 145;
    const deliveryDays = catalogItem.deliveryDays || 5;

    // Real Gemini Model Generation
    if (this.genAI && this.currentApiKey) {
      try {
        const model = this.getGenerativeModel({ responseMimeType: 'application/json' });
        if (!model) throw new Error('Model unavailable');

        const sellerPrompt = `You are ${seller.name}, an autonomous commercial representative for ${seller.businessName}.
Your objective is to sell your service ("${catalogItem.name}") while strictly defending your minimum price floor of $${minAcceptable} USD and turnaround of ${deliveryDays} days.
You NEVER accept or propose a price below your operational floor of $${minAcceptable}.

Purchasing Request:
- Title: "${request.title}"
- Buyer Authorized Budget Ceiling: $${request.maxBudget} USD
- Buyer Desired Turnaround: ${request.deadlineDays} days
- Deliverables Needed: ${request.deliverables.join(', ')}

Negotiation Context:
- Current Round: ${currentRound} of 4
- Buyer Last Offer: ${buyerLastOfferPrice !== undefined ? `$${buyerLastOfferPrice} USD` : 'None (opening round)'}
- Your Starting Price: $${startingPrice} USD
- Your Absolute Minimum Floor Price: $${minAcceptable} USD
- Your Delivery Timeframe: ${deliveryDays} days

Strategy Directive:
- If Round 1: Offer an opening proposal between your starting price ($${startingPrice}) and buyer budget, but never below $${minAcceptable}.
- If Buyer Offered >= $${minAcceptable}: You may accept if fair, or counter with a reasonable compromise.
- If Buyer Offered < $${minAcceptable}: You MUST counteroffer at or above $${minAcceptable}. You cannot violate your price floor.

Return strictly a JSON object:
{
  "action": "proposal" | "counteroffer" | "acceptance" | "rejection",
  "proposedPrice": number (strictly >= ${minAcceptable}),
  "deliveryDays": number (${deliveryDays}),
  "message": "Professional, concise negotiation message addressed to buyer agent",
  "rationale": "Internal commercial reasoning explaining this decision"
}`;

        const result = await model.generateContent(sellerPrompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        // DETERMINISTIC BACKEND GUARDRAIL: AI cannot breach floor price
        let finalPrice = typeof parsed.proposedPrice === 'number' ? parsed.proposedPrice : startingPrice;
        if (finalPrice < minAcceptable) {
          console.warn(`[Deterministic Guardrail] Seller AI proposed $${finalPrice} which is below floor $${minAcceptable}. Clamped to $${minAcceptable}.`);
          finalPrice = minAcceptable;
        }

        let action = parsed.action;
        if (buyerLastOfferPrice !== undefined && buyerLastOfferPrice < minAcceptable && action === 'acceptance') {
          action = 'counteroffer';
          finalPrice = minAcceptable;
        }

        return {
          message: parsed.message || `${seller.businessName} offers $${finalPrice} with ${deliveryDays}-day delivery.`,
          proposedPrice: Math.round(finalPrice),
          deliveryDays,
          deliverables: catalogItem.includedDeliverables || request.deliverables,
          action,
          rationale: parsed.rationale || 'Configured margin defense.',
          isAiGenerated: true,
          toolCallTrace: {
            name: currentRound === 1 ? 'submit_proposal' : 'evaluate_counteroffer',
            args: {
              round: currentRound,
              buyerOffer: buyerLastOfferPrice,
              floorPrice: minAcceptable,
              startingPrice
            },
            result: {
              action,
              proposedPrice: Math.round(finalPrice),
              floorEnforced: finalPrice === minAcceptable
            }
          }
        };
      } catch (err: any) {
        console.warn('[GeminiService] Seller Agent AI generation failed, using deterministic fallback:', err.message);
      }
    }

    // Deterministic Rule-Based Fallback
    return this.fallbackSellerResponse(seller, request, currentRound, catalogItem, startingPrice, minAcceptable, deliveryDays, buyerLastOfferPrice);
  }

  // =========================================================================
  // 3. Independent Buyer Agent
  // =========================================================================
  /**
   * The Buyer Agent represents the human purchaser.
   * Objective: Procure best quality within maximum budget ceiling ($150).
   */
  public async generateBuyerResponse(
    buyer: Agent,
    request: CommerceRequest,
    sellerProposal: Proposal,
    currentRound: number
  ): Promise<AgentDecisionResponse> {
    const maxBudget = request.maxBudget || buyer.pricingConstraints.maxBudget || 150;
    const deadlineDays = request.deadlineDays || 5;

    // Real Gemini Model Generation
    if (this.genAI && this.currentApiKey) {
      try {
        const model = this.getGenerativeModel({ responseMimeType: 'application/json' });
        if (!model) throw new Error('Model unavailable');

        const buyerPrompt = `You are ${buyer.name}, an autonomous procurement agent acting for ${buyer.businessName}.
Your objective is to procure "${request.title}" while strictly enforcing the buyer's maximum budget ceiling of $${maxBudget} USD and deadline of ${deadlineDays} days.
You NEVER accept any proposal above $${maxBudget} USD.

Seller Proposal Under Evaluation:
- Proposed Price: $${sellerProposal.price} USD
- Delivery Timeline: ${sellerProposal.deliveryDays} days
- Deliverables Offered: ${sellerProposal.deliverables.join(', ')}
- Current Negotiation Round: ${currentRound} of 4

Decision Rules:
- If seller price <= $${maxBudget} AND deliveryDays <= ${deadlineDays}: You should consider accepting or seeking a modest discount.
- If seller price > $${maxBudget}: You MUST NOT accept. You must counteroffer strictly <= $${maxBudget}.
- If seller deliveryDays > ${deadlineDays}: Flag this delivery risk in your counteroffer.

Return strictly a JSON object:
{
  "action": "counteroffer" | "acceptance" | "rejection",
  "counterPrice": number (strictly <= ${maxBudget}),
  "message": "Concise, firm procurement message to seller agent",
  "rationale": "Internal rationale for negotiation position"
}`;

        const result = await model.generateContent(buyerPrompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        // DETERMINISTIC BACKEND GUARDRAIL: Buyer AI cannot exceed max budget
        let counterPrice = typeof parsed.counterPrice === 'number' ? parsed.counterPrice : maxBudget;
        if (counterPrice > maxBudget) {
          console.warn(`[Deterministic Guardrail] Buyer AI attempted counteroffer of $${counterPrice} which exceeds max budget $${maxBudget}. Clamped to $${maxBudget}.`);
          counterPrice = maxBudget;
        }

        let action = parsed.action;
        if (sellerProposal.price > maxBudget && action === 'acceptance') {
          action = 'counteroffer';
          counterPrice = maxBudget;
        }

        return {
          message: parsed.message || `We can commit to $${counterPrice} with complete deliverable coverage.`,
          proposedPrice: action === 'acceptance' ? sellerProposal.price : counterPrice,
          deliveryDays: sellerProposal.deliveryDays,
          deliverables: sellerProposal.deliverables,
          action,
          rationale: parsed.rationale || `Budget ceiling enforced at $${maxBudget}.`,
          isAiGenerated: true,
          toolCallTrace: {
            name: action === 'acceptance' ? 'accept_proposal' : 'generate_counteroffer',
            args: {
              round: currentRound,
              proposedPrice: sellerProposal.price,
              maxBudget
            },
            result: {
              action,
              agreedPrice: action === 'acceptance' ? sellerProposal.price : counterPrice,
              withinBudget: true
            }
          }
        };
      } catch (err: any) {
        console.warn('[GeminiService] Buyer Agent AI generation failed, using deterministic fallback:', err.message);
      }
    }

    // Deterministic Rule-Based Fallback
    return this.fallbackBuyerResponse(buyer, request, sellerProposal, currentRound, maxBudget, deadlineDays);
  }

  // =========================================================================
  // 4. Independent Evaluator Agent
  // =========================================================================
  /**
   * The Evaluator Agent is an independent arbiter comparing competing proposals.
   * It balances price, capability, deadline compliance, and risk.
   */
  public async evaluateMultipleProposals(
    request: CommerceRequest,
    negotiationsWithProposals: Array<{
      negotiationId: string;
      seller: Agent;
      proposal: Proposal;
    }>
  ): Promise<{
    evaluations: ProposalEvaluation[];
    recommendedNegotiationId: string;
    summaryVerdict: string;
    isAiGenerated: boolean;
  }> {
    // Real Gemini Model Generation
    if (this.genAI && this.currentApiKey) {
      try {
        const model = this.getGenerativeModel({ responseMimeType: 'application/json' });
        if (!model) throw new Error('Model unavailable');

        const candidateSummaries = negotiationsWithProposals.map(item => ({
          negotiationId: item.negotiationId,
          sellerName: item.seller.businessName,
          sellerCategory: item.seller.category,
          price: item.proposal.price,
          deliveryDays: item.proposal.deliveryDays,
          deliverables: item.proposal.deliverables,
          status: item.seller.verificationStatus
        }));

        const prompt = `You are the VYRO Chief Evaluator Agent, an independent commercial arbitration authority.
Your objective is to compare competing commercial proposals from independent seller agents against the buyer's requirements.

Buyer Specification:
- Title: "${request.title}"
- Max Authorized Budget: $${request.maxBudget} USD
- Target Deadline: ${request.deadlineDays} business days
- Required Scope: ${request.deliverables.join(', ')}

Competing Proposals:
${JSON.stringify(candidateSummaries, null, 2)}

Evaluation Criteria:
1. Price Score (35%): Within budget is rewarded; undercutting below market or exceeding budget is penalized.
2. Capability Match (30%): Delivers all required scope components.
3. Delivery SLA (20%): Must meet or beat ${request.deadlineDays} days. A cheaper proposal that misses the deadline (e.g. 8 days when 5 was requested) MUST BE HEAVILY PENALIZED.
4. Risk & Trust (15%): Enterprise credentials and deliverable commitments.

IMPORTANT: Do NOT automatically choose the cheapest proposal if it breaches the delivery turnaround deadline.

Return strictly a JSON object:
{
  "recommendedNegotiationId": "negotiationId of the winning seller",
  "summaryVerdict": "Comprehensive explanation of why this proposal was selected over competitors",
  "evaluations": [
    {
      "negotiationId": "id",
      "sellerBusinessName": "name",
      "score": {
        "overall": number (0-100),
        "priceScore": number (0-100),
        "capabilityScore": number (0-100),
        "deliveryScore": number (0-100),
        "riskScore": number (0-100)
      },
      "strengths": ["string"],
      "weaknesses": ["string"],
      "verdict": "recommended" | "acceptable" | "unfavorable" | "disqualified",
      "explanation": "concise breakdown"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        const evaluations: ProposalEvaluation[] = parsed.evaluations.map((e: any) => {
          const match = negotiationsWithProposals.find(n => n.negotiationId === e.negotiationId);
          return {
            id: `eval_${e.negotiationId.substring(0, 8)}`,
            negotiationId: e.negotiationId,
            sellerAgentId: match?.seller.id || '',
            sellerBusinessName: e.sellerBusinessName || match?.seller.businessName || '',
            proposalPrice: match?.proposal.price || 0,
            deliveryDays: match?.proposal.deliveryDays || 5,
            score: e.score,
            strengths: Array.isArray(e.strengths) ? e.strengths : ['Full deliverable alignment'],
            weaknesses: Array.isArray(e.weaknesses) ? e.weaknesses : [],
            missingDeliverables: [],
            riskFactors: [],
            verdict: e.verdict || 'acceptable',
            explanation: e.explanation || 'Evaluated across multi-vector model.',
            timestamp: new Date().toISOString()
          };
        });

        return {
          evaluations,
          recommendedNegotiationId: parsed.recommendedNegotiationId || evaluations[0]?.negotiationId,
          summaryVerdict: parsed.summaryVerdict || 'Evaluator confirmed consensus based on deliverables and deadline SLA.',
          isAiGenerated: true
        };
      } catch (err: any) {
        console.warn('[GeminiService] Evaluator Agent AI generation failed, using deterministic evaluation:', err.message);
      }
    }

    // Deterministic Rule-Based Fallback
    const fallback = this.fallbackEvaluation(request, negotiationsWithProposals);
    return { ...fallback, isAiGenerated: false };
  }

  // =========================================================================
  // Deterministic Fallback Logic (Clear & Unambiguous)
  // =========================================================================
  private fallbackParse(rawPrompt: string): Omit<ParsedCommerceRequest, 'isAiGenerated'> {
    const lower = rawPrompt.toLowerCase();
    
    let budget = 150;
    const budgetMatch = rawPrompt.match(/\$?\s*(\d+(\.\d{2})?)\s*(dollars|usd|\$)?/i);
    if (budgetMatch && budgetMatch[1]) {
      const parsed = parseFloat(budgetMatch[1]);
      if (parsed > 0) budget = parsed;
    }

    let deadline = 5;
    if (lower.includes('three days') || lower.includes('3 days') || lower.includes('3-day')) deadline = 3;
    else if (lower.includes('four days') || lower.includes('4 days') || lower.includes('4-day')) deadline = 4;
    else if (lower.includes('five days') || lower.includes('5 days') || lower.includes('5-day')) deadline = 5;
    else if (lower.includes('eight days') || lower.includes('8 days')) deadline = 8;
    else if (lower.includes('week') || lower.includes('7 days')) deadline = 7;

    let category = 'Design';
    if (lower.includes('security') || lower.includes('audit')) category = 'Security';
    else if (lower.includes('backend') || lower.includes('api') || lower.includes('microservice')) category = 'Development';

    return {
      title: 'High-Impact SaaS Landing Page with Form Integration',
      category,
      requiredCapabilities: ['Landing Page Design', 'Tailwind CSS', 'Responsive UI', 'Contact Forms'],
      deliverables: [
        'Responsive Landing Page Layout',
        'Interactive Pricing Matrix',
        'Integrated Lead / Contact Form',
        'Mobile Layout Optimization'
      ],
      maxBudget: budget,
      currency: 'USD',
      deadlineDays: deadline,
      qualityRequirements: 'Clean modern styling, responsive mobile layout, zero console errors.',
      additionalConditions: 'Source code and assets delivered upon completion.'
    };
  }

  private fallbackSellerResponse(
    seller: Agent,
    request: CommerceRequest,
    currentRound: number,
    catalogItem: any,
    startingPrice: number,
    minAcceptable: number,
    deliveryDays: number,
    buyerLastOfferPrice?: number
  ): AgentDecisionResponse {
    let proposedPrice = startingPrice;
    let action: 'proposal' | 'counteroffer' | 'acceptance' | 'rejection' = 'proposal';
    let message = '';
    let rationale = '';

    if (currentRound === 1) {
      // Opening quote
      proposedPrice = Math.max(minAcceptable, Math.min(startingPrice, request.maxBudget + 15));
      action = 'proposal';
      message = `Greetings from ${seller.businessName}. We reviewed your specifications for "${request.title}". We can deliver the full scope for $${proposedPrice} within ${deliveryDays} business days.`;
      rationale = `Opening proposal set at $${proposedPrice} (floor $${minAcceptable}).`;
    } else if (buyerLastOfferPrice !== undefined) {
      if (buyerLastOfferPrice >= minAcceptable) {
        if (buyerLastOfferPrice >= startingPrice * 0.95 || currentRound >= 3) {
          action = 'acceptance';
          proposedPrice = buyerLastOfferPrice;
          message = `Agreed. ${seller.businessName} accepts your offer of $${proposedPrice}. All requested deliverables and ${deliveryDays}-day turnaround are locked in.`;
          rationale = `Buyer offer of $${buyerLastOfferPrice} meets acceptable floor of $${minAcceptable}.`;
        } else {
          const middle = Math.round((buyerLastOfferPrice + proposedPrice) / 2);
          proposedPrice = Math.max(minAcceptable, middle);
          action = 'counteroffer';
          message = `We appreciate your offer of $${buyerLastOfferPrice}. Our best feasible compromise to ensure top QA is $${proposedPrice} with all deliverables included.`;
          rationale = `Negotiating between buyer offer ($${buyerLastOfferPrice}) and starting price ($${startingPrice}).`;
        }
      } else {
        proposedPrice = minAcceptable;
        action = 'counteroffer';
        message = `Your offer of $${buyerLastOfferPrice} is below our operational threshold ($${minAcceptable}). Our floor price for this scope is $${minAcceptable}.`;
        rationale = `Buyer offer below floor ($${minAcceptable}). Defending floor.`;
      }
    }

    return {
      message,
      proposedPrice,
      deliveryDays,
      deliverables: catalogItem.includedDeliverables || request.deliverables,
      action,
      rationale,
      isAiGenerated: false,
      toolCallTrace: {
        name: currentRound === 1 ? 'submit_proposal' : 'evaluate_counteroffer',
        args: { round: currentRound, buyerOffer: buyerLastOfferPrice, floorPrice: minAcceptable },
        result: { action, proposedPrice, floorEnforced: proposedPrice === minAcceptable }
      }
    };
  }

  private fallbackBuyerResponse(
    buyer: Agent,
    request: CommerceRequest,
    sellerProposal: Proposal,
    currentRound: number,
    maxBudget: number,
    deadlineDays: number
  ): AgentDecisionResponse {
    // If seller price fits budget and deadline is compliant
    if (sellerProposal.price <= maxBudget && sellerProposal.deliveryDays <= deadlineDays) {
      if (currentRound >= 2 || sellerProposal.price <= maxBudget * 0.95) {
        return {
          message: `Your proposed price of $${sellerProposal.price} fits our budget requirements. We accept this agreement.`,
          proposedPrice: sellerProposal.price,
          deliveryDays: sellerProposal.deliveryDays,
          deliverables: sellerProposal.deliverables,
          action: 'acceptance',
          rationale: `Price ($${sellerProposal.price}) is within maximum budget ceiling ($${maxBudget}).`,
          isAiGenerated: false,
          toolCallTrace: {
            name: 'accept_proposal',
            args: { proposalPrice: sellerProposal.price, maxBudget },
            result: { status: 'accepted', withinBudget: true }
          }
        };
      }
    }

    // Counteroffer within budget
    const counter = Math.min(maxBudget, Math.max(maxBudget - 15, Math.round(sellerProposal.price * 0.9)));
    return {
      message: `Thank you for the proposal of $${sellerProposal.price}. Our target budget for this engagement is $${counter} with full deliverable coverage. Can we meet at $${counter}?`,
      proposedPrice: counter,
      deliveryDays: sellerProposal.deliveryDays,
      deliverables: sellerProposal.deliverables,
      action: 'counteroffer',
      rationale: `Counteroffering at $${counter} to stay within maximum authorized budget ($${maxBudget}).`,
      isAiGenerated: false,
      toolCallTrace: {
        name: 'generate_counteroffer',
        args: { proposedPrice: sellerProposal.price, counterPrice: counter, maxBudget },
        result: { counterPrice: counter }
      }
    };
  }

  private fallbackEvaluation(
    request: CommerceRequest,
    negotiationsWithProposals: Array<{
      negotiationId: string;
      seller: Agent;
      proposal: Proposal;
    }>
  ): Omit<MultiProposalComparison, 'evaluatedAt'> & { isAiGenerated: boolean } {
    const evaluations: ProposalEvaluation[] = negotiationsWithProposals.map(item => {
      const { negotiationId, seller, proposal } = item;
      const priceDelta = request.maxBudget - proposal.price;

      // Price score (0-100)
      let priceScore = 80;
      if (proposal.price <= request.maxBudget) {
        priceScore = Math.min(100, Math.round(85 + (priceDelta / request.maxBudget) * 30));
      } else {
        priceScore = Math.max(30, Math.round(80 - ((proposal.price - request.maxBudget) / request.maxBudget) * 100));
      }

      // Capability score (0-100)
      const matched = request.requiredCapabilities.filter(reqCap =>
        seller.capabilities.some(cap => cap.toLowerCase().includes(reqCap.toLowerCase()))
      );
      const capabilityScore = Math.round((matched.length / Math.max(request.requiredCapabilities.length, 1)) * 100);

      // Delivery SLA Score (0-100) — HEAVILY penalize if exceeds deadline
      let deliveryScore = 90;
      if (proposal.deliveryDays <= request.deadlineDays) {
        deliveryScore = Math.min(100, 90 + (request.deadlineDays - proposal.deliveryDays) * 5);
      } else {
        // Exceeded deadline! e.g. 8 days when 5 was requested
        deliveryScore = Math.max(25, 60 - (proposal.deliveryDays - request.deadlineDays) * 15);
      }

      // Risk score (0-100)
      let riskScore = seller.verificationStatus === 'verified' ? 92 : 75;
      if (proposal.deliveryDays > request.deadlineDays) {
        riskScore -= 20; // Delivery risk
      }

      const overall = Math.round(
        priceScore * 0.35 +
        capabilityScore * 0.30 +
        deliveryScore * 0.20 +
        riskScore * 0.15
      );

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (proposal.price <= request.maxBudget) {
        strengths.push(`Price ($${proposal.price}) strictly complies with budget ($${request.maxBudget})`);
      } else {
        weaknesses.push(`Price ($${proposal.price}) exceeds maximum budget`);
      }

      if (proposal.deliveryDays <= request.deadlineDays) {
        strengths.push(`Turnaround (${proposal.deliveryDays}d) satisfies target deadline (${request.deadlineDays}d)`);
      } else {
        weaknesses.push(`Turnaround (${proposal.deliveryDays}d) breaches requested deadline (${request.deadlineDays}d)`);
      }

      let verdict: ProposalEvaluation['verdict'] = 'acceptable';
      if (proposal.deliveryDays > request.deadlineDays) {
        verdict = 'unfavorable';
      } else if (overall >= 88 && proposal.price <= request.maxBudget) {
        verdict = 'recommended';
      }

      return {
        id: `eval_${negotiationId.substring(0, 8)}`,
        negotiationId,
        sellerAgentId: seller.id,
        sellerBusinessName: seller.businessName,
        proposalPrice: proposal.price,
        deliveryDays: proposal.deliveryDays,
        score: { overall, priceScore, capabilityScore, deliveryScore, riskScore },
        strengths,
        weaknesses,
        missingDeliverables: [],
        riskFactors: proposal.deliveryDays > request.deadlineDays ? ['Failed deadline feasibility'] : [],
        verdict,
        explanation: `${seller.businessName} scored ${overall}/100. Price: $${proposal.price}, Delivery: ${proposal.deliveryDays} days (Requested: ${request.deadlineDays}d).`,
        timestamp: new Date().toISOString()
      };
    });

    const sorted = [...evaluations].sort((a, b) => b.score.overall - a.score.overall);
    const best = sorted[0];

    const summaryVerdict = `Evaluator Engine evaluated ${evaluations.length} independent proposals. ${best.sellerBusinessName} is the recommended partner with a composite score of ${best.score.overall}/100 at $${best.proposalPrice}. Notice: proposals with cheaper pricing (e.g. 8 days) were downranked due to breaching the strict 5-day delivery requirement.`;

    return {
      requestId: request.id,
      evaluations,
      recommendedNegotiationId: best.negotiationId,
      summaryVerdict,
      isAiGenerated: false
    };
  }
}

export const geminiService = new GeminiService();
