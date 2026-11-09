import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786\\screenshots';
const CLIENT_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('--- STARTING MULTI-USER VERIFICATION ---');

  // 1. Register User A (Alice, Buyer) and User B (Bob, Seller) via API
  console.log('Registering User A (Alice Buyer)...');
  const resA = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `alice.buyer.${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Alice Buyer'
    })
  });
  const dataA = await resA.json();
  const sessionCookieA = resA.headers.get('set-cookie');
  console.log('Alice registered:', dataA.data?.id, 'Session:', dataA.sessionId);

  console.log('Registering User B (Bob Seller)...');
  const resB = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `bob.seller.${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Bob Seller'
    })
  });
  const dataB = await resB.json();
  console.log('Bob registered:', dataB.data?.id, 'Session:', dataB.sessionId);

  // Switch Bob's active workspace to 'seller'
  await fetch(`${API_URL}/auth/workspace`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dataB.sessionId}`
    },
    body: JSON.stringify({ activeWorkspace: 'seller' })
  });

  // 2. Launch browser
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    // Isolated Context A for Alice
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1440, height: 900 });
    await pageA.setCookie({
      name: 'vyro_session',
      value: dataA.sessionId,
      domain: 'localhost',
      path: '/'
    });

    // Isolated Context B for Bob
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 1440, height: 900 });
    await pageB.setCookie({
      name: 'vyro_session',
      value: dataB.sessionId,
      domain: 'localhost',
      path: '/'
    });

    // --- SCREENSHOT 1: Alice on empty Today page ---
    console.log('Navigating Alice to Today page...');
    await pageA.goto(`${CLIENT_URL}/app`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_a_empty_today.png'),
      fullPage: true
    });
    console.log('Captured account_a_empty_today.png');

    // --- SCREENSHOT 2: Bob on empty Today page (Seller Workspace) ---
    console.log('Navigating Bob to Today page (Seller)...');
    await pageB.goto(`${CLIENT_URL}/app`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageB.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_b_empty_today.png'),
      fullPage: true
    });
    console.log('Captured account_b_empty_today.png');

    // --- SCREENSHOT 3: Bob creating a listing ---
    console.log('Bob navigating to listings to create listing...');
    await pageB.goto(`${CLIENT_URL}/app/listings`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Click "Create Listing"
    const createBtn = await pageB.$('button::-p-text(Create Listing)') || await pageB.$('button::-p-text(Create your first listing)');
    if (createBtn) {
      await createBtn.click();
    }
    await new Promise(r => setTimeout(r, 500));

    // Fill form
    await pageB.type('input[placeholder*="Next.js"]', 'Full-Stack Security Audit & Hardening');
    await pageB.select('select', 'Security');
    await pageB.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_b_creating_listing.png')
    });
    console.log('Captured account_b_creating_listing.png');

    // Submit form
    const submitBtn = await pageB.$('button::-p-text(Publish to Marketplace)');
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 2000));
    await pageB.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_b_listings_published.png'),
      fullPage: true
    });
    console.log('Captured account_b_listings_published.png');

    // --- SCREENSHOT 4: Alice checking My Offerings (Empty) ---
    console.log('Alice navigating to listings (My Offerings)...');
    await pageA.goto(`${CLIENT_URL}/app/listings`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Switch to "My Offerings"
    const myTab = await pageA.$('button::-p-text(My Offerings)');
    if (myTab) {
      await myTab.click();
      await new Promise(r => setTimeout(r, 800));
    }
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_a_my_listings_empty.png'),
      fullPage: true
    });
    console.log('Captured account_a_my_listings_empty.png');

    // --- SCREENSHOT 5: Alice checking Marketplace (Sees Bob, Floor Hidden) ---
    console.log('Alice switching to All Marketplace...');
    const allTab = await pageA.$('button::-p-text(All Marketplace)');
    if (allTab) {
      await allTab.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_a_marketplace_sees_b.png'),
      fullPage: true
    });
    console.log('Captured account_a_marketplace_sees_b.png');

    // --- SCREENSHOT 6: Alice procuring Bob service / posting request ---
    console.log('Alice procuring Bob offering...');
    const procureBtn = await pageA.$('button::-p-text(Procure)');
    if (procureBtn) {
      await procureBtn.click();
      await pageA.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    } else {
      await pageA.goto(`${CLIENT_URL}/app/requests/new`, { waitUntil: 'networkidle2' });
    }
    await new Promise(r => setTimeout(r, 1000));
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'account_a_posting_request.png'),
      fullPage: true
    });
    console.log('Captured account_a_posting_request.png');

    // Alice launches autonomous procurement
    console.log('Launching autonomous procurement...');
    const launchBtn = await pageA.$('button::-p-text(Dispatch Autonomous Procurement)');
    if (launchBtn) {
      await launchBtn.click();
      console.log('Clicked Dispatch Autonomous Procurement, awaiting deal channel navigation...');
      await pageA.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }

    const dealUrl = pageA.url();
    console.log('Current deal URL for Alice:', dealUrl);

    // --- SCREENSHOT 7: Deal Perspective Buyer ---
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'deal_perspective_buyer.png'),
      fullPage: true
    });
    console.log('Captured deal_perspective_buyer.png');

    // --- SCREENSHOT 8: Deal Perspective Seller ---
    if (dealUrl.includes('/deals/')) {
      console.log('Bob navigating to deal URL:', dealUrl);
      await pageB.goto(dealUrl, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
      await pageB.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'deal_perspective_seller.png'),
        fullPage: true
      });
      console.log('Captured deal_perspective_seller.png');
    }

    // --- SCREENSHOT 9 & 10: Review Queue routing ---
    console.log('Alice checking review queue on Today page...');
    await pageA.goto(`${CLIENT_URL}/app`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'review_queue_buyer_only.png'),
      fullPage: true
    });
    console.log('Captured review_queue_buyer_only.png');

    console.log('Bob checking Today page (Queue must be clear)...');
    await pageB.goto(`${CLIENT_URL}/app`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageB.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'review_queue_seller_clear.png'),
      fullPage: true
    });
    console.log('Captured review_queue_seller_clear.png');

    console.log('--- ALL MANUAL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ---');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
