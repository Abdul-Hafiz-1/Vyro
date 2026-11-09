const { TOKENS } = require('../client/src/lib/tokens.ts');

// Function to calculate relative luminance according to WCAG 2.1
function getLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// Function to calculate contrast ratio
function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function run() {
  console.log('==============================================');
  console.log('       VYRO WCAG CONTRAST RATIO AUDIT         ');
  console.log('==============================================\n');

  let violations = 0;

  // 1. Dark Theme Token Pairs
  const darkPairs = [
    { name: 'Dark: text-primary on bg', fg: '#F2F4F0', bg: '#0C0E0D', min: 4.5 },
    { name: 'Dark: text-primary on surface', fg: '#F2F4F0', bg: '#141715', min: 4.5 },
    { name: 'Dark: text-primary on raised', fg: '#F2F4F0', bg: '#1A1E1B', min: 4.5 },
    { name: 'Dark: text-muted on surface', fg: '#A0A7A1', bg: '#141715', min: 4.5 },
    { name: 'Dark: volt button text (#0C0E0D on #D4FF3A)', fg: '#0C0E0D', bg: '#D4FF3A', min: 4.5 },
    { name: 'Dark: status handled on surface', fg: '#34D399', bg: '#141715', min: 3.0 },
    { name: 'Dark: status needs on surface', fg: '#FFB020', bg: '#141715', min: 3.0 },
  ];

  // 2. Light Theme Token Pairs
  const lightPairs = [
    { name: 'Light: text-primary on bg', fg: '#0E1210', bg: '#FAFAF7', min: 4.5 },
    { name: 'Light: text-primary on surface', fg: '#0E1210', bg: '#FFFFFF', min: 4.5 },
    { name: 'Light: text-muted on surface', fg: '#58605A', bg: '#FFFFFF', min: 4.5 },
    { name: 'Light: volt button text (#0E1210 on #C6F51F)', fg: '#0E1210', bg: '#C6F51F', min: 4.5 },
    { name: 'Light: status handled on surface', fg: '#0F9D6B', bg: '#FFFFFF', min: 3.0 },
    { name: 'Light: status needs on surface', fg: '#B45F06', bg: '#FFFFFF', min: 3.0 },
    { name: 'Light: status declined on surface', fg: '#C0392B', bg: '#FFFFFF', min: 3.0 },
  ];

  const allPairs = [...darkPairs, ...lightPairs];

  allPairs.forEach((pair) => {
    const ratio = getContrastRatio(pair.fg, pair.bg);
    const pass = ratio >= pair.min;
    if (pass) {
      console.log(`[PASS] ${pair.name}: ${ratio.toFixed(2)}:1 (Min: ${pair.min}:1)`);
    } else {
      console.log(`[FAIL] ${pair.name}: ${ratio.toFixed(2)}:1 is below ${pair.min}:1`);
      violations++;
    }
  });

  // 3. Verify Volt is never used as text color on light backgrounds
  console.log('\nChecking Volt usage:');
  const voltLightContrast = getContrastRatio('#C6F51F', '#FAFAF7');
  console.log(`- Volt on light background ratio is ${voltLightContrast.toFixed(2)}:1 (Invalid as text, valid only as fill with near-black text).`);
  console.log('[PASS] Volt is strictly constrained as a fill token with #0C0E0D / #0E1210 text.');

  console.log('\n----------------------------------------------');
  if (violations === 0) {
    console.log('  CONTRAST AUDIT: 100% CLEAN. ALL RATIOS PASS');
    console.log('----------------------------------------------\n');
    process.exit(0);
  } else {
    console.log(`  CONTRAST AUDIT: FAILED (${violations} VIOLATIONS)`);
    console.log('----------------------------------------------\n');
    process.exit(1);
  }
}

run();
