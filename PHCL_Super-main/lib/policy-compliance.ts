export const TERMS_POLICY_VERSION = '2026-07';
export const PRIVACY_POLICY_VERSION = '2026-07';

export type PolicyKind = 'terms' | 'privacy';
export type PolicyStatus = 'active' | 'history';

export type PolicyVersions = {
  termsVersion: string;
  privacyVersion: string;
};

export type PolicyRegistryEntry = {
  id: string;
  policy: PolicyKind;
  version: string;
  label: string;
  status: PolicyStatus;
  effectiveDate: string;
  createdAt: string;
  activatedAt: string;
};

const POLICY_REGISTRY_KEY = 'phcl_policy_registry_v1';

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const versionPattern = /^\d{4}-\d{2}$/;

const isValidDateInput = (value: string): boolean => {
  const stamp = Date.parse(value);
  return Number.isFinite(stamp);
};

export const isValidPolicyVersion = (value: string): boolean => versionPattern.test(value.trim());

const defaultRegistry = (): PolicyRegistryEntry[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'terms-2026-07',
      policy: 'terms',
      version: TERMS_POLICY_VERSION,
      label: 'Terms of Service',
      status: 'active',
      effectiveDate: '2026-07-01',
      createdAt: now,
      activatedAt: now,
    },
    {
      id: 'privacy-2026-07',
      policy: 'privacy',
      version: PRIVACY_POLICY_VERSION,
      label: 'Privacy Policy',
      status: 'active',
      effectiveDate: '2026-07-01',
      createdAt: now,
      activatedAt: now,
    },
  ];
};

const normalizeEntry = (entry: unknown): PolicyRegistryEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const row = entry as Partial<PolicyRegistryEntry>;
  if (row.policy !== 'terms' && row.policy !== 'privacy') {
    return null;
  }

  if (!row.version || !isValidPolicyVersion(row.version)) {
    return null;
  }

  if (row.status !== 'active' && row.status !== 'history') {
    return null;
  }

  if (typeof row.id !== 'string' || row.id.length < 3) {
    return null;
  }

  if (typeof row.label !== 'string' || row.label.trim().length < 3) {
    return null;
  }

  if (typeof row.effectiveDate !== 'string' || !isValidDateInput(row.effectiveDate)) {
    return null;
  }

  if (typeof row.createdAt !== 'string' || !isValidDateInput(row.createdAt)) {
    return null;
  }

  if (typeof row.activatedAt !== 'string' || !isValidDateInput(row.activatedAt)) {
    return null;
  }

  return {
    id: row.id,
    policy: row.policy,
    version: row.version,
    label: row.label,
    status: row.status,
    effectiveDate: row.effectiveDate,
    createdAt: row.createdAt,
    activatedAt: row.activatedAt,
  };
};

const ensureSingleActivePerPolicy = (entries: PolicyRegistryEntry[]): PolicyRegistryEntry[] => {
  const termsActive = entries.filter((entry) => entry.policy === 'terms' && entry.status === 'active');
  const privacyActive = entries.filter((entry) => entry.policy === 'privacy' && entry.status === 'active');

  let normalized = [...entries];

  if (termsActive.length === 0) {
    normalized.push(defaultRegistry()[0]);
  }
  if (privacyActive.length === 0) {
    normalized.push(defaultRegistry()[1]);
  }

  const enforceLatestActive = (policy: PolicyKind) => {
    const active = normalized
      .filter((entry) => entry.policy === policy && entry.status === 'active')
      .sort((a, b) => Date.parse(b.activatedAt) - Date.parse(a.activatedAt));

    if (active.length <= 1) {
      return;
    }

    const winnerId = active[0].id;
    normalized = normalized.map((entry) => {
      if (entry.policy !== policy) {
        return entry;
      }
      if (entry.id === winnerId) {
        return { ...entry, status: 'active' };
      }
      return entry.status === 'active' ? { ...entry, status: 'history' } : entry;
    });
  };

  enforceLatestActive('terms');
  enforceLatestActive('privacy');

  return normalized;
};

