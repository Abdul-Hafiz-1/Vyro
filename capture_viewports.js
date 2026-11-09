const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(__dirname, 'screenshots_pass3');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORT_TESTS = [
  // 1440 x 900 (Desktop Large)
  { route: 'http://localhost:5173/app', name: 'overview_1440', width: 1440, height: 900 },
  { route: 'http://localhost:5173/app/requests/new', name: 'procurement_1440', width: 1440, height: 900 },
  { route: 'http://localhost:5173/app/listings', name: 'listings_1440', width: 1440, height: 900 },
  { route: 'http://localhost:5173/app/negotiations/neg_8e18535b', name: 'negotiation_1440', width: 1440, height: 900 },
  { route: 'http://localhost:5173/app/agents', name: 'agents_1440', width: 1440, height: 900 },
  { route: 'http://localhost:5173/onboarding', name: 'onboarding_1440', width: 1440, height: 900 },

  // 1366 x 768 (Standard Laptop)
  { route: 'http://localhost:5173/app/listings', name: 'listings_1366', width: 1366, height: 768 },

  // 1280 x 800 (Compact Laptop)
  { route: 'http://localhost:5173/app/requests/new', name: 'procurement_1280', width: 1280, height: 800 },

  // 1024 x 768 (Tablet Landscape)
  { route: 'http://localhost:5173/app', name: 'overview_1024', width: 1024, height: 768 },
  { route: 'http://localhost:5173/app/negotiations/neg_8e18535b', name: 'negotiation_1024', width: 1024, height: 768 },

  // 390 x 844 (Mobile Phone - iPhone 12/13/14)
  { route: 'http://localhost:5173/app', name: 'overview_390_mobile', width: 390, height: 844 },
  { route: 'http://localhost:5173/app/requests/new', name: 'procurement_390_mobile', width: 390, height: 844 },
  { route: 'http://localhost:5173/app/negotiations/neg_8e18535b', name: 'negotiation_390_mobile', width: 390, height: 844 },
  { route: 'http://localhost:5173/onboarding', name: 'onboarding_390_mobile', width: 390, height: 844 }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const test of VIEWPORT_TESTS) {
    try {
      console.log(`Testing ${test.name} at ${test.width}x${test.height}...`);
      await page.setViewport({ width: test.width, height: test.height });
      await page.goto(test.route, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const screenshotFile = path.join(OUTPUT_DIR, `${test.name}.png`);
      await page.screenshot({ path: screenshotFile, fullPage: true });
      console.log(`Saved: ${test.name}.png`);
    } catch (err) {
      console.error(`Failed on ${test.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('Viewport test suite complete!');
}

run();
