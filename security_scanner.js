/**
 * Automated Repository Security Scanner
 * Scans the codebase for hardcoded secrets, unsafe functions, CORS wildcards, and un-sanitized patterns.
 */

const fs = require('fs');
const path = require('path');

// Patterns formatted to avoid false positives during self-inspection
const VULNERABILITY_PATTERNS = [
  {
    name: 'Hardcoded API Key / Secret Token',
    regex: /(?:api_key|secret|password|private_key)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    severity: 'CRITICAL',
    recommendation: 'Hamisha siri hii kwenda kwenye faili la .env na uitumie kupitia process.env',
  },
  {
    name: 'Dangerous Dynamic Code Execution',
    regex: /\b(eval|Function)\s*\(/,
    severity: 'CRITICAL',
    recommendation: 'Ondoa matumizi ya dynamic code execution ili kuzuia Remote Code Execution (RCE)',
  },
  {
    name: 'Unsafe DOM Injection (innerHTML)',
    regex: /\.innerHTML\s*=/,
    severity: 'HIGH',
    recommendation: 'Tumia textContent au DOMPurify ili kuzuia Cross-Site Scripting (XSS)',
  },
  {
    name: 'Wildcard CORS Origin (*)',
    regex: /origin\s*:\s*["']\*["']/,
    severity: 'HIGH',
    recommendation: 'Weka domain maalum kwenye CORS badala ya kuruhusu kila mtu wildcard',
  },
  {
    name: 'Insecure HTTP Transport (Non-HTTPS)',
    regex: /http:\/\/(?!localhost|127\.0\.0\.1)/,
    severity: 'MEDIUM',
    recommendation: 'Tumia HTTPS pekee kulinda mawasiliano dhidi ya Man-in-the-Middle (MitM)',
  },
];

function scanDirectory(dirPath, findings = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'coverage' || file === '.next' || file === '.firebase' || file === 'dist' || file === 'build') continue;

    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, findings);
    } else if (/\.(js|json|sql|rules|html)$/.test(file) && file !== 'security_scanner.js') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        VULNERABILITY_PATTERNS.forEach((pattern) => {
          if (pattern.regex.test(line)) {
            findings.push({
              file: path.relative(dirPath, fullPath),
              line: idx + 1,
              issue: pattern.name,
              severity: pattern.severity,
              recommendation: pattern.recommendation,
              snippet: line.trim(),
            });
          }
        });
      });
    }
  }
  return findings;
}

function runAudit() {
  console.log('🔍 INAANZA SCAN YA KIUSALAMA KWENYE CODEBASE...\n');
  const targetDir = path.resolve(__dirname);
  const results = scanDirectory(targetDir);

  if (results.length === 0) {
    console.log('✅ HAKUNA MAPUNGUFU YA KIUSALAMA YALIYOPATIKANA! CODEBASE IPO SALAMA 100%.');
  } else {
    console.log(`⚠️ MAPUNGUFU ${results.length} YALIPATIKANA:\n`);
    results.forEach((item, index) => {
      console.log(`[${index + 1}] [${item.severity}] ${item.issue}`);
      console.log(`    Faili: ${item.file}:${item.line}`);
      console.log(`    Snippet: "${item.snippet}"`);
      console.log(`    Ushauri: ${item.recommendation}\n`);
    });
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = { scanDirectory, runAudit };
