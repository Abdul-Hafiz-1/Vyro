import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:4000/api/v1';

class CookieJar {
  private cookies: Map<string, string> = new Map();

  setCookiesFromHeaders(headers: Headers) {
    const raw = headers.get('set-cookie');
    if (!raw) return;
    // Handle multiple set-cookie or comma-separated
    const parts = raw.split(/,(?=\s*[a-zA-Z0-9_-]+=)/);
    for (const part of parts) {
      const match = part.trim().match(/^([^=]+)=([^;]+)/);
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
  }

  getCookieHeader(): string {
    const pairs: string[] = [];
    for (const [k, v] of this.cookies.entries()) {
      pairs.push(`${k}=${v}`);
    }
    return pairs.join('; ');
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    const cookieStr = this.getCookieHeader();
    if (cookieStr) {
      headers.set('Cookie', cookieStr);
    }
    const res = await fetch(url, { ...init, headers });
    this.setCookiesFromHeaders(res.headers);
    return res;
  }
}

describe('VYRO Multi-User Isolation & Commercial Integrity', () => {
  const jarA = new CookieJar();
  const jarB = new CookieJar();
  const jarC = new CookieJar();

  let userA: any;
  let userB: any;
  let userC: any;

  before(async () => {
    // 1. Register User A
    const resA = await jarA.fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `buyer.alice.${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Alice Buyer'
      })
    });
    const dataA = await resA.json();
    assert.equal(resA.status, 201, `Failed to register User A: ${JSON.stringify(dataA)}`);
    userA = dataA.data.user || dataA.data;

    // 2. Register User B
    const resB = await jarB.fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `seller.bob.${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Bob Seller'
      })
    });
    const dataB = await resB.json();
    assert.equal(resB.status, 201, `Failed to register User B: ${JSON.stringify(dataB)}`);
    userB = dataB.data.user || dataB.data;

    // 3. Register User C (Brand New Account)
    const resC = await jarC.fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `clean.charlie.${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Charlie Clean'
      })
    });
    const dataC = await resC.json();
    assert.equal(resC.status, 201, `Failed to register User C: ${JSON.stringify(dataC)}`);
    userC = dataC.data.user || dataC.data;
  });

  test('1. Independent sessions in separate cookie jars (never trusts client-supplied user id)', async () => {
    const resA = await jarA.fetch(`${BASE_URL}/auth/me`, {
      headers: { 'x-user-id': userB.id } // Attacker attempts header spoofing
    });
    const dataA = await resA.json();
    assert.equal(resA.status, 200);
    const resolvedA = dataA.data?.user || dataA.data;
    assert.equal(resolvedA.id, userA.id, 'Must resolve to User A from session cookie, not spoofed header');

    const resB = await jarB.fetch(`${BASE_URL}/auth/me`);
    const dataB = await resB.json();
    assert.equal(resB.status, 200);
    const resolvedB = dataB.data?.user || dataB.data;
    assert.equal(resolvedB.id, userB.id, 'Session B must remain User B');

    // Unauthenticated request with x-user-id header must be rejected with 401
    const unauthRes = await fetch(`${BASE_URL}/home`, {
      headers: { 'x-user-id': userA.id }
    });
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401');
  });

  test('2. Brand new Account C starts completely empty', async () => {
    // Overview / Home
    const homeRes = await jarC.fetch(`${BASE_URL}/home`);
    const homeData = await homeRes.json();
    assert.equal(homeRes.status, 200);
    assert.equal(homeData.data.needsYou.length, 0, 'New user needsYou must be empty');
    assert.equal(homeData.data.inProgress.length, 0, 'New user inProgress deals must be empty');
    assert.equal(homeData.data.handledForYou.length, 0, 'New user handledForYou must be empty');
    assert.equal(homeData.data.stats.needsCount, 0);
    assert.equal(homeData.data.stats.inProgressCount, 0);
    assert.equal(homeData.data.stats.handledCount, 0);

    // Deals / Negotiations
    const negsRes = await jarC.fetch(`${BASE_URL}/negotiations`);
    const negsData = await negsRes.json();
    assert.equal(negsData.data.length, 0, 'New user must have zero negotiations');

    // Listings (my)
    const listingsRes = await jarC.fetch(`${BASE_URL}/listings?sellerId=${userC.id}`);
    const listingsData = await listingsRes.json();
    assert.equal(listingsData.data.length, 0, 'New user must have zero published listings');

    // Transactions
    const txRes = await jarC.fetch(`${BASE_URL}/transactions`);
    const txData = await txRes.json();
    assert.equal(txData.data.length, 0, 'New user must have zero transactions');

    // Notifications
    const notifRes = await jarC.fetch(`${BASE_URL}/notifications`);
    const notifData = await notifRes.json();
    assert.equal(notifData.data.length, 0, 'New user must have zero notifications');

    // Agents
    const agentsRes = await jarC.fetch(`${BASE_URL}/agents?owner=me`);
    const agentsData = await agentsRes.json();
    assert.equal(agentsData.data.length, 0, 'New user must have zero agents');
  });

  test('3. Scoped access: User A cannot read or modify User B records (returns 404, no leaks)', async () => {
    // User B creates a private listing
    const listingRes = await jarB.fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bob Security Pentest Service',
        category: 'Security',
        price: 300,
        minAcceptablePrice: 240,
        deliveryDays: 3,
        deliverables: ['OWASP Audit', 'Executive Report']
      })
    });
    const listingData = await listingRes.json();
    assert.equal(listingRes.status, 201);
    const bobListing = listingData.data;

    // User B creates a private request
    const reqRes = await jarB.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bob Internal Request',
        category: 'Development',
        rawInput: 'Build internal backend tooling',
        maxBudget: 500,
        deadlineDays: 7
      })
    });
    const reqData = await reqRes.json();
    assert.equal(reqRes.status, 201);
    const bobRequest = reqData.data;

    // User A attempts to read Bob's request by ID -> Expect 404
    const aReadReq = await jarA.fetch(`${BASE_URL}/requests/${bobRequest.id}`);
    assert.equal(aReadReq.status, 404, 'User A reading User B request must return 404');

    // User A attempts to update Bob's listing -> Expect 404
    const aUpdateListing = await jarA.fetch(`${BASE_URL}/listings/${bobListing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked Title' })
    });
    assert.equal(aUpdateListing.status, 404, 'User A updating User B listing must return 404');

