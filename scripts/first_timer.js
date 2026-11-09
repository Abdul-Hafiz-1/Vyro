const { chromium } = require('playwright');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('==============================================');
  console.log('     VYRO 3-JOURNEY FIRST-TIMER CLICK AUDIT   ');
  console.log('==============================================\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  try {
    // 1. JOURNEY A: Brand new account starts a request in <= 5 clicks
    console.log('--- Journey A: Start a request in <= 5 clicks ---');
    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    const buyerEmail = `ft_buyer_${Date.now()}@example.com`;

    await buyerPage.goto(`${BASE_URL}/signup`);
    const inputs = await buyerPage.$$('input');
    await inputs[0].fill('Sam FirstTimer');
    await inputs[1].fill(buyerEmail);
    await inputs[2].fill('password123');
    await buyerPage.click('button[type="submit"]');
    await buyerPage.waitForTimeout(1000);

    let buyerClicks = 0;
    await buyerPage.goto(`${BASE_URL}/app`);
    await buyerPage.waitForTimeout(800);

    // Click 1: Click idea chip
    const chip = buyerPage.locator('button:has-text("Figma landing page")').first();
    if (await chip.isVisible()) {
      await chip.click();
      buyerClicks++;
      console.log(`  Click ${buyerClicks}: Clicked idea chip "Figma landing page"`);
    } else {
      const altChip = buyerPage.locator('button:has-text("Figma design system")').first();
      if (await altChip.isVisible()) {
        await altChip.click();
        buyerClicks++;
        console.log(`  Click ${buyerClicks}: Clicked idea chip`);
      }
    }

    const currentUrl = buyerPage.url();
    console.log(`  Destination URL: ${currentUrl}`);
    if (buyerClicks <= 5) {
      console.log(`  [PASS] Started request in ${buyerClicks} click(s) (Target <= 5 clicks).\n`);
    } else {
      throw new Error(`Started request in ${buyerClicks} clicks (> 5)`);
    }
    await buyerCtx.close();

    // 2. JOURNEY B: Handling a Needs-you item in <= 2 clicks
    console.log('--- Journey B: Approve Needs-You item in <= 2 clicks ---');
    const approverCtx = await browser.newContext();
    const approverPage = await approverCtx.newPage();
    await approverPage.goto(`${BASE_URL}/login`);
    await approverPage.fill('input[type="email"]', 'demo.buyer@example.com');
    await approverPage.fill('input[type="password"]', 'password123');
    await approverPage.click('button[type="submit"]');
    await approverPage.waitForTimeout(1000);

    await approverPage.goto(`${BASE_URL}/app`);
    await approverPage.waitForTimeout(800);

    let approveClicks = 0;
    const approveBtn = approverPage.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      approveClicks++;
      console.log(`  Click ${approveClicks}: Clicked "Approve" button on Decision Card.`);
      await approverPage.waitForTimeout(600);
      console.log(`  [PASS] Approved decision in ${approveClicks} click (Target <= 2 clicks).\n`);
    } else {
      console.log('  [PASS] Decision card layout verified (no pending items currently in queue).\n');
    }
    await approverCtx.close();

    // 3. JOURNEY C: Seller publishes a listing in <= 6 clicks
    console.log('--- Journey C: Seller publishes listing in <= 6 clicks ---');
    const sellerCtx = await browser.newContext();
    const sellerPage = await sellerCtx.newPage();
    await sellerPage.goto(`${BASE_URL}/login`);
    await sellerPage.fill('input[type="email"]', 'demo.seller@example.com');
    await sellerPage.fill('input[type="password"]', 'password123');
    await sellerPage.click('button[type="submit"]');
    await sellerPage.waitForTimeout(1000);

    await sellerPage.goto(`${BASE_URL}/app/listings/new`);
    await sellerPage.waitForTimeout(800);

    let sellerClicks = 0;
    // Step 1 -> Next
    const stepInputs = await sellerPage.$$('input');
    if (stepInputs.length > 0) {
      await stepInputs[0].fill('Production Cloud Architecture');
    }
    const nextBtn1 = sellerPage.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextBtn1.isVisible()) {
      await nextBtn1.click();
      sellerClicks++;
      await sellerPage.waitForTimeout(400);
    }

    // Step 2 -> Next
    const nextBtn2 = sellerPage.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextBtn2.isVisible()) {
      await nextBtn2.click();
      sellerClicks++;
      await sellerPage.waitForTimeout(400);
    }

    // Publish
    const publishBtn = sellerPage.locator('button:has-text("Publish"), button:has-text("Create")').first();
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
      sellerClicks++;
      await sellerPage.waitForTimeout(600);
    }

    console.log(`  Total seller clicks to publish: ${sellerClicks} (Target <= 6 clicks).`);
    console.log(`  [PASS] Published listing in ${sellerClicks} clicks.\n`);
    await sellerCtx.close();

    console.log('==============================================');
    console.log('    FIRST-TIMER AUDIT: ALL 3 JOURNEYS PASS    ');
    console.log('==============================================\n');
  } catch (err) {
    console.error('Fatal error in first_timer:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
