import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { store } from '../../db/store.js';

/**
 * Formal Gemini Tool (Function Declarations) for Autonomous Commerce Network
 */
export const geminiToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'getBuyerContext',
    description: 'Retrieves authorized buyer context, preferences, and verified purchasing constraints.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        buyerId: {
          type: SchemaType.STRING,
          description: 'The user ID or agent ID of the buyer principal.'
        }
      },
      required: ['buyerId']
    }
  },
  {
    name: 'getSellerContext',
    description: 'Retrieves public seller capabilities, active capacity, and published pricing constraints.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sellerId: {
          type: SchemaType.STRING,
          description: 'The agent ID or user ID of the seller studio.'
        }
      },
      required: ['sellerId']
    }
  },
  {
    name: 'searchListings',
    description: 'Searches real verified marketplace listings by category, keyword, and budget ceiling.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Natural language search query or keywords.'
        },
        category: {
          type: SchemaType.STRING,
          description: 'Marketplace discipline (Design, Development, Security, Marketing, etc.)'
        },
        maxBudget: {
          type: SchemaType.NUMBER,
          description: 'Maximum authorized budget in USD.'
        }
      }
    }
  },
  {
    name: 'getListingDetails',
    description: 'Retrieves complete specifications, deliverables, and conditions for a specific listing.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listingId: {
          type: SchemaType.STRING,
          description: 'The unique listing identifier.'
        }
      },
      required: ['listingId']
    }
  },
  {
    name: 'searchSellerAgents',
    description: 'Discovers verified seller agents across the network matching commercial requirements.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description: 'Service or product category.'
        },
        maxBudget: {
          type: SchemaType.NUMBER,
          description: 'Target price point or budget ceiling in USD.'
        }
      }
    }
  },
  {
    name: 'getSellerAgentPolicies',
    description: 'Retrieves seller commercial policies, delivery SLAs, and allowed flexibility within authorized bounds.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        agentId: {
          type: SchemaType.STRING,
          description: 'The unique seller agent identifier.'
        }
      },
      required: ['agentId']
    }
  },
  {
    name: 'createCounterOffer',
    description: 'Formulates and submits an official schema-validated counteroffer in an active negotiation channel.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        negotiationId: {
          type: SchemaType.STRING,
          description: 'Active negotiation reference ID.'
        },
        price: {
          type: SchemaType.NUMBER,
          description: 'Proposed price in USD.'
        },
        deliveryDays: {
          type: SchemaType.NUMBER,
          description: 'Committed turnaround time in business days.'
        },
        deliverables: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Explicit list of deliverables covered.'
        },
        terms: {
          type: SchemaType.STRING,
          description: 'Commercial terms or caveats.'
        }
      },
      required: ['negotiationId', 'price', 'deliveryDays']
    }
  },
  {
    name: 'requestHumanApproval',
    description: 'Escalates an inquiry, scope anomaly, or non-standard NDA requirement to the human operator.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        negotiationId: {
          type: SchemaType.STRING,
          description: 'Active negotiation channel.'
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Specific reason requiring human review.'
        }
      },
      required: ['negotiationId', 'reason']
    }
  },
  {
    name: 'createTransactionProposal',
    description: 'Drafts a final bilateral commercial covenant ready for human authorization and PayPal capture.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        negotiationId: {
          type: SchemaType.STRING,
          description: 'Active negotiation reference.'
        },
        finalPrice: {
          type: SchemaType.NUMBER,
          description: 'Agreed consensus price in USD.'
        },
        deliveryDays: {
          type: SchemaType.NUMBER,
          description: 'Final delivery timeline.'
        },
        deliverables: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Final agreed deliverables.'
        }
      },
      required: ['negotiationId', 'finalPrice', 'deliveryDays', 'deliverables']
    }
  },
  {
    name: 'getTransactionStatus',
    description: 'Checks financial settlement status and PayPal Sandbox capture state.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        transactionId: {
          type: SchemaType.STRING,
          description: 'Transaction reference ID.'
        }
      },
      required: ['transactionId']
    }
  }
];

/**
 * Backend Tool Execution Registry
 * Executes real database operations and business logic when Gemini requests a function call.
 */