    // User A attempts to delete Bob's listing -> Expect 404
    const aDeleteListing = await jarA.fetch(`${BASE_URL}/listings/${bobListing.id}`, {
      method: 'DELETE'
    });
    assert.equal(aDeleteListing.status, 404, 'User A deleting User B listing must return 404');
  });

  test('4. Privacy leak canary test: Seller floor hidden from Buyer; Buyer ceiling hidden from Seller', async () => {
    const CANARY_FLOOR = 197;
    const CANARY_CEILING = 289;

    // Bob creates listing with canary floor
    const listRes = await jarB.fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Full-Stack Web App Sprint',
        category: 'Development',
        price: 320,
        minAcceptablePrice: CANARY_FLOOR,
        deliveryDays: 5,
        deliverables: ['Production App', 'CI/CD Pipeline']
      })
    });
    const bobListing = (await listRes.json()).data;
    assert.ok(bobListing.sellerAgentId, 'Listing must have an attached seller agent');

    // Alice views the marketplace
    const marketRes = await jarA.fetch(`${BASE_URL}/listings`);
    const marketText = await marketRes.text();
    assert.ok(!marketText.includes(String(CANARY_FLOOR)), 'Marketplace response must NEVER leak seller floor price');

    // Alice posts a request with canary ceiling
    const reqRes = await jarA.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Full-Stack App Commission',
        category: 'Development',
        rawInput: 'Need a full stack app within budget',
        maxBudget: CANARY_CEILING,
        deadlineDays: 5
      })
    });
    const aliceRequest = (await reqRes.json()).data;

    // Launch negotiation between Alice and Bob's seller agent
    const negRes = await jarA.fetch(`${BASE_URL}/negotiations/multi-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: aliceRequest.id,
        sellerAgentIds: [bobListing.sellerAgentId]
      })
    });
    const negData = await negRes.json();
    assert.equal(negRes.status, 200, `Negotiation failed: ${JSON.stringify(negData)}`);
    const negotiationId = negData.data.negotiations[0].id;

    // Bob views the negotiation: must NOT leak Alice's ceiling
    const bobViewRes = await jarB.fetch(`${BASE_URL}/negotiations/${negotiationId}`);
    const bobViewText = await bobViewRes.text();
    if (bobViewText.includes(String(CANARY_CEILING))) {
      console.log('Bob view leaked CANARY_CEILING! Response dump:');
      const parsed = JSON.parse(bobViewText);
      console.log(JSON.stringify(parsed, null, 2));
    }
    assert.ok(!bobViewText.includes(String(CANARY_CEILING)), 'Seller view must NEVER leak buyer ceiling');

    // Alice views the negotiation: must NOT leak Bob's floor (mask ISO millisecond fragments .XXXz to avoid timestamp coincidences)
    const aliceViewRes = await jarA.fetch(`${BASE_URL}/negotiations/${negotiationId}`);
    const aliceViewText = await aliceViewRes.text();
    const aliceViewStripped = aliceViewText.replace(/\.\d{3}Z/g, '.000Z');
    assert.ok(!aliceViewStripped.includes(String(CANARY_FLOOR)), 'Buyer view must NEVER leak seller floor');
  });

  test('5. Self-dealing prevention: User cannot negotiate with themselves', async () => {
    // Alice creates a seller listing
    const listRes = await jarA.fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Alice Architecture Advisory',
        category: 'Design',
        price: 400,
        minAcceptablePrice: 350,
        deliveryDays: 2
      })
    });
    const aliceListing = (await listRes.json()).data;

    // Alice creates a buyer request
    const reqRes = await jarA.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Self-dealing request test',
        category: 'Design',
        rawInput: 'Buying from myself',
        maxBudget: 400,
        deadlineDays: 2
      })
    });
    const aliceReq = (await reqRes.json()).data;

    // Alice attempts to negotiate against her own seller agent
    const selfDealRes = await jarA.fetch(`${BASE_URL}/negotiations/multi-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: aliceReq.id,
        sellerAgentIds: [aliceListing.sellerAgentId]
      })
    });

    assert.equal(selfDealRes.status, 400, 'Self-dealing negotiation must be rejected with 400');
    const selfDealData = await selfDealRes.json();
    const errorStr = JSON.stringify(selfDealData);
    assert.ok(
      errorStr.includes('Self-dealing prohibited') ||
      errorStr.includes('self-dealing') ||
      errorStr.includes('belong to your account'),
      'Response must indicate self-dealing prohibition'
    );
  });

  test('6. Two-sided flow A<->B: Deal formation, escalation/decision, and payment authorization', async () => {
    // 1. Bob creates listing: Price $190, Floor $160
    const listRes = await jarB.fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'API Performance Tuning Sprint',
        category: 'Development',
        price: 190,
        minAcceptablePrice: 160,
        deliveryDays: 3,
        deliverables: ['Database Indexing', 'Redis Cache Setup']
      })
    });
    const bobListing = (await listRes.json()).data;

    // 2. Alice sets her auto-approval limit to $150 so a $175 deal triggers Human Review
    await jarA.fetch(`${BASE_URL}/rules/limits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoApprovalLimit: 150,
        dailyBudgetCap: 500
      })
    });

    // 3. Alice creates request with max budget $185
    const reqRes = await jarA.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tune our Express API latency',
        category: 'Development',
        rawInput: 'Need API tuning within 3 days for under $185',
        maxBudget: 185,
        deadlineDays: 3
      })
    });
    const aliceReq = (await reqRes.json()).data;

    // 4. Dispatch autonomous negotiation
    const negRes = await jarA.fetch(`${BASE_URL}/negotiations/multi-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: aliceReq.id,
        sellerAgentIds: [bobListing.sellerAgentId]
      })
    });
    const negData = await negRes.json();
    assert.equal(negRes.status, 200);
    const negotiation = negData.data.negotiations[0];
    assert.ok(negotiation, 'Negotiation must be created');

    // 5. Check Alice's Home: item should be in review queue (escalated above $150 limit)
    const aliceHomeRes = await jarA.fetch(`${BASE_URL}/home`);
    const aliceHomeData = await aliceHomeRes.json();
    const escalatedItem = aliceHomeData.data.needsYou.find(
      (item: any) => item.negotiationId === negotiation.id
    );
    assert.ok(escalatedItem, 'Deal exceeding auto-limit must route to Alice review queue');

    // 6. Bob's queue must NOT show this as an action item for him (he is seller, deal is awaiting buyer)
    const bobHomeRes = await jarB.fetch(`${BASE_URL}/home`);
    const bobHomeData = await bobHomeRes.json();
    const bobActionItem = bobHomeData.data.needsYou.find(
      (item: any) => item.negotiationId === negotiation.id
    );
    assert.equal(bobActionItem, undefined, 'Buyer review queue items must not appear in Seller review queue');

    // 7. Payment capture before human approval must be blocked
    const earlyCaptureRes = await jarA.fetch(`${BASE_URL}/payments/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ORDER_PREMATURE' })
    });
    assert.equal(earlyCaptureRes.status, 404, 'Capturing non-existent/unapproved order must fail');

    // 8. Without Seller payout account configured, Alice's confirmation is cleanly gated (409)
    const gatedRes = await jarA.fetch(`${BASE_URL}/home/review/${escalatedItem.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Trying approve before seller payout email.' })
    });
    assert.equal(gatedRes.status, 409, 'Confirming a deal before seller adds a payout account must return 409');

    // Bob configures his seller payout email
    const setupPayoutRes = await jarB.fetch(`${BASE_URL}/payouts/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalEmail: 'sb-bob-seller@personal.example.com' })
    });
    assert.equal(setupPayoutRes.status, 200, 'Bob must be able to set his PayPal payout email');

    // Now Alice approves the deal via the review queue action
    const approveRes = await jarA.fetch(`${BASE_URL}/home/review/${escalatedItem.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: 'Approved manually for project requirements.'
      })
    });
    assert.equal(approveRes.status, 200, 'Alice must be able to approve the escalated deal');

    const freshNegRes = await jarA.fetch(`${BASE_URL}/negotiations/${negotiation.id}`);
    const freshNeg = (await freshNegRes.json()).data;
    const activeAgreementId = freshNeg.agreementId || freshNeg.agreement?.id || negotiation.agreementId;
    assert.ok(activeAgreementId, 'An agreement must exist for the approved deal');

    // 9. Bob (seller) cannot initiate buyer checkout
    const bobPayRes = await jarB.fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId: activeAgreementId })
    });
    assert.equal(bobPayRes.status, 404, 'Seller attempting to trigger buyer payment must return 404');
  });
});
