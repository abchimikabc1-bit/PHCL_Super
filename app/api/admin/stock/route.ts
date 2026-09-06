import {
  NextRequest,
  NextResponse,
} from 'next/server';

import type {
  ProductStockConfig,
} from '@/lib/admin-product-stock';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  getServerProductStockAudit,
  getServerProductStockConfig,
  saveServerProductStockConfig,
  updateServerProductStock,
} from '@/lib/server-product-stock-store';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate',

  Pragma:
    'no-cache',

  Expires:
    '0',
} as const;

function unauthorizedResponse(
  code:
    | 'UNAUTHENTICATED'
    | 'TRUSTED_DEVICE_REQUIRED'
) {
  return NextResponse.json(
    {
      success: false,
      code,
      error:
        'Admin authorization required.',
    },
    {
      status: 401,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

async function authorizeAdmin(
  request: NextRequest
) {
  const sessionToken =
    request.cookies.get(
      ADMIN_SESSION_COOKIE
    )?.value;

  if (!sessionToken) {
    return null;
  }

  const session =
    verifyAdminSessionToken(
      sessionToken
    );

  if (!session) {
    return null;
  }

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE
    )?.value;

  if (!trustedSessionId) {
    return {
      session,
      trusted: false,
    };
  }

  const trusted =
    await verifyTrustedDeviceSession(
      session.email,
      trustedSessionId
    );

  return {
    session,
    trusted,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const authorization =
      await authorizeAdmin(
        request
      );

    if (!authorization) {
      return unauthorizedResponse(
        'UNAUTHENTICATED'
      );
    }

    if (
      !authorization.trusted
    ) {
      return unauthorizedResponse(
        'TRUSTED_DEVICE_REQUIRED'
      );
    }

    const [
      config,
      audit,
    ] = await Promise.all([
      getServerProductStockConfig(),
      getServerProductStockAudit(),
    ]);

    return NextResponse.json(
      {
        success: true,
        config,
        audit,
      },
      {
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      'Unable to load Admin product stock:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to load product stock.',
      },
      {
        status: 500,
        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      await authorizeAdmin(
        request
      );

    if (!authorization) {
      return unauthorizedResponse(
        'UNAUTHENTICATED'
      );
    }

    if (
      !authorization.trusted
    ) {
      return unauthorizedResponse(
        'TRUSTED_DEVICE_REQUIRED'
      );
    }

    let body: {
      action?:
        | 'save_config'
        | 'update_product';

      config?:
        ProductStockConfig;

      productId?:
        string;

      updates?:
        Record<
          string,
          unknown
        >;
    };

    try {
      body =
        (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid request body.',
        },
        {
          status: 400,
          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    const actor =
      authorization.session.email;

    if (
      body.action ===
        'save_config' &&
      body.config &&
      typeof body.config ===
        'object'
    ) {
      const next =
        await saveServerProductStockConfig(
          body.config,
          actor
        );

      return NextResponse.json(
        {
          success: true,
          ...next,
        },
        {
          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    if (
      body.action ===
        'update_product' &&
      typeof body.productId ===
        'string' &&
      body.productId.trim() &&
      body.updates &&
      typeof body.updates ===
        'object' &&
      !Array.isArray(
        body.updates
      )
    ) {
      const next =
        await updateServerProductStock(
          body.productId,
          body.updates,
          actor
        );

      if (!next.updated) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Product not found.',
          },
          {
            status: 404,
            headers:
              NO_STORE_HEADERS,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          ...next,
        },
        {
          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Unsupported stock action.',
      },
      {
        status: 400,
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      'Unable to update Admin product stock:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : '';

    const validationError =
      message ===
        'Invalid stock update.' ||
      message ===
        'Stock must be -1 or a non-negative integer.' ||
      message ===
        'enabledForSale must be boolean.' ||
      message ===
        'notes must be a string.' ||
      message ===
        'No supported stock fields were supplied.';

    return NextResponse.json(
      {
        success: false,
        error:
          validationError
            ? message
            : 'Unable to save product stock.',
      },
      {
        status:
          validationError
            ? 400
            : 500,

        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}