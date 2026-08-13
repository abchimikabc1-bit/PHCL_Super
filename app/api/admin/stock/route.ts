import { NextRequest, NextResponse } from 'next/server';
import type { ProductStockConfig } from '@/lib/admin-product-stock';
import { requireAdminSession, validateCsrf } from '@/lib/admin-security';
import { getServerProductStockAudit, getServerProductStockConfig, saveServerProductStockConfig, updateServerProductStock } from '@/lib/server-product-stock-store';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdminSession(request);
    const isAdmin = !auth.response;

    return NextResponse.json({
      success: true,
      config: getServerProductStockConfig(),
      audit: isAdmin ? getServerProductStockAudit() : [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load product stock' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminSession(request);
  if (auth.response) {
    return auth.response;
  }

  if (!validateCsrf(request)) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      action?: 'save_config' | 'update_product';
      actor?: string;
      config?: ProductStockConfig;
      productId?: string;
      updates?: Record<string, unknown>;
    };

    const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 120) : 'admin';

    if (body.action === 'save_config' && body.config) {
      const next = saveServerProductStockConfig(body.config, actor);
      return NextResponse.json({ success: true, ...next });
    }

    if (body.action === 'update_product' && body.productId && body.updates && typeof body.updates === 'object') {
      const next = updateServerProductStock(body.productId, body.updates, actor);
      return NextResponse.json({ success: true, ...next });
    }

    return NextResponse.json({ success: false, error: 'Unsupported stock action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save product stock' },
      { status: 400 }
    );
  }
}