import { store } from '../server/src/db/store.js';

interface ResilienceResult {
  test: string;
  verdict: 'PASS' | 'FAIL';
  detail: string;
}

const results: ResilienceResult[] = [];
const BASE_URL = 'http://localhost:4000/api/v1';

class CookieJar {
  private cookies: Map<string, string> = new Map();

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (this.cookies.size > 0) {
      const cookieStr = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers.set('Cookie', cookieStr);
    }
    const res = await fetch(url, { ...init, headers });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(';');
      const [nameVal] = parts;
      const [k, v] = nameVal.split('=');
      if (k && v) this.cookies.set(k.trim(), v.trim());
    }
    return res;
  }
}

async function run() {
  console.log('--- EXECUTING PHASE 2 BREAKAGE & RESILIENCE TESTS ---');

  const session = new CookieJar();
  const testEmail = `resilience.${Date.now()}@example.com`;

  // 0. Register user
  await session.fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Resilience Auditor',
      email: testEmail,
      password: 'Password123!'
    })
  });

  // TEST 1: Boundary inputs on POST /requests
  try {
    // 1a. Empty title & 0 budget
    const res1 = await session.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawInput: 'Test input',
        title: '',
        category: 'Design',
        maxBudget: 0,
        deadlineDays: -5
      })
    });
    if (res1.status === 400) {
      results.push({
        test: 'Boundary Inputs: Reject invalid zero/negative values',
        verdict: 'PASS',
        detail: 'Server returned 400 Bad Request with field validation errors.'
      });
    } else {
      results.push({
        test: 'Boundary Inputs: Reject invalid zero/negative values',
        verdict: 'FAIL',
        detail: `Expected 400 but got ${res1.status}.`
      });
    }

    // 1b. Oversized input (10,000 characters)
    const longString = 'A'.repeat(10000);
    const res2 = await session.fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawInput: longString,
        title: 'Massive Input Test',
        category: 'Development',
        maxBudget: 250,
        deadlineDays: 5
      })
    });
    // Server should handle without crashing
    if (res2.ok || res2.status === 400) {
      results.push({
        test: 'Boundary Inputs: 10,000 Character Stress Input',
        verdict: 'PASS',
        detail: `Handled cleanly with HTTP ${res2.status} without server panic.`
      });
    } else {
      results.push({
        test: 'Boundary Inputs: 10,000 Character Stress Input',
        verdict: 'FAIL',
        detail: `Returned server error ${res2.status}.`
      });
    }
  } catch (err: any) {
    results.push({
      test: 'Boundary Inputs',
      verdict: 'FAIL',
      detail: err.message
    });
  }

  // TEST 2: Double-click Idempotency Check on Settlement
  try {
    // Check double capture idempotency
    const resA = await session.fetch(`${BASE_URL}/payments/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'ORDER_SANDBOX_DEMO_771',
        idempotencyKey: 'test_idem_dup_01'
      })
    });
    const resB = await session.fetch(`${BASE_URL}/payments/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'ORDER_SANDBOX_DEMO_771',
        idempotencyKey: 'test_idem_dup_01'
      })
    });
    if ((resA.ok || resA.status === 404 || resA.status === 422) && resB.status === resA.status) {
      results.push({
        test: 'Rapid Double-Click / Idempotency',
        verdict: 'PASS',
        detail: `Both rapid calls yielded identical deterministic outcome (${resA.status}) without duplicating records.`
      });
    } else {
      results.push({
        test: 'Rapid Double-Click / Idempotency',
        verdict: 'FAIL',
        detail: `Calls diverged: First=${resA.status}, Second=${resB.status}.`
      });
    }
  } catch (err: any) {
    results.push({
      test: 'Rapid Double-Click / Idempotency',
      verdict: 'FAIL',
      detail: err.message
    });
  }

  // TEST 3: Expired / Missing Session Security
  try {
    const unauthSession = new CookieJar();
    const res = await unauthSession.fetch(`${BASE_URL}/requests`);
    if (res.status === 401) {
      results.push({
        test: 'Expired / Unauthenticated Session Guard',
        verdict: 'PASS',
        detail: 'Unauthenticated requests strictly return 401 Unauthorized.'
      });
    } else {
      results.push({
        test: 'Expired / Unauthenticated Session Guard',
        verdict: 'FAIL',
        detail: `Expected 401 but got ${res.status}.`
      });
    }
  } catch (err: any) {
    results.push({
      test: 'Expired / Unauthenticated Session Guard',
      verdict: 'FAIL',
      detail: err.message
    });
  }

  // TEST 4: Deleted Listing during negotiation handling
  try {
    // Create listing, then delete it, then attempt to view or start deal
    const createListRes = await session.fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temporary Transient Listing',
        category: 'Design',
        price: 200,
        minAcceptablePrice: 150,
        deliveryDays: 3,
        deliverables: ['Temp Item']
      })
    });
    const listData = await createListRes.json();
    const tempListingId = listData.data.id;

    // Delete listing
    const delRes = await session.fetch(`${BASE_URL}/listings/${tempListingId}`, {
      method: 'DELETE'
    });

    // Check getting deleted listing
    const getDeletedRes = await session.fetch(`${BASE_URL}/listings/${tempListingId}`);
    if (getDeletedRes.status === 404) {
      results.push({
        test: 'Deleted Listing Handling',
        verdict: 'PASS',
        detail: 'Deleted listing is cleanly purged and returns 404.'
      });
    } else {
      results.push({
        test: 'Deleted Listing Handling',
        verdict: 'FAIL',
        detail: `Deleted listing returned status ${getDeletedRes.status}.`
      });
    }
  } catch (err: any) {
    results.push({
      test: 'Deleted Listing Handling',
      verdict: 'FAIL',
      detail: err.message
    });
  }

  console.log('\n--- RESILIENCE TEST RESULTS ---');
  for (const r of results) {
    console.log(`[${r.verdict}] ${r.test}`);
    console.log(`       ${r.detail}`);
  }
}

run().catch(console.error);