const sortRegistry = (entries: PolicyRegistryEntry[]): PolicyRegistryEntry[] => {
  return [...entries].sort((a, b) => Date.parse(b.activatedAt) - Date.parse(a.activatedAt));
};

const readRegistry = (): PolicyRegistryEntry[] => {
  if (!canUseStorage()) {
    return defaultRegistry();
  }

  try {
    const raw = window.localStorage.getItem(POLICY_REGISTRY_KEY);
    if (!raw) {
      const defaults = defaultRegistry();
      window.localStorage.setItem(POLICY_REGISTRY_KEY, JSON.stringify(defaults));
      return defaults;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultRegistry();
    }

    const normalized = parsed
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is PolicyRegistryEntry => Boolean(entry));

    const valid = ensureSingleActivePerPolicy(normalized);
    window.localStorage.setItem(POLICY_REGISTRY_KEY, JSON.stringify(valid));
    return sortRegistry(valid);
  } catch {
    return defaultRegistry();
  }
};

const writeRegistry = (entries: PolicyRegistryEntry[]): PolicyRegistryEntry[] => {
  const normalized = sortRegistry(ensureSingleActivePerPolicy(entries));

  if (canUseStorage()) {
    window.localStorage.setItem(POLICY_REGISTRY_KEY, JSON.stringify(normalized));
  }

  return normalized;
};

export const getPolicyRegistry = (): PolicyRegistryEntry[] => {
  return readRegistry();
};

export const createPolicyVersion = (input: {
  policy: PolicyKind;
  version: string;
  label: string;
  effectiveDate: string;
}): { ok: boolean; message: string; entry?: PolicyRegistryEntry } => {
  const policy = input.policy;
  const version = input.version.trim();
  const label = input.label.trim();
  const effectiveDate = input.effectiveDate.trim();

  if (!isValidPolicyVersion(version)) {
    return { ok: false, message: 'Version must follow YYYY-MM format.' };
  }
  if (label.length < 3) {
    return { ok: false, message: 'Label must be at least 3 characters.' };
  }
  if (!isValidDateInput(effectiveDate)) {
    return { ok: false, message: 'Effective date is invalid.' };
  }

  const current = readRegistry();
  const duplicate = current.find((entry) => entry.policy === policy && entry.version === version);
  if (duplicate) {
    return { ok: false, message: `${policy} version ${version} already exists.` };
  }

  const now = new Date().toISOString();
  const entry: PolicyRegistryEntry = {
    id: `${policy}-${version}-${Date.now()}`,
    policy,
    version,
    label,
    status: 'history',
    effectiveDate,
    createdAt: now,
    activatedAt: now,
  };

  writeRegistry([entry, ...current]);
  return { ok: true, message: 'Policy version added to history.', entry };
};

export const activatePolicyVersion = (entryId: string): { ok: boolean; message: string } => {
  const current = readRegistry();
  const target = current.find((entry) => entry.id === entryId);
  if (!target) {
    return { ok: false, message: 'Policy entry was not found.' };
  }

  const activatedAt = new Date().toISOString();
  const next: PolicyRegistryEntry[] = current.map((entry): PolicyRegistryEntry => {
    if (entry.policy !== target.policy) {
      return entry;
    }

    if (entry.id === target.id) {
      return {
        ...entry,
        status: 'active' as const,
        activatedAt,
      };
    }

    if (entry.status === 'active') {
      return {
        ...entry,
        status: 'history' as const,
      };
    }

    return entry;
  });

  writeRegistry(next);
  return { ok: true, message: `${target.label} v${target.version} is now active.` };
};

export const getPolicyVersions = (): PolicyVersions => ({
  termsVersion:
    readRegistry().find((entry) => entry.policy === 'terms' && entry.status === 'active')?.version || TERMS_POLICY_VERSION,
  privacyVersion:
    readRegistry().find((entry) => entry.policy === 'privacy' && entry.status === 'active')?.version || PRIVACY_POLICY_VERSION,
});