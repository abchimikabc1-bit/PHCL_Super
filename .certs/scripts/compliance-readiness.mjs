#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const root = process.cwd();
const errors = [];
const warnings = [];
const passes = [];

const versionPattern = /^\d{4}-\d{2}$/;

const requiredFiles = [
  'lib/policy-compliance.ts',
  'app/signup/page.tsx',
  'app/checkout/checkout-client.tsx',
  'app/terms-of-service/page.tsx',
  'app/privacy-policy/page.tsx',
  'app/admin/settings/page.tsx',
];

function readText(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required file: ${relPath}`);
    return '';
  }

  try {
    const text = fs.readFileSync(fullPath, 'utf8');
    passes.push(`Found ${relPath}`);
    return text;
  } catch (error) {
    errors.push(`Failed to read ${relPath}: ${error.message}`);
    return '';
  }
}

function extractVersionValue(text, key) {
  const matcher = new RegExp(`export const ${key} = '([0-9]{4}-[0-9]{2})'`);
  const match = text.match(matcher);
  return match ? match[1] : null;
}

function checkPolicyVersionRegistry() {
  const policyText = readText('lib/policy-compliance.ts');
  if (!policyText) {
    return;
  }

  const termsVersion = extractVersionValue(policyText, 'TERMS_POLICY_VERSION');
  const privacyVersion = extractVersionValue(policyText, 'PRIVACY_POLICY_VERSION');

  if (!termsVersion) {
    errors.push('TERMS_POLICY_VERSION constant is missing in policy-compliance registry.');
  } else if (!versionPattern.test(termsVersion)) {
    errors.push(`Invalid terms policy version format: ${termsVersion}`);
  } else {
    passes.push(`Terms policy version is valid (${termsVersion})`);
  }

  if (!privacyVersion) {
    errors.push('PRIVACY_POLICY_VERSION constant is missing in policy-compliance registry.');
  } else if (!versionPattern.test(privacyVersion)) {
    errors.push(`Invalid privacy policy version format: ${privacyVersion}`);
  } else {
    passes.push(`Privacy policy version is valid (${privacyVersion})`);
  }

  if (policyText.includes('createPolicyVersion') && policyText.includes('activatePolicyVersion')) {
    passes.push('Policy lifecycle handlers are available in registry utility');
  } else {
    errors.push('Policy lifecycle handlers are missing (createPolicyVersion / activatePolicyVersion).');
  }
}

function checkCentralizedUsage() {
  const signupText = readText('app/signup/page.tsx');
  const checkoutText = readText('app/checkout/checkout-client.tsx');
  const adminSettingsText = readText('app/admin/settings/page.tsx');

  if (signupText.includes("@/lib/policy-compliance") && signupText.includes('getPolicyVersions')) {
    passes.push('Signup reads policy versions from centralized registry');
  } else {
    errors.push('Signup is not wired to centralized policy registry.');
  }

  if (checkoutText.includes("@/lib/policy-compliance") && checkoutText.includes('getPolicyVersions')) {
    passes.push('Checkout reads policy versions from centralized registry');
  } else {
    errors.push('Checkout is not wired to centralized policy registry.');
  }

  if (adminSettingsText.includes('Policy Lifecycle Controls') && adminSettingsText.includes('Policy Registry')) {
    passes.push('Admin settings exposes policy lifecycle controls');
  } else {
    errors.push('Admin policy lifecycle controls are missing in admin settings UI.');
  }
}

function checkLegalPageSignals() {
  const termsText = readText('app/terms-of-service/page.tsx');
  const privacyText = readText('app/privacy-policy/page.tsx');

  if (termsText.includes('Effective') || termsText.includes('effective')) {
    passes.push('Terms page includes effective date signal');
  } else {
    warnings.push('Terms page does not include an obvious effective date signal.');
  }

  if (privacyText.includes('Effective') || privacyText.includes('effective')) {
    passes.push('Privacy page includes effective date signal');
  } else {
    warnings.push('Privacy page does not include an obvious effective date signal.');
  }
}

function printSection(title, lines) {
  if (lines.length === 0) {
    return;
  }

  console.log(`\n${title}`);
  for (const line of lines) {
    console.log(`- ${line}`);
  }
}

for (const relPath of requiredFiles) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required file: ${relPath}`);
  }
}

checkPolicyVersionRegistry();
checkCentralizedUsage();
checkLegalPageSignals();

console.log('\nPHCL Compliance Readiness Report');
console.log(`Workspace: ${root}`);
printSection('PASS', passes);
printSection('WARN', warnings);
printSection('FAIL', errors);

if (errors.length > 0) {
  console.log(`\nCompliance readiness: FAILED (${errors.length} blocker${errors.length === 1 ? '' : 's'})`);
  process.exit(1);
}

console.log(`\nCompliance readiness: PASSED${warnings.length > 0 ? ` with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`);
