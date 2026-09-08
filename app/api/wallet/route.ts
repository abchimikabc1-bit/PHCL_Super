import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  adminDb,
} from '@/lib/firebase-admin';

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

const FINANCIAL_LEDGER_COLLECTION =
  'financial_ledger';

const MAX_LEDGER_ENTRIES =
  50;

type TimestampLike = {
  toDate?: () => Date;
};

function noStoreJson(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, max-age=0',

        Pragma:
          'no-cache',
      },
    },
  );
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function isFinancialAsset(
  value: unknown,
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

function normalizeAtomicAmount(
  value: unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    return '0';
  }

  return value;
}

function toIsoTimestamp(
  value: unknown,
): string | null {
  if (
    value instanceof Date &&
    Number.isFinite(
      value.getTime(),
    )
  ) {
    return value.toISOString();
  }

  if (
    isRecord(value) &&
    typeof (
      value as TimestampLike
    ).toDate ===
      'function'
  ) {
    try {
      const date =
        (
          value as TimestampLike
        ).toDate?.();

      return (
        date instanceof Date &&
        Number.isFinite(
          date.getTime(),
        )
      )
        ? date.toISOString()
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function getBalanceAtomic(
  balances: Record<
    string,
    string
  >,
  asset: FinancialAsset,
): string {
  switch (asset) {
    case 'USD':
      return balances.usd;

    case 'TZS':
      return balances.tzs;

    case 'NTZS':
      return balances.ntzs;

    case 'PI':
      return balances.pi;
  }
}

export async function GET(
  request: Request,
) {
  const authentication =
    await authenticateFirebaseUser(
      request,
    );

  if (
    !authentication.authenticated
  ) {
    return noStoreJson(
      {
        ok: false,
        code:
          'UNAUTHENTICATED',
        message:
          'Authentication required.',
      },
      401,
    );
  }

  try {
    const uid =
      authentication.user.uid;

    const [
      account,
      ledgerSnapshot,
    ] =
      await Promise.all([
        getServerFinancialAccount(
          uid,
        ),

        adminDb
          .collection(
            FINANCIAL_LEDGER_COLLECTION,
          )
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
            MAX_LEDGER_ENTRIES,
          )
          .get(),
      ]);

    const balances =
      Object.fromEntries(
        FINANCIAL_ASSETS.map(
          (asset) => {
            const atomic =
              getBalanceAtomic(
                account.balancesAtomic,
                asset,
              );

            return [
              asset.toLowerCase(),
              {
                atomic,

                display:
                  atomicAmountToDisplay(
                    atomic,
                    asset,
                  ),
              },
            ];
          },
        ),
      );

    const ledger =
      ledgerSnapshot.docs.map(
        (document) => {
          const data =
            document.data();

          const asset =
            isFinancialAsset(
              data.asset,
            )
              ? data.asset
              : null;

          const amountAtomic =
            normalizeAtomicAmount(
              data.amountAtomic,
            );

          return {
            id:
              document.id,

            operationId:
              typeof data.operationId ===
                'string'
                ? data.operationId
                : null,

            operationType:
              typeof data.operationType ===
                'string'
                ? data.operationType
                : 'UNKNOWN',

            direction:
              data.direction ===
                'CREDIT' ||
              data.direction ===
                'DEBIT'
                ? data.direction
                : 'UNKNOWN',

            asset,

            amountAtomic,

            amount:
              asset
                ? atomicAmountToDisplay(
                    amountAtomic,
                    asset,
                  )
                : '0',

            balanceAfter:
              asset
                ? atomicAmountToDisplay(
                    normalizeAtomicAmount(
                      data.balanceAfterAtomic,
                    ),
                    asset,
                  )
                : '0',

            description:
              typeof data.description ===
                'string'
                ? data.description
                    .trim()
                    .slice(
                      0,
                      240,
                    )
                : '',

            createdAt:
              toIsoTimestamp(
                data.createdAt,
              ),
          };
        },
      );

    return noStoreJson({
      ok: true,

      wallet: {
        balances,

        updatedAt:
          toIsoTimestamp(
            account.updatedAt,
          ),

        ledger,
      },
    });
  } catch (error) {
    console.error(
      'Unable to load authoritative customer wallet:',
      error,
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'WALLET_UNAVAILABLE',
        message:
          'Unable to load wallet.',
      },
      500,
    );
  }
}

function methodNotAllowed() {
  return noStoreJson(
    {
      ok: false,
      code:
        'METHOD_NOT_ALLOWED',
      message:
        'Method not allowed.',
    },
    405,
  );
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