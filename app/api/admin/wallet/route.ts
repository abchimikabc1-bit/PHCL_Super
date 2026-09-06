import 'server-only';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  atomicAmountToDisplay,
  FINANCIAL_ASSETS,
  getServerFinancialAccount,
  type FinancialAsset,
} from '@/lib/server-financial-ledger';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const FINANCIAL_LEDGER_COLLECTION =
  'financial_ledger';

const FINANCIAL_ACCOUNTS_COLLECTION =
  'financial_accounts';

const USERS_COLLECTION =
  'users';

const DEFAULT_LIMIT =
  50;

const MAX_LIMIT =
  100;

const MAX_CURSOR_LENGTH =
  200;

const MAX_UID_LENGTH =
  128;

type PlainObject =
  Record<string, unknown>;

type SafeLedgerEntry = {
  ledgerEntryId: string;
  operationId: string;
  uid: string;
  operationType: string;
  asset: FinancialAsset;
  direction:
    | 'CREDIT'
    | 'DEBIT';
  amountAtomic: string;
  amount: string;
  balanceBeforeAtomic: string;
  balanceBefore: string;
  balanceAfterAtomic: string;
  balanceAfter: string;
  description: string;
  createdAt: string | null;
};

type SafeCustomerProfile = {
  uid: string;

  fullName:
    string | null;

  email:
    string | null;

  phone:
    string | null;

  country:
    string | null;

  role:
    string | null;

  tier:
    | 'regular'
    | 'small_business'
    | 'corporate'
    | null;

  accountStatus:
    string | null;

  verificationStatus:
    string | null;

  kycStatus:
    string | null;

  kysStatus:
    string | null;

  kybStatus:
    string | null;

  emailVerified:
    boolean;

  phoneVerified:
    boolean;

  biometricVerificationStatus:
    string | null;

  mfaEnabled:
    boolean;

  mfaVerified:
    boolean;

  createdAt:
    string | null;

  updatedAt:
    string | null;
};

type SafeFinancialAccount = {
  uid: string;

  exists: boolean;

  balances: {
    USD: string;
    TZS: string;
    NTZS: string;
    PI: string;
  };

  balancesAtomic: {
    usd: string;
    tzs: string;
    ntzs: string;
    pi: string;
  };

  updatedAt:
    string | null;
};

type AdminAccessResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function noStoreHeaders():
  HeadersInit {
  return {
    'Cache-Control':
      'no-store, no-cache, must-revalidate, private',

    Pragma:
      'no-cache',

    Expires:
      '0',
  };
}

function json(
  body:
    Record<string, unknown>,

  status =
    200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,

      headers:
        noStoreHeaders(),
    },
  );
}

function isPlainObject(
  value:
    unknown,
): value is PlainObject {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function readRequiredString(
  value:
    unknown,

  maximum =
    500,
): string | null {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length ===
      0 ||
    normalized.length >
      maximum
  ) {
    return null;
  }

  return normalized;
}

function readOptionalString(
  value:
    unknown,

  maximum =
    500,
): string | null {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length ===
      0
  ) {
    return null;
  }

  return normalized.slice(
    0,
    maximum,
  );
}

function readBoolean(
  value:
    unknown,
): boolean {
  return value === true;
}

function readTier(
  value:
    unknown,
):
  | 'regular'
  | 'small_business'
  | 'corporate'
  | null {
  if (
    value ===
      'regular' ||
    value ===
      'small_business' ||
    value ===
      'corporate'
  ) {
    return value;
  }

  return null;
}

function isFinancialAsset(
  value:
    unknown,
): value is FinancialAsset {
  return (
    typeof value ===
      'string' &&
    (
      FINANCIAL_ASSETS as
        readonly string[]
    ).includes(
      value,
    )
  );
}

function readDirection(
  value:
    unknown,
):
  | 'CREDIT'
  | 'DEBIT'
  | null {
  return (
    value ===
      'CREDIT' ||
    value ===
      'DEBIT'
  )
    ? value
    : null;
}

