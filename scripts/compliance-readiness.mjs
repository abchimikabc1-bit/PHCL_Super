#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const root =
  process.cwd();

const errors =
  [];

const warnings =
  [];

const passes =
  [];

const versionPattern =
  /^\d{4}-\d{2}$/;

const ADMIN_SETTINGS_PATH =
  'app/admin/(protected)/settings/page.tsx';

const requiredFiles = [
  'lib/policy-compliance.ts',
  'app/signup/page.tsx',
  'app/checkout/checkout-client.tsx',
  'app/terms-of-service/page.tsx',
  'app/privacy-policy/page.tsx',
  ADMIN_SETTINGS_PATH,
];

function readText(
  relativePath,
) {
  const fullPath =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(
      fullPath,
    )
  ) {
    /*
     * Missing-file errors are recorded during
     * the required-files preflight below.
     *
     * Do not add the same error here because
     * that would report one missing file twice.
     */
    return '';
  }

  try {
    const text =
      fs.readFileSync(
        fullPath,
        'utf8',
      );

    passes.push(
      `Found ${relativePath}`,
    );

    return text;
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
            error,
          );

    errors.push(
      `Failed to read ${relativePath}: ${message}`,
    );

    return '';
  }
}

function extractVersionValue(
  text,
  key,
) {
  const matcher =
    new RegExp(
      `export\\s+const\\s+${key}\\s*=\\s*['"]([0-9]{4}-[0-9]{2})['"]`,
    );

  const match =
    text.match(
      matcher,
    );

  return match
    ? match[1]
    : null;
}

function checkRequiredFiles() {
  for (
    const relativePath
    of requiredFiles
  ) {
    const fullPath =
      path.join(
        root,
        relativePath,
      );

    if (
      !fs.existsSync(
        fullPath,
      )
    ) {
      errors.push(
        `Missing required file: ${relativePath}`,
      );
    }
  }
}

function checkPolicyVersionRegistry() {
  const policyText =
    readText(
      'lib/policy-compliance.ts',
    );

  if (
    !policyText
  ) {
    return;
  }

  const termsVersion =
    extractVersionValue(
      policyText,
      'TERMS_POLICY_VERSION',
    );

  const privacyVersion =
    extractVersionValue(
      policyText,
      'PRIVACY_POLICY_VERSION',
    );

  if (
    !termsVersion
  ) {
    errors.push(
      'TERMS_POLICY_VERSION constant is missing in policy-compliance registry.',
    );
  } else if (
    !versionPattern.test(
      termsVersion,
    )
  ) {
    errors.push(
      `Invalid terms policy version format: ${termsVersion}`,
    );
  } else {
    passes.push(
      `Terms policy version is valid (${termsVersion})`,
    );
  }

  if (
    !privacyVersion
  ) {
    errors.push(
      'PRIVACY_POLICY_VERSION constant is missing in policy-compliance registry.',
    );
  } else if (
    !versionPattern.test(
      privacyVersion,
    )
  ) {
    errors.push(
      `Invalid privacy policy version format: ${privacyVersion}`,
    );
  } else {
    passes.push(
      `Privacy policy version is valid (${privacyVersion})`,
    );
  }

  if (
    policyText.includes(
      'createPolicyVersion',
    ) &&
    policyText.includes(
      'activatePolicyVersion',
    )
  ) {
    passes.push(
      'Policy lifecycle handlers are available in registry utility',
    );
  } else {
    errors.push(
      'Policy lifecycle handlers are missing (createPolicyVersion / activatePolicyVersion).',
    );
  }
}

function checkCentralizedUsage() {
  const signupText =
    readText(
      'app/signup/page.tsx',
    );

  const checkoutText =
    readText(
      'app/checkout/checkout-client.tsx',
    );

  /*
   * Admin Settings belongs inside the protected
   * Admin route group.
   *
   * The route group does not change the public URL:
   *
   * app/admin/(protected)/settings/page.tsx
   * still resolves to:
   * /admin/settings
   */
  const adminSettingsText =
    readText(
      ADMIN_SETTINGS_PATH,
    );

  if (
    signupText.includes(
      '@/lib/policy-compliance',
    ) &&
    signupText.includes(
      'getPolicyVersions',
    )
  ) {
    passes.push(
      'Signup reads policy versions from centralized registry',
    );
  } else {
    errors.push(
      'Signup is not wired to centralized policy registry.',
    );
  }

  if (
    checkoutText.includes(
      '@/lib/policy-compliance',
    ) &&
    checkoutText.includes(
      'getPolicyVersions',
    )
  ) {
    passes.push(
      'Checkout reads policy versions from centralized registry',
    );
  } else {
    errors.push(
      'Checkout is not wired to centralized policy registry.',
    );
  }

  if (
    adminSettingsText.includes(
      'Policy Lifecycle Controls',
    ) &&
    adminSettingsText.includes(
      'Policy Registry',
    )
  ) {
    passes.push(
      'Protected Admin settings exposes policy lifecycle controls',
    );
  } else {
    errors.push(
      'Admin policy lifecycle controls are missing in the protected Admin settings UI.',
    );
  }
}

function hasEffectiveDateSignal(
  text,
) {
  const normalized =
    text.toLowerCase();

  return (
    normalized.includes(
      'effective',
    ) ||
    normalized.includes(
      'effective date',
    ) ||
    normalized.includes(
      'tarehe ya kuanza',
    ) ||
    normalized.includes(
      'tarehe ya kuanza kutumika',
    ) ||
    normalized.includes(
      'last updated',
    ) ||
    normalized.includes(
      'updated at',
    )
  );
}

function checkLegalPageSignals() {
  const termsText =
    readText(
      'app/terms-of-service/page.tsx',
    );

  const privacyText =
    readText(
      'app/privacy-policy/page.tsx',
    );

  if (
    hasEffectiveDateSignal(
      termsText,
    )
  ) {
    passes.push(
      'Terms page includes effective date signal',
    );
  } else {
    warnings.push(
      'Terms page does not include an obvious effective date signal.',
    );
  }

  if (
    hasEffectiveDateSignal(
      privacyText,
    )
  ) {
    passes.push(
      'Privacy page includes effective date signal',
    );
  } else {
    warnings.push(
      'Privacy page does not include an obvious effective date signal.',
    );
  }
}

function printSection(
  title,
  lines,
) {
  if (
    lines.length ===
      0
  ) {
    return;
  }

  console.log(
    `\n${title}`,
  );

  for (
    const line
    of lines
  ) {
    console.log(
      `- ${line}`,
    );
  }
}

checkRequiredFiles();
checkPolicyVersionRegistry();
checkCentralizedUsage();
checkLegalPageSignals();

console.log(
  '\nPHCL Compliance Readiness Report',
);

console.log(
  `Workspace: ${root}`,
);

printSection(
  'PASS',
  passes,
);

printSection(
  'WARN',
  warnings,
);

printSection(
  'FAIL',
  errors,
);

if (
  errors.length >
    0
) {
  console.log(
    `\nCompliance readiness: FAILED (${errors.length} blocker${errors.length === 1 ? '' : 's'})`,
  );

  process.exit(
    1,
  );
}

console.log(
  `\nCompliance readiness: PASSED${warnings.length > 0 ? ` with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`,
);