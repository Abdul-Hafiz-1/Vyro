const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(__dirname, 'screenshots');

const ROUTES = [
  { name: 'overview', url: 'http://localhost:5173/app' },
  { name: 'procurement_new', url: 'http://localhost:5173/app/requests/new' },
  { name: 'listings', url: 'http://localhost:5173/app/listings' },
  { name: 'negotiations_list', url: 'http://localhost:5173/app/negotiations' },
  { name: 'negotiation_detail', url: 'http://localhost:5173/app/negotiations/neg_8e18535b' },
  { name: 'agents', url: 'http://localhost:5173/app/agents' },
  { name: 'memory', url: 'http://localhost:5173/app/memory' },
  { name: 'onboarding', url: 'http://localhost:5173/onboarding' },
  { name: 'landing', url: 'http://localhost:5173/' }
];

async function captureAll() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const r of ROUTES) {
    try {
      console.log(`Capturing ${r.name}...`);
      await page.goto(r.url, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(res => setTimeout(res, 800));
      const file = path.join(OUTPUT_DIR, `${r.name}_1440.png`);
      await page.screenshot({ path: file, fullPage: true });
    } catch (e) {
      console.error(`Failed ${r.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('Finished capturing all routes');
}

captureAll();
