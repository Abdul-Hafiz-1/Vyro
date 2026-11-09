const { chromium } = require('playwright');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('==============================================');
  console.log('       VYRO SAMENESS & RHYTHM GUARD           ');
  console.log('==============================================\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  const page = await browser.newPage();
  let failures = 0;

  try {
    // Check Today page layout
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'demo.buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const check = await page.evaluate(() => {
      const issues = [];

      // 1. Grid Sameness Check: Look for grids with > 6 identical cards without variation
      const grids = document.querySelectorAll('.grid');
      grids.forEach((grid) => {
        const children = Array.from(grid.children);
        if (children.length > 6) {
          const heights = children.map(c => c.getBoundingClientRect().height);
          const allIdentical = heights.every(h => Math.abs(h - heights[0]) < 2);
          if (allIdentical) {
            issues.push(`Found grid with ${children.length} identical card heights (${heights[0]}px) without featured variation.`);
          }
        }
      });

      // 2. Section Rhythm Check: Check if more than 3 sections share identical padding & background
      const sections = Array.from(document.querySelectorAll('section'));
      if (sections.length >= 3) {
        let consecutiveIdentical = 1;
        for (let i = 1; i < sections.length; i++) {
          const prev = window.getComputedStyle(sections[i - 1]);
          const curr = window.getComputedStyle(sections[i]);
          if (prev.backgroundColor === curr.backgroundColor && prev.padding === curr.padding) {
            consecutiveIdentical++;
          } else {
            consecutiveIdentical = 1;
          }
          if (consecutiveIdentical > 3) {
            issues.push(`Found >3 consecutive sections with identical background (${curr.backgroundColor}) and padding.`);
          }
        }
      }

      return issues;
    });

    if (check.length === 0) {
      console.log('[PASS] Today screen satisfies asymmetry, featured card hierarchy, and section rhythm.');
    } else {
      check.forEach(issue => {
        console.log(`[FAIL] ${issue}`);
        failures++;
      });
    }

  } catch (err) {
    console.error('Error running sameness check:', err);
    failures++;
  } finally {
    await browser.close();
  }

  console.log('\n----------------------------------------------');
  if (failures === 0) {
    console.log('  SAMENESS CHECK: 100% CLEAN. 0 VIOLATIONS');
    console.log('----------------------------------------------\n');
    process.exit(0);
  } else {
    console.log(`  SAMENESS CHECK: FAILED (${failures} VIOLATIONS)`);
    console.log('----------------------------------------------\n');
    process.exit(1);
  }
}

run();
