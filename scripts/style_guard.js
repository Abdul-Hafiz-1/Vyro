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
  { name: 'Cobalt/indigo/violet/purple hues', regex: /\b(cobalt|indigo|violet|purple)-\d+\b/ },
  { name: 'Text smaller than 14px (text-xs)', regex: /\btext-xs\b/ },
  { name: 'Text smaller than 14px (text-[<14px])', regex: /\btext-\[(1[0-3]|[0-9])px\]/ },
  { name: 'Non-tokenized blur shadow', regex: /\bshadow-(md|lg|xl|2xl|inner)\b/ },
];

const ALLOWED_HEXES = new Set([
  // Dark
  '#0C0E0D', '#141715', '#1A1E1B', '#262B28', '#F2F4F0', '#A0A7A1',
  '#D4FF3A', '#34D399', '#FFB020', '#FF6B6B', '#8FA3B8',
  // Light
  '#FAFAF7', '#FFFFFF', '#F3F3EE', '#E2E3DC', '#0E1210', '#58605A',
  '#C6F51F', '#0F9D6B', '#B45F06', '#C0392B', '#4A5D70'
].map(h => h.toLowerCase()));

function scanFile(filePath) {
  const relPath = path.relative(CLIENT_SRC, filePath);
  const isTokensFile = relPath.includes('tokens.ts');
  const isPresentFile = relPath.includes('present.ts');

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, lineIdx) => {
    // Check banned class patterns
    if (!isPresentFile) {
      for (const rule of BANNED_PATTERNS) {
        if (rule.regex.test(line)) {
          // Allow kbd or explicit secondary tags if not forbidden
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

function run() {
  console.log('==============================================');
  console.log('     VYRO STYLE GUARD AUTOMATED AUDIT        ');
  console.log('==============================================\n');

  const targetFiles = [
    path.join(CLIENT_SRC, 'index.css'),
    path.join(CLIENT_SRC, 'components', 'common', 'Button.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'StatusChip.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Badge.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Pill.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Card.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Input.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Chip.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'ModeSwitch.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Avatar.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'DecisionCard.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'DealNode.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'SummaryPanel.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Drawer.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'EmptyState.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'CommandPalette.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'Skeleton.tsx'),
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
