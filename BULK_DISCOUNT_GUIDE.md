# PHCL Super Bulk Discount Guide

## Current Implementation

Bulk discount support is documented by the files that exist in the current repository:

- `lib/promo-system.ts` - promo and discount logic
- `components/bulk-discount-calculator.tsx` - quantity-based discount calculator
- `components/shopping-cart.tsx` - cart summary, promo application, and totals
- `app/cart/cart-client.tsx` - cart page wiring
- `app/bulk-discount-test/page.tsx` - internal verification screen for discount tiers

## Where the Feature Appears

### Cart flow
- Route: `/cart`
- File: `app/cart/page.tsx`
- Purpose: review cart items, apply promo discounts, and continue to checkout

### Bulk discount verification
- Route: `/bulk-discount-test`
- File: `app/bulk-discount-test/page.tsx`
- Purpose: exercise the calculator against sample prices and quantity tiers

## Current Discount Tiers

- 1-2 items: no discount
- 3-4 items: 10% off
- 5-9 items: 20% off
- 10+ items: 25% off

## Cleanup Note

Do not document `/app/welcome/page.tsx`, `/app/admin/page.tsx`, `components/promo-dashboard.tsx`, or `components/admin-promo-panel.tsx` as active bulk-discount surfaces unless those files are added back.
