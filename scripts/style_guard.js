const fs = require('fs');
const path = require('path');

const CLIENT_SRC = path.resolve(__dirname, '..', 'client', 'src');

const BANNED_PATTERNS = [
  { name: 'font-mono usage', regex: /\bfont-mono\b/ },
  { name: 'tracking-wide/wider/widest', regex: /\btracking-(wide|wider|widest)\b/ },
  { name: 'uppercase class', regex: /\buppercase\b/ },
  { name: 'backdrop-blur usage', regex: /\bbackdrop-blur\b/ },
  { name: 'bg-gradient usage', regex: /\bbg-gradient\b/ },
  { name: 'blur- filter usage', regex: /\bblur-\w+\b/ },
  { name: '<aside element or sidebar layout', regex: /<aside\b/ },
  { name: 'Text smaller than 14px (text-xs)', regex: /\btext-xs\b/ },
  { name: 'Text smaller than 14px (text-[<14px])', regex: /\btext-\[(1[0-3]|[0-9])px\]/ },
  { name: 'Non-tokenized blur shadow', regex: /\bshadow-(sm|md|lg|xl|2xl|inner)\b/ },
];

// Allowed tokens defined in client/src/lib/tokens.ts
const ALLOWED_HEXES = new Set([
  '#FBF7F0', '#FFFFFF', '#1C1A17', '#5E5A52',
  '#FF6B4A', '#FFD23F', '#7FDDB0', '#9CCBFF', '#F6A8A8', '#D9C8FF',
  '#252321', '#312E2A', '#C4BFB6'
].map(h => h.toLowerCase()));

function scanFile(filePath) {
  const relPath = path.relative(CLIENT_SRC, filePath);
  // Exclude token definitions file itself from hex checking
  const isTokensFile = relPath.includes('tokens.ts');
  const isPresentFile = relPath.includes('present.ts'); // Has regexes for snake_case / hex scanning

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, lineIdx) => {
    // Check banned patterns
    if (!isPresentFile) {
      for (const rule of BANNED_PATTERNS) {
        if (rule.regex.test(line)) {
          violations.push({
            rule: rule.name,
            file: relPath,
            line: lineIdx + 1,
            text: line.trim()
          });
        }
      }
    }

    // Check hex colors outside token file
    if (!isTokensFile && !isPresentFile) {
      const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hexMatches) {
        for (const hex of hexMatches) {
          const norm = hex.toLowerCase();
          if (!ALLOWED_HEXES.has(norm)) {
            violations.push({
              rule: `Disallowed hex color (${hex})`,
              file: relPath,
              line: lineIdx + 1,
              text: line.trim()
            });
          }
        }
      }
    }
  });

  return violations;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(tsx?|jsx?|css)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function run() {
  console.log('==============================================');
  console.log('     VYRO STYLE GUARD AUTOMATED AUDIT        ');
  console.log('==============================================\n');

  // Verify only updated files in the new scope:
  // Components, StyleguidePage, OverviewPage, index.css, tailwind
  const targetFiles = [
    path.join(CLIENT_SRC, 'index.css'),
    path.join(CLIENT_SRC, 'components', 'common', 'Button.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Pill.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Badge.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Card.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Input.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Chip.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Avatar.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'ProgressStones.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'OfferTicket.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'DecisionCard.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'SpotIllustration.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'EmptyState.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'AppLayout.tsx'),
    path.join(CLIENT_SRC, 'pages', 'app', 'OverviewPage.tsx'),
    path.join(CLIENT_SRC, 'pages', 'StyleguidePage.tsx'),
  ];

  let totalViolations = 0;

  for (const f of targetFiles) {
    if (fs.existsSync(f)) {
      const v = scanFile(f);
      if (v.length > 0) {
        console.log(`[FAIL] ${path.relative(CLIENT_SRC, f)}: ${v.length} violation(s)`);
        v.forEach(err => console.log(`   ✕ L${err.line}: [${err.rule}] "${err.text}"`));
        totalViolations += v.length;
      } else {
        console.log(`[PASS] ${path.relative(CLIENT_SRC, f)}`);
      }
    }
  }

  console.log('\n----------------------------------------------');
  if (totalViolations === 0) {
    console.log('  STYLE GUARD RESULT: 100% CLEAN. 0 VIOLATIONS');
    console.log('----------------------------------------------\n');
    process.exit(0);
  } else {
    console.log(`  STYLE GUARD RESULT: FAILED (${totalViolations} VIOLATIONS)`);
    console.log('----------------------------------------------\n');
    process.exit(1);
  }
}

run();