function readAtomicAmount(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      'string' ||
    !/^-?\d+$/.test(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function readTimestamp(
  value:
    unknown,
): string | null {
  if (
    value instanceof
    Timestamp
  ) {
    return value
      .toDate()
      .toISOString();
  }

  if (
    isPlainObject(
      value,
    ) &&
    typeof value.toDate ===
      'function'
  ) {
    try {
      const date =
        (
          value.toDate as
            () => unknown
        )();

      if (
        date instanceof
          Date &&
        Number.isFinite(
          date.getTime(),
        )
      ) {
        return date
          .toISOString();
      }
    } catch {
      return null;
    }
  }

  if (
    typeof value ===
      'string'
  ) {
    const date =
      new Date(
        value,
      );

    if (
      Number.isFinite(
        date.getTime(),
      )
    ) {
      return date
        .toISOString();
    }
  }

  return null;
}

function readUid(
  request:
    NextRequest,
):
  | string
  | null
  | false {
  const raw =
    request.nextUrl
      .searchParams
      .get('uid');

  if (
    raw === null
  ) {
    return null;
  }

  const normalized =
    raw.trim();

  if (
    normalized.length ===
      0 ||
    normalized.length >
      MAX_UID_LENGTH
  ) {
    return false;
  }

  /*
   * Firebase UIDs may come from
   * different identity providers.
   *
   * We do not unnecessarily limit them
   * to alphanumeric-only values.
   *
   * Firestore document IDs used here,
   * however, must remain one safe path
   * segment.
   */
  if (
    /[/\\\u0000-\u001F\u007F]/.test(
      normalized,
    )
  ) {
    return false;
  }

  return normalized;
}

function mapLedgerDocument(
  document:
    QueryDocumentSnapshot<DocumentData>,
): SafeLedgerEntry | null {
  const data =
    document.data();

  const ledgerEntryId =
    readRequiredString(
      data.ledgerEntryId,
      200,
    );

  const operationId =
    readRequiredString(
      data.operationId,
      200,
    );

  const uid =
    readRequiredString(
      data.uid,
      MAX_UID_LENGTH,
    );

  const operationType =
    readRequiredString(
      data.operationType,
      100,
    );

  const asset =
    data.asset;

  const direction =
    readDirection(
      data.direction,
    );

  const amountAtomic =
    readAtomicAmount(
      data.amountAtomic,
    );

  const balanceBeforeAtomic =
    readAtomicAmount(
      data.balanceBeforeAtomic,
    );

  const balanceAfterAtomic =
    readAtomicAmount(
      data.balanceAfterAtomic,
    );

  if (
    !ledgerEntryId ||
    !operationId ||
    !uid ||
    !operationType ||
    !isFinancialAsset(
      asset,
    ) ||
    !direction ||
    !amountAtomic ||
    !balanceBeforeAtomic ||
    !balanceAfterAtomic
  ) {
    return null;
  }

  const description =
    typeof data.description ===
      'string'
      ? data.description
          .trim()
          .slice(
            0,
            500,
          )
      : '';

  return {
    ledgerEntryId,

    operationId,

    uid,

    operationType,

    asset,

    direction,

    amountAtomic,

    amount:
      atomicAmountToDisplay(
        amountAtomic,
        asset,
      ),

    balanceBeforeAtomic,

    balanceBefore:
      atomicAmountToDisplay(
        balanceBeforeAtomic,
        asset,
      ),

    balanceAfterAtomic,

    balanceAfter:
      atomicAmountToDisplay(
        balanceAfterAtomic,
        asset,
      ),

    description,

    createdAt:
      readTimestamp(
        data.createdAt,
      ),
  };
}

function mapCustomerProfile(
  uid:
    string,

  data:
    DocumentData | undefined,
): SafeCustomerProfile | null {
  if (
    !data
  ) {
    return null;
  }

  const biometric =
    isPlainObject(
      data.biometricVerification,
    )
      ? data.biometricVerification
      : null;

  const mfa =
    isPlainObject(
      data.mfa,
    )
      ? data.mfa
      : null;

  return {
    uid,

    fullName:
      readOptionalString(
        data.fullName,
        120,
      ),

    email:
      readOptionalString(
        data.email,
        254,
      ),

    phone:
      readOptionalString(
        data.phone,
        40,
      ),

    country:
      readOptionalString(
        data.country,
        80,
      ),

    role:
      readOptionalString(
        data.role,
        40,
      ),

    tier:
      readTier(
        data.tier,
      ),

    accountStatus:
      readOptionalString(
        data.accountStatus,
        50,
      ),

    verificationStatus:
      readOptionalString(
        data.verificationStatus,
        50,
      ),

    kycStatus:
      readOptionalString(
        data.kycStatus,
        50,
      ),

    kysStatus:
      readOptionalString(
        data.kysStatus,
        50,
      ),

    kybStatus:
      readOptionalString(
        data.kybStatus,
        50,
      ),

    emailVerified:
      readBoolean(
        data.emailVerified,
      ),

    phoneVerified:
      readBoolean(
        data.phoneVerified,
      ),

    biometricVerificationStatus:
      biometric
        ? readOptionalString(
            biometric.status,
            50,
          )
        : null,

    mfaEnabled:
      mfa
        ? readBoolean(
            mfa.enabled,
          )
        : false,

    mfaVerified:
      mfa
        ? readBoolean(
            mfa.verified,
          )
        : false,

    createdAt:
      readTimestamp(
        data.createdAt,
      ),

    updatedAt:
      readTimestamp(
        data.updatedAt,
      ),
  };
}

async function readFinancialAccount(
  uid:
    string,
): Promise<SafeFinancialAccount> {
  /*
   * The financial engine remains the
   * authority for parsing balances.
   *
   * This direct snapshot is used only to
   * distinguish an existing account from
   * the engine's safe zero-balance fallback.
   */
  const accountSnapshot =
    await adminDb
      .collection(
        FINANCIAL_ACCOUNTS_COLLECTION,
      )
      .doc(
        uid,
      )
      .get();

  const account =
    await getServerFinancialAccount(
      uid,
    );

  return {
    uid:
      account.uid,

    exists:
      accountSnapshot.exists,

    balancesAtomic: {
      usd:
        account
          .balancesAtomic
          .usd,

      tzs:
        account
          .balancesAtomic
          .tzs,

      ntzs:
        account
          .balancesAtomic
          .ntzs,

      pi:
        account
          .balancesAtomic
          .pi,
    },

    balances: {
      USD:
        atomicAmountToDisplay(
          account
            .balancesAtomic
            .usd,
          'USD',
        ),

      TZS:
        atomicAmountToDisplay(
          account
            .balancesAtomic
            .tzs,
          'TZS',
        ),

      NTZS:
        atomicAmountToDisplay(
          account
            .balancesAtomic
            .ntzs,
          'NTZS',
        ),

      PI:
        atomicAmountToDisplay(
          account
            .balancesAtomic
            .pi,
          'PI',
        ),
    },

    updatedAt:
      readTimestamp(
        account.updatedAt,
      ),
  };
}

async function requireAdminAccess(
  request:
    NextRequest,
): Promise<AdminAccessResult> {
  const session =
    verifyAdminSessionToken(
      request.cookies.get(
        ADMIN_SESSION_COOKIE,
      )?.value,
    );

  if (
    !session
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Unauthorized.',
          },
          401,
        ),
    };
  }

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE,
    )?.value;

  if (
    !trustedSessionId
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Trusted device verification required.',
          },
          403,
        ),
    };
  }

  const trusted =
    await verifyTrustedDeviceSession(
      session.email,
      trustedSessionId,
    );

  if (
    !trusted
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Trusted device verification required.',
          },
          403,
        ),
    };
  }

  return {
    ok:
      true,
  };
}

