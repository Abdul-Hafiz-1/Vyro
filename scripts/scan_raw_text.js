const { chromium } = require('playwright');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 }
];

// Patterns that must NOT appear in visible human-facing UI text
const BANNED_PATTERNS = [
  { name: 'Prefix ID (neg/req/txn/dec)', regex: /\b(neg|req|txn|dec|usr|list|sess)_[a-zA-Z0-9]+/ },
  { name: 'Hex hash (8+ chars)', regex: /\b[a-f0-9]{8,}\b/i },
  { name: 'snake_case word', regex: /\b[a-z]{3,}_[a-z]{3,}\b/ },
  { name: 'Literal "undefined"', regex: /\bundefined\b/ },
  { name: 'Literal "null"', regex: /\bnull\b/ },
  { name: 'Literal "NaN"', regex: /\bNaN\b/ },
  { name: 'Raw JSON object brace', regex: /\{[^{}]*:[^{}]*\}/ },
  { name: 'Raw [object Object]', regex: /\[object\s+[a-zA-Z0-9_]+\]/i },
  { name: 'ISO date pattern', regex: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ },
  { name: 'Money with >2 decimal places', regex: /\$\d+\.\d{3,}/ }
];

async function scanPageTextAndFonts(page, screenName) {
  const violations = await page.evaluate((bannedList) => {
    const issues = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Ignore script, style, SVG internals, hidden elements
          const tag = node.tagName.toLowerCase();
          if (['script', 'style', 'svg', 'path', 'noscript'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      // Check only direct text nodes of this element to avoid duplicate nested reports
      let directText = '';
      for (const child of currentNode.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          directText += child.textContent;
        }
      }
      directText = directText.trim();

      if (directText.length > 0) {
        const computedStyle = window.getComputedStyle(currentNode);
        const fontSizePx = parseFloat(computedStyle.fontSize);

        // Check font size >= 14px
        if (fontSizePx < 13.5) {
          issues.push({
            type: 'Typography < 14px',
            text: directText.substring(0, 50),
            detail: `${fontSizePx}px on <${currentNode.tagName.toLowerCase()}>`
          });
        }

        // Check banned text patterns
        for (const ban of bannedList) {
          const reg = new RegExp(ban.regex, 'i');
          if (reg.test(directText)) {
            issues.push({
              type: ban.name,
              text: directText.substring(0, 60),
              detail: `matched: ${ban.regex}`
            });
          }
        }
      }

      currentNode = walker.nextNode();
    }

    return issues;
  }, BANNED_PATTERNS.map(b => ({ name: b.name, regex: b.regex.source })));

  return violations;
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('====================================================');
  console.log('  VYRO PLAIN-LANGUAGE & RAW TEXT SCANNER (Playwright)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  let totalFailures = 0;

  try {
    // 1. Account A (Buyer) Scan
    console.log('--- 1. Scanning Account A (Buyer: demo.buyer@example.com) ---');
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    await login(buyerPage, 'demo.buyer@example.com', 'password123');

    const screensToScan = [
      { url: `${BASE_URL}/app`, name: 'Today (Home)' }
    ];

    for (const vp of VIEWPORTS) {
      await buyerPage.setViewportSize({ width: vp.width, height: vp.height });
      for (const sc of screensToScan) {
        await buyerPage.goto(sc.url, { waitUntil: 'domcontentloaded' });
        await buyerPage.waitForTimeout(800);
        const issues = await scanPageTextAndFonts(buyerPage, `${sc.name} @ ${vp.name}px`);
        if (issues.length === 0) {
          console.log(`[PASS] ${sc.name} @ ${vp.name}px (0 violations)`);
        } else {
          console.log(`[FAIL] ${sc.name} @ ${vp.name}px (${issues.length} violations):`);
          issues.slice(0, 5).forEach(i => console.log(`   ✕ [${i.type}] "${i.text}" (${i.detail})`));
          totalFailures += issues.length;
        }
      }
    }
    await buyerContext.close();

    // 2. Account B (Seller) Scan
    console.log('\n--- 2. Scanning Account B (Seller: demo.seller@example.com) ---');
    const sellerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();
    await login(sellerPage, 'demo.seller@example.com', 'password123');

    for (const vp of VIEWPORTS) {
      await sellerPage.setViewportSize({ width: vp.width, height: vp.height });
      for (const sc of screensToScan) {
        await sellerPage.goto(sc.url, { waitUntil: 'domcontentloaded' });
        await sellerPage.waitForTimeout(800);
        const issues = await scanPageTextAndFonts(sellerPage, `${sc.name} (Seller) @ ${vp.name}px`);
        if (issues.length === 0) {
          console.log(`[PASS] ${sc.name} (Seller) @ ${vp.name}px (0 violations)`);
        } else {
          console.log(`[FAIL] ${sc.name} (Seller) @ ${vp.name}px (${issues.length} violations):`);
          issues.slice(0, 5).forEach(i => console.log(`   ✕ [${i.type}] "${i.text}" (${i.detail})`));
          totalFailures += issues.length;
        }
      }
    }
    await sellerContext.close();

    // 3. Account C (New Empty Account) Scan
    console.log('\n--- 3. Scanning Account C (Empty Account: First-Time Today) ---');
    const emptyContext = await browser.newContext();
    const emptyPage = await emptyContext.newPage();
    const emptyEmail = `scanner.empty.${Date.now()}@example.com`;
    await emptyPage.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
    const inputs = await emptyPage.$$('input');
    if (inputs.length >= 3) {
      await inputs[0].fill('Sam First');
      await inputs[1].fill(emptyEmail);
      await inputs[2].fill('Password123!');
    }
    await emptyPage.click('button[type="submit"]');
    await emptyPage.waitForTimeout(1000);

    for (const vp of VIEWPORTS) {
      await emptyPage.setViewportSize({ width: vp.width, height: vp.height });
      await emptyPage.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
      await emptyPage.waitForTimeout(800);
      const issues = await scanPageTextAndFonts(emptyPage, `Today (Empty State) @ ${vp.name}px`);
      if (issues.length === 0) {
        console.log(`[PASS] Today (Empty State) @ ${vp.name}px (0 violations)`);
      } else {
        console.log(`[FAIL] Today (Empty State) @ ${vp.name}px (${issues.length} violations):`);
        issues.slice(0, 5).forEach(i => console.log(`   ✕ [${i.type}] "${i.text}" (${i.detail})`));
        totalFailures += issues.length;
      }
    }
    await emptyContext.close();

    console.log(`\n====================================================`);
    if (totalFailures === 0) {
      console.log('  SCAN RESULT: 100% CLEAN. ZERO RAW DATA VIOLATIONS.');
    } else {
      console.log(`  SCAN RESULT: FAILED WITH ${totalFailures} VIOLATIONS.`);
    }
    console.log(`====================================================\n`);

  } finally {
    await browser.close();
  }

  if (totalFailures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal scanner error:', err);
  process.exit(1);
});
