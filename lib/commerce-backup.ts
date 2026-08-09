import type { CommerceStatePayload } from '@/lib/commerce-sync';

export const COMMERCE_BACKUP_VERSION = 2;

export interface CommerceBackupDocument {
  version: number;
  exportedAt: string;
  checksum: string;
  snapshot: CommerceStatePayload;
}

const computeHashHex = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const computeCommerceBackupChecksum = (snapshot: CommerceStatePayload, version = COMMERCE_BACKUP_VERSION): string => {
  return computeHashHex(JSON.stringify({ version, snapshot }));
};

export const createCommerceBackupDocument = (snapshot: CommerceStatePayload): CommerceBackupDocument => ({
  version: COMMERCE_BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  checksum: computeCommerceBackupChecksum(snapshot, COMMERCE_BACKUP_VERSION),
  snapshot,
});

export const validateCommerceBackupDocument = (payload: unknown): CommerceBackupDocument | null => {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Partial<CommerceBackupDocument>;
  if (typeof row.version !== 'number' || !row.snapshot || typeof row.exportedAt !== 'string' || typeof row.checksum !== 'string') {
    return null;
  }

  const expected = computeCommerceBackupChecksum(row.snapshot, row.version);
  if (expected !== row.checksum) return null;

  return {
    version: row.version,
    exportedAt: row.exportedAt,
    checksum: row.checksum,
    snapshot: row.snapshot,
  };
};