function readLimit(
  request:
    NextRequest,
): number | null {
  const raw =
    request.nextUrl
      .searchParams
      .get('limit');

  if (
    raw === null
  ) {
    return DEFAULT_LIMIT;
  }

  if (
    !/^\d{1,3}$/.test(
      raw,
    )
  ) {
    return null;
  }

  const value =
    Number(
      raw,
    );

  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value < 1 ||
    value >
      MAX_LIMIT
  ) {
    return null;
  }

  return value;
}

function readCursor(
  request:
    NextRequest,
):
  | string
  | null
  | false {
  const raw =
    request.nextUrl
      .searchParams
      .get(
        'cursor',
      );

  if (
    raw === null
  ) {
    return null;
  }

  const normalized =
    raw.trim();

  if (
    normalized.length ===
      0 ||
    normalized.length >
      MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(
      normalized,
    )
  ) {
    return false;
  }

  return normalized;
}

async function readGlobalLedger(
  limit:
    number,

  cursor:
    string | null,
) {
  const collection =
    adminDb.collection(
      FINANCIAL_LEDGER_COLLECTION,
    );

  let query:
    Query<DocumentData> =
    collection
      .orderBy(
        'createdAt',
        'desc',
      )
      .limit(
        limit + 1,
      );

  if (
    cursor
  ) {
    const cursorSnapshot =
      await collection
        .doc(
          cursor,
        )
        .get();

    if (
      !cursorSnapshot.exists
    ) {
      return {
        ok:
          false as const,

        response:
          json(
            {
              ok:
                false,

              error:
                'Invalid cursor.',
            },
            400,
          ),
      };
    }

    query =
      collection
        .orderBy(
          'createdAt',
          'desc',
        )
        .startAfter(
          cursorSnapshot,
        )
        .limit(
          limit + 1,
        );
  }

  const snapshot =
    await query.get();

  const hasMore =
    snapshot.docs.length >
    limit;

  const visibleDocs =
    hasMore
      ? snapshot.docs.slice(
          0,
          limit,
        )
      : snapshot.docs;

  const entries =
    visibleDocs
      .map(
        mapLedgerDocument,
      )
      .filter(
        (
          entry,
        ): entry is SafeLedgerEntry =>
          entry !== null,
      );

  const nextCursor =
    hasMore &&
    visibleDocs.length >
      0
      ? visibleDocs[
          visibleDocs.length -
            1
        ].id
      : null;

  return {
    ok:
      true as const,

    entries,

    nextCursor,
  };
}

