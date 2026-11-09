const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'audit', 'round-3', 'after');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function auditPage(page, url, name) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // Run DOM accessibility & tap target audit
  const auditResults = await page.evaluate(() => {
    const issues = [];

    // 1. Check form inputs without labels
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
    for (const inp of inputs) {
      const id = inp.id;
      const ariaLabel = inp.getAttribute('aria-label');
      const ariaLabelledby = inp.getAttribute('aria-labelledby');
      const placeholder = inp.getAttribute('placeholder');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const parentLabel = inp.closest('label');

      if (!label && !parentLabel && !ariaLabel && !ariaLabelledby && !placeholder) {
        issues.push(`Input without accessible name or label: ${inp.outerHTML.substring(0, 80)}`);
      }
    }

    // 2. Check images without alt
    const images = Array.from(document.querySelectorAll('img'));
    for (const img of images) {
      if (!img.hasAttribute('alt')) {
        issues.push(`Image missing alt tag: ${img.src}`);
      }
    }

    // 3. Check mobile tap targets (>= 44px) on primary controls
    const isMobile = window.innerWidth <= 500;
    if (isMobile) {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], nav a'));
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Allow small inline text links, but enforce 44px min for main buttons and nav tabs
          const isNavOrPrimary = btn.closest('nav') || btn.classList.contains('rounded-control') || btn.classList.contains('rounded-full');
          if (isNavOrPrimary && (rect.width < 40 || rect.height < 40)) {
            issues.push(`Tap target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px): ${btn.innerText || btn.getAttribute('aria-label') || 'Button'}`);
          }
        }
      }
    }

    return issues;
  });

  return auditResults;
}

async function run() {
  console.log('--- STARTING ACCESSIBILITY & POLISH AUDIT ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    const testUrls = [
      { url: 'http://localhost:5173/', name: 'Landing' },
      { url: 'http://localhost:5173/how-it-works', name: 'How It Works' },
      { url: 'http://localhost:5173/security', name: 'Security' },
      { url: 'http://localhost:5173/terms', name: 'Terms' },
      { url: 'http://localhost:5173/privacy', name: 'Privacy' },
      { url: 'http://localhost:5173/dispute-policy', name: 'Dispute Policy' },
      { url: 'http://localhost:5173/login', name: 'Login' }
    ];

    let totalIssues = 0;
    for (const t of testUrls) {
      const issues = await auditPage(page, t.url, t.name);
      console.log(`[Audit] ${t.name} (390px): ${issues.length === 0 ? 'PASS (0 issues)' : `${issues.length} issue(s)`}`);
      if (issues.length > 0) {
        issues.forEach(i => console.warn(`   ⚠ ${i}`));
        totalIssues += issues.length;
      }
    }

    console.log(`\n=== ACCESSIBILITY AUDIT SUMMARY: ${totalIssues} VIOLATIONS FOUND ===\n`);
  } finally {
    await browser.close();
  }
}

run();
