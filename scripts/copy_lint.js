const fs = require('fs');
const path = require('path');

const CLIENT_SRC = path.resolve(__dirname, '..', 'client', 'src');

const BANNED_WORDS = [
  'seamless', 'leverage', 'unlock', 'elevate', 'empower',
  'supercharge', 'streamline', 'effortless', 'harness',
  'revolutionary', 'cutting-edge', 'next-generation', 'game-changing',
  'ai-powered', 'all-in-one', "in today's", 'delve', 'journey', 'solution'
];

const BANNED_PATTERNS = [
  { name: 'Em dash (—)', regex: /—/ },
  { name: 'Double exclamation mark (!!)', regex: /!!/ },
  { name: 'Generic "Something went wrong"', regex: /something\s+went\s+wrong/i },
  { name: 'Lorem ipsum placeholder', regex: /\blorem\b/i },
  { name: 'Banned demo name "John Doe"', regex: /\bjohn\s+doe\b/i },
  { name: 'Banned demo name "Alex Mercer"', regex: /\balex\s+mercer\b/i },
  { name: 'Banned demo name "Test Store"', regex: /\btest\s+store\b/i },
  { name: 'Emoji in UI string', regex: /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];
  const relPath = path.relative(CLIENT_SRC, filePath);

  lines.forEach((line, idx) => {
    // Skip import lines, comments, and regex definitions
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ')) {
      return;
    }

    const lower = line.toLowerCase();
    for (const word of BANNED_WORDS) {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      if (wordRegex.test(line)) {
        violations.push({
          rule: `Banned buzzword: "${word}"`,
          file: relPath,
          line: idx + 1,
          text: trimmed
        });
      }
    }

    for (const pat of BANNED_PATTERNS) {
      if (pat.regex.test(line)) {
        violations.push({
          rule: pat.name,
          file: relPath,
          line: idx + 1,
          text: trimmed
        });
      }
    }
  });

  return violations;
}

function run() {
  console.log('==============================================');
  console.log('       VYRO COPY & EDITORIAL LINTER          ');
  console.log('==============================================\n');

  const targetFiles = [
    path.join(CLIENT_SRC, 'components', 'common', 'DecisionCard.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'DealNode.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'SummaryPanel.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'EmptyState.tsx'),
    path.join(CLIENT_SRC, 'components', 'common', 'CommandPalette.tsx'),
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
    console.log('  COPY LINT RESULT: 100% CLEAN. 0 VIOLATIONS');
    console.log('----------------------------------------------\n');
    process.exit(0);
  } else {
    console.log(`  COPY LINT RESULT: FAILED (${totalViolations} VIOLATIONS)`);
    console.log('----------------------------------------------\n');
    process.exit(1);
  }
}

run();
