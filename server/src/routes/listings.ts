import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { Listing, ListingCategory, ListingType } from '../types/index.js';
import { AuthenticatedRequest, authenticateUser, optionalAuthenticateUser } from '../middleware/rbac.js';
import { geminiService } from '../services/ai/gemini.js';

const router = Router();

/**
 * Sanitizes a listing DTO based on caller identity:
 * Private floor price (minAcceptablePrice) is NEVER returned to third-party buyers.
 */
function serializeListing(listing: Listing, viewerUserId?: string): any {
  const isOwner = Boolean(viewerUserId && (listing.sellerId === viewerUserId || listing.sellerUserId === viewerUserId));
  if (isOwner) {
    return listing;
  }
  const {
    minAcceptablePrice,
    floorPriceCents,
    absoluteMinPrice,
    absoluteMinCents,
    flexibility,
    ...publicListing
  } = listing;
  return publicListing;
}

// GET /api/v1/listings
router.get('/', optionalAuthenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const sanitize = (val: any) => (!val || val === 'undefined' || val === 'null' || val === 'all' || val === 'All') ? undefined : String(val);

  const viewer = req.user;
  const requestedSellerId = sanitize(req.query.sellerId);

  const rawListings = store.getListings({
    sellerId: requestedSellerId,
    category: sanitize(req.query.category),
    type: sanitize(req.query.type),
    status: sanitize(req.query.status) || 'active',
    search: sanitize(req.query.search),
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined
  });

  const listings = rawListings.map(l => serializeListing(l, viewer?.id));

  return res.json({
    success: true,
    data: listings
  });
});

// GET /api/v1/listings/my - Authenticated seller's owned listings
router.get('/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rawListings = store.getListings({ sellerId: user.id });
  const listings = rawListings.map(l => serializeListing(l, user.id));
  return res.json({
    success: true,
    count: listings.length,
    data: listings
  });
});

// GET /api/v1/listings/:id
router.get('/:id', optionalAuthenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const listing = store.getListing(req.params.id);
  if (!listing || listing.status === 'archived') {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  const seller = store.getUser(listing.sellerId);
  const sellerAgent = listing.sellerAgentId ? store.getAgent(listing.sellerAgentId) : undefined;

  const serialized = serializeListing(listing, req.user?.id);

  return res.json({
    success: true,
    data: {
      ...serialized,
      seller: seller ? { id: seller.id, displayName: seller.displayName, username: seller.username } : undefined,
      sellerAgent
    }
  });
});

// POST /api/v1/listings/parse-draft
// Analyzes seller natural language description and generates a drafted marketplace listing
router.post('/parse-draft', async (req: AuthenticatedRequest, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'A service offering description is required.' });
  }

  try {
    const draft = await geminiService.parseSellerOffering(prompt);
    return res.json({ success: true, data: draft });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to parse seller offering' });
  }
});

// POST /api/v1/listings
router.post('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const seller = req.user!;

  const {
    title,
    description,
    category,
    type,
    price,
    currency,
    pricingModel,
    minAcceptablePrice,
    flexibility,
    deliveryDays,
    deliverables,
    images,
    isNegotiable,
    tags,
    sellerAgentId
  } = req.body;

  if (!title || !category || typeof price !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Title, category, and price are required fields.'
    });
  }

  const now = new Date().toISOString();
  const listingId = `list_${uuidv4().substring(0, 8)}`;

  // Find or attach seller agent
  let agentId = sellerAgentId;
  if (!agentId) {
    const userAgents = store.getAgents({ ownerId: seller.id, type: 'seller' });
    agentId = userAgents[0]?.id;
    if (!agentId) {
      const autoAgent: any = {
        id: `agent_seller_${uuidv4().substring(0, 8)}`,
        ownerId: seller.id,
        name: `${seller.displayName || 'Vendor'} Studio Agent`,
        businessName: seller.sellerProfile?.businessName || seller.displayName || 'Studio Partner',
        type: 'seller',
        description: `Autonomous commercial representative for ${seller.displayName || 'Vendor'}.`,
        category: (category || 'Design'),
        capabilities: [category || 'Design', 'Turnaround SLA', 'Quality Verification'],
        status: 'active',
        verificationStatus: 'verified',
        catalog: [{
          id: `cat_${uuidv4().substring(0, 8)}`,
          name: title.trim(),
          description: (description || '').trim(),
          startingPrice: price,
          minPrice: typeof minAcceptablePrice === 'number' ? minAcceptablePrice : Math.round(price * 0.85),
          deliveryDays: typeof deliveryDays === 'number' ? deliveryDays : 5,
          includedDeliverables: Array.isArray(deliverables) && deliverables.length > 0 ? deliverables : [`${title} Implementation`]
        }],
        pricingConstraints: {
          startingPrice: price,
          minAcceptablePrice: typeof minAcceptablePrice === 'number' ? minAcceptablePrice : Math.round(price * 0.85),
          flexibilityPercent: 15
        },
        negotiationStrategy: 'balanced',
        approvalPolicy: 'explicit_human_required',
        createdAt: now,
        updatedAt: now
      };
      store.saveAgent(autoAgent);
      agentId = autoAgent.id;
    }
  }

  const newListing: Listing = {
    id: listingId,
    sellerId: seller.id,
    sellerUserId: seller.id,
    sellerAgentId: agentId || undefined,
    title: title.trim(),
    description: (description || '').trim(),
    category: (category || 'Design') as ListingCategory,
    type: (type || 'service') as ListingType,
    price,
    currency: currency || 'USD',
    pricingModel: pricingModel || 'fixed',
    minAcceptablePrice: typeof minAcceptablePrice === 'number' ? minAcceptablePrice : Math.round(price * 0.85),
    flexibility: (['strict', 'flexible', 'very_flexible'].includes(flexibility) ? flexibility : 'flexible'),
    deliveryDays: typeof deliveryDays === 'number' ? deliveryDays : 5,
    deliverables: Array.isArray(deliverables) && deliverables.length > 0 ? deliverables : [`${title} Implementation`, 'QA Delivery'],
    images: Array.isArray(images) ? images : [],
    isNegotiable: isNegotiable !== undefined ? isNegotiable : true,
    status: 'active',
    tags: Array.isArray(tags) ? tags : [category],
    sellerName: seller.sellerProfile?.businessName || seller.displayName,
    sellerAvatar: seller.avatarUrl,
    sellerRating: seller.sellerProfile?.rating || 5.0,
    sellerReviewCount: seller.sellerProfile?.reviewCount || 0,
    createdAt: now,
    updatedAt: now
  };

  store.saveListing(newListing);

  return res.status(201).json({
    success: true,
    data: newListing
  });
});

// PATCH /api/v1/listings/:id
router.patch('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const existing = store.getListing(req.params.id);
  if (!existing || existing.sellerId !== req.user!.id) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  const updated: Listing = {
    ...existing,
    ...req.body,
    id: existing.id,
    sellerId: existing.sellerId,
    sellerUserId: existing.sellerId,
    updatedAt: new Date().toISOString()
  };

  store.saveListing(updated);

  return res.json({
    success: true,
    data: updated
  });
});

// DELETE /api/v1/listings/:id
router.delete('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const existing = store.getListing(req.params.id);
  if (!existing || existing.sellerId !== req.user!.id) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  store.deleteListing(req.params.id);

  return res.json({
    success: true,
    message: 'Listing archived'
  });
});

export default router;
