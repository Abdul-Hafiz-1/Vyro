const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'audit', 'round-0');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 }
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', t);
  }, theme);
  await new Promise(r => setTimeout(r, 150));
}

async function captureScreenCombinations(page, routeUrl, screenBaseName) {
  try {
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    // Allow React queries and rendering to settle
    await new Promise(r => setTimeout(r, 700));

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 200));

      // 1. Dark
      await setTheme(page, 'dark');
      const darkFile = path.join(OUTPUT_DIR, `${screenBaseName}_${vp.name}_dark.png`);
      await page.screenshot({ path: darkFile, fullPage: true });

      // 2. Light
      await setTheme(page, 'light');
      const lightFile = path.join(OUTPUT_DIR, `${screenBaseName}_${vp.name}_light.png`);
      await page.screenshot({ path: lightFile, fullPage: true });

      console.log(`[Captured] ${screenBaseName} @ ${vp.name}px (dark & light)`);
    }
  } catch (err) {
    console.error(`[Error] ${screenBaseName}:`, err.message);
  }
}

async function loginUser(page, email, password) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1200));
}

async function registerUser(page, name, email, password) {
  await page.goto('http://localhost:5173/signup', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));
  const inputs = await page.$$('input');
  if (inputs.length >= 3) {
    await inputs[0].type(name);
    await inputs[1].type(email);
    await inputs[2].type(password);
  }
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1200));
}

async function run() {
  console.log('--- STARTING HIGH-SPEED PHASE 0 SCREENSHOT CAPTURE ---');
  console.log(`Target Output: ${OUTPUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. PUBLIC SCREENS
    console.log('\n--- 1. Capturing Public Screens ---');
    const publicContext = await browser.createBrowserContext();
    const publicPage = await publicContext.newPage();

    const publicRoutes = [
      { url: 'http://localhost:5173/', name: 'public_landing' },
      { url: 'http://localhost:5173/how-it-works', name: 'public_how_it_works' },
      { url: 'http://localhost:5173/security', name: 'public_security' },
      { url: 'http://localhost:5173/login', name: 'public_login' },
      { url: 'http://localhost:5173/signup', name: 'public_signup' },
      { url: 'http://localhost:5173/onboarding', name: 'public_onboarding' }
    ];

    for (const r of publicRoutes) {
      await captureScreenCombinations(publicPage, r.url, r.name);
    }
    await publicContext.close();

    // 2. ACCOUNT A (BUYER: demo.buyer@example.com)
    console.log('\n--- 2. Capturing Account A (Buyer) Screens ---');
    const buyerContext = await browser.createBrowserContext();
    const buyerPage = await buyerContext.newPage();
    await loginUser(buyerPage, 'demo.buyer@example.com', 'password123');

    const buyerScreens = [
      { url: 'http://localhost:5173/app', name: 'buyer_overview_filled' },
      { url: 'http://localhost:5173/app/deals', name: 'buyer_deals_list' },
      { url: 'http://localhost:5173/app/deals/neg_demo_escalated_01', name: 'buyer_deal_escalated_cockpit' },
      { url: 'http://localhost:5173/app/deals/neg_demo_completed_02', name: 'buyer_deal_completed_cockpit' },
      { url: 'http://localhost:5173/app/requests/new', name: 'buyer_request_new' },
      { url: 'http://localhost:5173/app/marketplace', name: 'buyer_marketplace' },
      { url: 'http://localhost:5173/app/rules', name: 'buyer_rules' },
      { url: 'http://localhost:5173/app/transactions', name: 'buyer_transactions' },
      { url: 'http://localhost:5173/app/settings', name: 'buyer_settings' },
      { url: 'http://localhost:5173/app/notifications', name: 'buyer_notifications' },
      { url: 'http://localhost:5173/app/deals/neg_missing_9999', name: 'buyer_error_404_deal' }
    ];

    for (const s of buyerScreens) {
      await captureScreenCombinations(buyerPage, s.url, s.name);
    }
    await buyerContext.close();

    // 3. ACCOUNT B (SELLER: demo.seller@example.com)
    console.log('\n--- 3. Capturing Account B (Seller) Screens ---');
    const sellerContext = await browser.createBrowserContext();
    const sellerPage = await sellerContext.newPage();
    await loginUser(sellerPage, 'demo.seller@example.com', 'password123');

    const sellerScreens = [
      { url: 'http://localhost:5173/app', name: 'seller_overview' },
      { url: 'http://localhost:5173/app/deals', name: 'seller_deals_list' },
      { url: 'http://localhost:5173/app/deals/neg_demo_escalated_01', name: 'seller_deal_cockpit_private_floor_hidden' },
      { url: 'http://localhost:5173/app/listings', name: 'seller_my_listings' },
      { url: 'http://localhost:5173/app/listings/new', name: 'seller_listing_new' },
      { url: 'http://localhost:5173/app/rules', name: 'seller_rules' }
    ];

    for (const s of sellerScreens) {
      await captureScreenCombinations(sellerPage, s.url, s.name);
    }
    await sellerContext.close();

    // 4. ACCOUNT C (EMPTY ACCOUNT)
    console.log('\n--- 4. Capturing Account C (Empty Account) Screens ---');
    const emptyContext = await browser.createBrowserContext();
    const emptyPage = await emptyContext.newPage();
    const emptyEmail = `empty.round0.${Date.now()}@example.com`;
    await registerUser(emptyPage, 'Empty Auditor', emptyEmail, 'Password123!');

    const emptyScreens = [
      { url: 'http://localhost:5173/app', name: 'empty_overview' },
      { url: 'http://localhost:5173/app/deals', name: 'empty_deals_list' },
      { url: 'http://localhost:5173/app/listings', name: 'empty_listings' },
      { url: 'http://localhost:5173/app/transactions', name: 'empty_transactions' }
    ];

    for (const s of emptyScreens) {
      await captureScreenCombinations(emptyPage, s.url, s.name);
    }
    await emptyContext.close();

    console.log('\n=== ALL PHASE 0 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Fatal capture error:', err);
  } finally {
    await browser.close();
  }
}

run();
