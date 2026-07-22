#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const root = process.cwd();
const errors = [];
const warnings = [];
const passes = [];
const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_NAME',
];
const REQUIRED_ADMIN_AUTH_ENV_KEYS = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Failed to parse ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
}

function checkFile(filePath, label) {
  const fullPath = path.join(root, filePath);
  if (fs.existsSync(fullPath)) {
    passes.push(`${label} found (${filePath})`);
    return true;
  }
  errors.push(`${label} missing (${filePath})`);
  return false;
}

function resolveNextConfigFile() {
  const candidates = ['next.config.js', 'next.config.mjs', 'next.config.cjs'];
  for (const candidate of candidates) {
    const fullPath = path.join(root, candidate);
    if (fs.existsSync(fullPath)) {
      passes.push(`Next.js configuration found (${candidate})`);
      return { fileName: candidate, fullPath };
    }
  }

  errors.push('Next.js configuration missing (expected next.config.js, next.config.mjs, or next.config.cjs)');
  return null;
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) {
    passes.push(`Node.js version is compatible (${process.versions.node})`);
    return;
  }
  errors.push(`Node.js 18+ required, current version is ${process.versions.node}`);
}

function checkPackageScripts(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    errors.push('package.json is invalid');
    return;
  }

  const scripts = pkg.scripts || {};
  const requiredScripts = ['build', 'start'];

  for (const scriptName of requiredScripts) {
    if (typeof scripts[scriptName] === 'string' && scripts[scriptName].trim()) {
      passes.push(`npm script available: ${scriptName}`);
    } else {
      errors.push(`npm script missing: ${scriptName}`);
    }
  }

  if (typeof scripts.dev === 'string' && scripts.dev.includes('next dev')) {
    passes.push('Development script is configured');
  } else {
    warnings.push('Development script is missing or non-standard');
  }
}

function checkSecurityHeaders(nextConfigPath, nextConfigFileName = 'next.config.js') {
  try {
    const configText = fs.readFileSync(nextConfigPath, 'utf8');
    const requiredHeaderKeys = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    const missing = requiredHeaderKeys.filter((key) => !configText.includes(key));
    if (missing.length === 0) {
      passes.push(`Core security headers are configured in ${nextConfigFileName}`);
    } else {
      warnings.push(`Some security headers were not found: ${missing.join(', ')}`);
    }
  } catch (error) {
    errors.push(`Unable to read ${nextConfigFileName}: ${error.message}`);
  }
}

function checkEnvironmentTemplate() {
  const envExamplePath = path.join(root, '.env.example');
  const envLocalPath = path.join(root, '.env.local');

  if (!fs.existsSync(envExamplePath)) {
    warnings.push('.env.example is missing; onboarding may be slower for deployment setup');
  } else {
    passes.push('Environment template available (.env.example)');
  }

  if (!fs.existsSync(envLocalPath)) {
    warnings.push('.env.local not found in workspace (strict env check will rely on runtime environment variables)');
  } else {
    passes.push('Local environment file detected (.env.local)');
  }
}

function parseEnvFile(filePath) {
  const parsed = {};
  if (!fs.existsSync(filePath)) {
    return parsed;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');
    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function getMergedEnvironmentValues() {
  const envLocal = parseEnvFile(path.join(root, '.env.local'));
  const envProduction = parseEnvFile(path.join(root, '.env.production'));
  return {
    ...envProduction,
    ...envLocal,
    ...process.env,
  };
}

function checkRequiredEnvironmentValues() {
  const envSources = getMergedEnvironmentValues();

  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = envSources[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    errors.push(`Missing required environment keys: ${missingKeys.join(', ')}`);
    return;
  }

  passes.push(`Required environment keys are present: ${REQUIRED_ENV_KEYS.join(', ')}`);
}

function checkAdminAuthEnvironmentValues() {
  const envSources = getMergedEnvironmentValues();
  const missingAdminKeys = REQUIRED_ADMIN_AUTH_ENV_KEYS.filter((key) => {
    const value = envSources[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingAdminKeys.length > 0) {
    warnings.push(
      `Admin auth environment keys are not fully configured for production: ${missingAdminKeys.join(', ')}`
    );
  } else {
    passes.push(`Admin auth environment keys are present: ${REQUIRED_ADMIN_AUTH_ENV_KEYS.join(', ')}`);
  }

  const siteUrl = envSources.NEXT_PUBLIC_SITE_URL;
  if (typeof siteUrl === 'string' && siteUrl.trim().length > 0) {
    if (!siteUrl.startsWith('https://www.phclsuper.com')) {
      warnings.push(
        `NEXT_PUBLIC_SITE_URL is not set to canonical www host (current: ${siteUrl})`
      );
    }
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

checkNodeVersion();
checkFile('package.json', 'Project manifest');
const nextConfig = resolveNextConfigFile();
checkFile('app/layout.tsx', 'Root layout');
checkFile('app/page.tsx', 'Home page');

const packageJson = readJson(path.join(root, 'package.json'));
checkPackageScripts(packageJson);
if (nextConfig) {
  checkSecurityHeaders(nextConfig.fullPath, nextConfig.fileName);
}
checkEnvironmentTemplate();
checkRequiredEnvironmentValues();
checkAdminAuthEnvironmentValues();

console.log('\nPHCL Release Readiness Report');
console.log(`Workspace: ${root}`);
printSection('PASS', passes);
printSection('WARN', warnings);
printSection('FAIL', errors);

if (errors.length > 0) {
  console.log(`\nRelease readiness: FAILED (${errors.length} blocker${errors.length === 1 ? '' : 's'})`);
  process.exit(1);
}

console.log(`\nRelease readiness: PASSED${warnings.length > 0 ? ` with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`);
