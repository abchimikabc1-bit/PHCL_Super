# PHCL Super Restoration Verification

## Current Verification Scope

This verification is aligned to the routes and components that currently exist in the repository.

## Verified Route Groups

### Home and navigation
- `app/page.tsx`
- `app/home-client.tsx`
- `app/layout.tsx`
- `components/navbar.tsx`
- `components/global-quick-actions.tsx`

### Commerce
- `app/marketplace/page.tsx`
- `app/product/[id]/page.tsx`
- `app/cart/page.tsx`
- `app/checkout/page.tsx`
- `app/orders/page.tsx`

### Wallet and transaction flows
- `app/wallet/page.tsx`
- `app/exchange/page.tsx`
- `app/transfer/page.tsx`
- `app/deposit/page.tsx`
- `app/withdraw/page.tsx`
- `app/transactions/page.tsx`

### Account and legal
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/settings/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms-of-service/page.tsx`

### Admin console
- `app/admin/dashboard/page.tsx`
- `app/admin/products/page.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/transactions/page.tsx`
- `app/admin/wallet/page.tsx`
- `app/admin/currencies/page.tsx`
- `app/admin/converter/page.tsx`
- `app/admin/languages/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/security/page.tsx`
- `app/admin/settings/page.tsx`
- `app/admin/users/page.tsx`

## Cleanup Note

Do not use deleted-route references such as `/app/live-market/page.tsx` or `components/header.tsx` as restoration evidence for the current repository state.
