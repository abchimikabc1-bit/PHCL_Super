# PHCL Super Development Log

## Current Route Audit Summary

### Landing and navigation
- `/` uses `app/page.tsx` plus `app/home-client.tsx` as the active landing surface
- Shared shell lives in `app/layout.tsx`
- Shared navigation lives in `components/navbar.tsx`

### Commerce
- `/marketplace` for browsing
- `/product/[id]` for product details
- `/cart` for cart review and promo application
- `/checkout` for checkout
- `/orders` for order history

### Wallet and transactions
- `/wallet` for balances and quick actions
- `/exchange` for conversion
- `/transfer` for send flow
- `/deposit` for receive flow
- `/withdraw` for withdrawal flow
- `/transactions` for history

### Account, community, and legal
- `/chat`
- `/settings`
- `/feedback`
- `/login`
- `/signup`
- `/privacy-policy`
- `/terms-of-service`

### Admin
- `/admin/login`
- `/admin/dashboard`
- `/admin/products`
- `/admin/orders`
- `/admin/transactions`
- `/admin/wallet`
- `/admin/currencies`
- `/admin/converter`
- `/admin/languages`
- `/admin/analytics`
- `/admin/security`
- `/admin/settings`
- `/admin/users`

## Documentation Cleanup Result

Older notes that referenced `/app/trading/page.tsx`, `/app/order-history/page.tsx`, `/app/welcome/page.tsx`, or other deleted routes have been superseded by the current route inventory.