async function readCustomerLedger(
  uid:
    string,

  limit:
    number,

  cursor:
    string | null,
) {
  const collection =
    adminDb.collection(
      FINANCIAL_LEDGER_COLLECTION,
    );

  let query:
    Query<DocumentData> =
    collection
      .where(
        'uid',
        '==',
        uid,
      )
      .orderBy(
        'createdAt',
        'desc',
      )
      .limit(
        limit + 1,
      );

  if (
    cursor
  ) {
    const cursorSnapshot =
      await collection
        .doc(
          cursor,
        )
        .get();

    if (
      !cursorSnapshot.exists
    ) {
      return {
        ok:
          false as const,

        response:
          json(
            {
              ok:
                false,

              error:
                'Invalid cursor.',
            },
            400,
          ),
      };
    }

    const cursorData =
      cursorSnapshot.data();

    if (
      readOptionalString(
        cursorData?.uid,
        MAX_UID_LENGTH,
      ) !==
      uid
    ) {
      return {
        ok:
          false as const,

        response:
          json(
            {
              ok:
                false,

              error:
                'Invalid cursor.',
            },
            400,
          ),
      };
    }

    query =
      collection
        .where(
          'uid',
          '==',
          uid,
        )
        .orderBy(
          'createdAt',
          'desc',
        )
        .startAfter(
          cursorSnapshot,
        )
        .limit(
          limit + 1,
        );
  }

  const snapshot =
    await query.get();

  const hasMore =
    snapshot.docs.length >
    limit;

  const visibleDocs =
    hasMore
      ? snapshot.docs.slice(
          0,
          limit,
        )
      : snapshot.docs;

  const entries =
    visibleDocs
      .map(
        mapLedgerDocument,
      )
      .filter(
        (
          entry,
        ): entry is SafeLedgerEntry =>
          entry !== null,
      );

  const nextCursor =
    hasMore &&
    visibleDocs.length >
      0
      ? visibleDocs[
          visibleDocs.length -
            1
        ].id
      : null;

  return {
    ok:
      true as const,

    entries,

    nextCursor,
  };
}