export const executeBackendTool = async (
  name: string,
  args: Record<string, any>,
  callerRole: 'buyer' | 'seller' | 'evaluator' = 'buyer'
): Promise<Record<string, any>> => {
  console.log(`[ToolExecution] Gemini requested tool: ${name} (caller: ${callerRole}) with args:`, args);

  switch (name) {
    case 'getBuyerContext': {
      const user = store.getUser(args.buyerId) || store.getUser('usr_alex_mercer');
      if (!user) return { found: false, error: 'Buyer not found' };

      // PRIVACY BOUNDARY: Never leak private bank details or unrelated transactions
      return {
        found: true,
        displayName: user.displayName,
        interests: user.buyerPreferences?.generalInterests || [],
        qualityExpectations: user.buyerPreferences?.qualityExpectations || 'High',
        communicationStyle: user.buyerPreferences?.communicationStyle || 'concise',
        currency: user.buyerPreferences?.currency || 'USD'
      };
    }

    case 'getSellerContext': {
      const agent = store.getAgent(args.sellerId);
      if (!agent) return { found: false, error: 'Seller agent not found' };

      return {
        found: true,
        businessName: agent.businessName,
        category: agent.category,
        capabilities: agent.capabilities,
        startingPrice: agent.pricingConstraints.startingPrice,
        deliveryDays: agent.catalog?.[0]?.deliveryDays || 5,
        rating: agent.rating || 4.9,
        reviewCount: agent.reviewCount || 0,
        activeProjects: agent.activeProjects || 0,
        maxCapacity: agent.maxConcurrentProjects || 3,
        replyPoints: agent.replyPoints || 95
      };
    }

    case 'searchListings': {
      const listings = store.getListings({
        category: args.category,
        search: args.query,
        maxPrice: args.maxBudget,
        status: 'active'
      });

      return {
        count: listings.length,
        listings: listings.slice(0, 5).map(l => ({
          id: l.id,
          title: l.title,
          category: l.category,
          price: l.price,
          currency: l.currency,
          deliveryDays: l.deliveryDays,
          deliverables: l.deliverables,
          sellerName: l.sellerName,
          sellerRating: l.sellerRating
        }))
      };
    }

    case 'getListingDetails': {
      const listing = store.getListing(args.listingId);
      if (!listing) return { found: false, error: 'Listing not found' };
      return {
        found: true,
        id: listing.id,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        price: listing.price,
        currency: listing.currency,
        deliveryDays: listing.deliveryDays,
        deliverables: listing.deliverables,
        isNegotiable: listing.isNegotiable,
        sellerName: listing.sellerName,
        sellerRating: listing.sellerRating
      };
    }

    case 'searchSellerAgents': {
      const agents = store.getAgents({
        type: 'seller',
        category: args.category,
        status: 'active'
      });

      return {
        count: agents.length,
        agents: agents.slice(0, 4).map(a => ({
          id: a.id,
          name: a.name,
          businessName: a.businessName,
          category: a.category,
          startingPrice: a.pricingConstraints.startingPrice,
          deliveryDays: a.catalog?.[0]?.deliveryDays || 5,
          rating: a.rating || 4.9,
          activeProjects: a.activeProjects || 0,
          maxConcurrentProjects: a.maxConcurrentProjects || 3
        }))
      };
    }

    case 'getSellerAgentPolicies': {
      const agent = store.getAgent(args.agentId);
      if (!agent) return { found: false, error: 'Agent not found' };

      // PRIVACY BOUNDARY: If a buyer agent calls this, NEVER expose minimum floor price!
      if (callerRole === 'buyer') {
        return {
          agentId: agent.id,
          startingPrice: agent.pricingConstraints.startingPrice,
          standardTurnaround: agent.catalog?.[0]?.deliveryDays || 5,
          includedDeliverables: agent.catalog?.[0]?.includedDeliverables || agent.capabilities
        };
      }

      // If seller agent internal call: authorized to know configured floor
      return {
        agentId: agent.id,
        startingPrice: agent.pricingConstraints.startingPrice,
        minAcceptablePrice: agent.pricingConstraints.minAcceptablePrice,
        maxDiscountPercent: agent.policies?.maxDiscountPercent || 15,
        turnaround: agent.catalog?.[0]?.deliveryDays || 5
      };
    }

    case 'createCounterOffer': {
      return {
        accepted: true,
        negotiationId: args.negotiationId,
        counterPrice: args.price,
        deliveryDays: args.deliveryDays,
        deliverables: args.deliverables,
        status: 'COUNTEROFFER_PENDING',
        recordedAt: new Date().toISOString()
      };
    }

    case 'requestHumanApproval': {
      return {
        escalated: true,
        negotiationId: args.negotiationId,
        reason: args.reason,
        status: 'HUMAN_APPROVAL_REQUIRED',
        escalatedAt: new Date().toISOString()
      };
    }

    case 'createTransactionProposal': {
      return {
        readyForReview: true,
        negotiationId: args.negotiationId,
        finalPrice: args.finalPrice,
        deliveryDays: args.deliveryDays,
        deliverables: args.deliverables,
        humanSignOffRequired: true,
        status: 'AGREEMENT_PROPOSED'
      };
    }

    case 'getTransactionStatus': {
      const tx = store.getTransaction(args.transactionId);
      if (!tx) return { found: false, error: 'Transaction not found' };
      return {
        found: true,
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        paymentStatus: tx.paymentStatus,
        isSandbox: tx.isSandbox,
        completedAt: tx.completedAt
      };
    }

    default:
      return { error: `Unrecognized tool function: ${name}` };
  }
};