async function readCustomerWallet(
  uid:
    string,

  limit:
    number,

  cursor:
    string | null,
) {
  const profileSnapshotPromise =
    adminDb
      .collection(
        USERS_COLLECTION,
      )
      .doc(
        uid,
      )
      .get();

  const financialAccountPromise =
    readFinancialAccount(
      uid,
    );

  const customerLedgerPromise =
    readCustomerLedger(
      uid,
      limit,
      cursor,
    );

  const [
    profileSnapshot,
    financialAccount,
    customerLedger,
  ] =
    await Promise.all([
      profileSnapshotPromise,
      financialAccountPromise,
      customerLedgerPromise,
    ]);

  if (
    customerLedger.ok ===
    false
  ) {
    return customerLedger;
  }

  const profile =
    mapCustomerProfile(
      uid,

      profileSnapshot.exists
        ? profileSnapshot.data()
        : undefined,
    );

  /*
   * We deliberately do not require a
   * user profile to exist before reading
   * an authoritative financial account.
   *
   * This keeps old/emulator ledger records
   * inspectable while migrations are being
   * completed.
   */
  const found =
    profile !== null ||
    financialAccount.exists ||
    customerLedger
      .entries.length >
      0;

  if (
    !found
  ) {
    return {
      ok:
        false as const,

      response:
        json(
          {
            ok:
              false,

            error:
              'Customer wallet not found.',
          },
          404,
        ),
    };
  }

  return {
    ok:
      true as const,

    profile,

    financialAccount,

    entries:
      customerLedger.entries,

    nextCursor:
      customerLedger.nextCursor,
  };
}

export async function GET(
  request:
    NextRequest,
) {
  try {
    const auth =
      await requireAdminAccess(
        request,
      );

    if (
      auth.ok ===
      false
    ) {
      return auth.response;
    }

    const limit =
      readLimit(
        request,
      );

    if (
      limit === null
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid limit.',
        },
        400,
      );
    }

    const cursor =
      readCursor(
        request,
      );

    if (
      cursor ===
      false
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid cursor.',
        },
        400,
      );
    }

    const uid =
      readUid(
        request,
      );

    if (
      uid ===
      false
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid customer UID.',
        },
        400,
      );
    }

    /*
     * MODE 1:
     *
     * No uid supplied:
     * return Global Financial Ledger.
     */
    if (
      uid === null
    ) {
      const ledger =
        await readGlobalLedger(
          limit,
          cursor,
        );

      if (
        ledger.ok ===
        false
      ) {
        return ledger.response;
      }

      return json(
        {
          ok:
            true,

          mode:
            'GLOBAL',

          entries:
            ledger.entries,

          count:
            ledger.entries.length,

          nextCursor:
            ledger.nextCursor,
        },
      );
    }

    /*
     * MODE 2:
     *
     * uid supplied:
     * return one customer's:
     *
     * - registration/compliance summary
     * - authoritative financial account
     * - UID-bound ledger entries
     */
    const customerWallet =
      await readCustomerWallet(
        uid,
        limit,
        cursor,
      );

    if (
      customerWallet.ok ===
      false
    ) {
      return customerWallet.response;
    }

    return json(
      {
        ok:
          true,

        mode:
          'CUSTOMER',

        uid,

        profile:
          customerWallet.profile,

        account:
          customerWallet
            .financialAccount,

        entries:
          customerWallet.entries,

        count:
          customerWallet
            .entries.length,

        nextCursor:
          customerWallet
            .nextCursor,
      },
    );
  } catch (
    error
  ) {
    /*
     * Do not leak Firestore,
     * authentication, index or internal
     * infrastructure details to Admin UI.
     */
    console.error(
      'Unable to read Admin financial wallet:',
      error instanceof
        Error
        ? error.name
        : 'UnknownError',
    );

    return json(
      {
        ok:
          false,

        error:
          'Unable to load financial wallet.',
      },
      500,
    );
  }
}

export async function POST() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

function methodNotAllowed() {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        'Method not allowed.',
    },
    {
      status:
        405,

      headers: {
        ...noStoreHeaders(),

        Allow:
          'GET',
      },
    },
  );
}