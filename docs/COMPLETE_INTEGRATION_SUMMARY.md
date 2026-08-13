# PHCL Super - Current Route Integration Summary

This document reflects the current App Router structure in `/home/runner/work/PHCL_Super/PHCL_Super/app`.

## Shared Shell

- `app/layout.tsx` provides the global shell
- `components/navbar.tsx` renders the bottom navigation on non-auth/legal pages
- `components/global-quick-actions.tsx` exposes the floating AI shortcut
- `components/ui/coming-soon-ticker.tsx` renders the top ticker
- `app/page.tsx` is the real entry route and renders `app/home-client.tsx`

## Entry Flow

1. User lands on `/`
2. `app/page.tsx` renders the branded home surface
3. Home shortcuts send users directly to marketplace, wallet, chat, exchange, admin dashboard, and settings
4. Global navigation remains available on supported routes

## Public Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `app/page.tsx` | Main landing page with PHCL branding and shortcuts |
| `/marketplace` | `app/marketplace/page.tsx` | Product discovery and browsing |
| `/product/[id]` | `app/product/[id]/page.tsx` | Product detail page |
| `/cart` | `app/cart/page.tsx` | Cart review and promo application |
| `/checkout` | `app/checkout/page.tsx` | Checkout flow |
| `/orders` | `app/orders/page.tsx` | Customer order history |
| `/chat` | `app/chat/page.tsx` | Community chat experience |
| `/wallet` | `app/wallet/page.tsx` | Wallet overview and balances |
| `/exchange` | `app/exchange/page.tsx` | Currency exchange and converter |
| `/transfer` | `app/transfer/page.tsx` | Send crypto flow |
| `/deposit` | `app/deposit/page.tsx` | Receive crypto flow |
| `/withdraw` | `app/withdraw/page.tsx` | Withdraw flow |
| `/transactions` | `app/transactions/page.tsx` | Transaction history |
| `/settings` | `app/settings/page.tsx` | End-user settings |
| `/feedback` | `app/feedback/page.tsx` | Feedback submission |
| `/login` | `app/login/page.tsx` | User login |
| `/signup` | `app/signup/page.tsx` | Account creation |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Privacy policy |
| `/terms-of-service` | `app/terms-of-service/page.tsx` | Terms of service |
| `/bulk-discount-test` | `app/bulk-discount-test/page.tsx` | Internal bulk discount verification page |

## Admin Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/admin/login` | `app/admin/login/page.tsx` | Admin sign-in |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Admin control center |
| `/admin/products` | `app/admin/products/page.tsx` | Product stock management |
| `/admin/orders` | `app/admin/orders/page.tsx` | Order management |
| `/admin/transactions` | `app/admin/transactions/page.tsx` | Admin transaction review |
| `/admin/wallet` | `app/admin/wallet/page.tsx` | Wallet ledger |
| `/admin/currencies` | `app/admin/currencies/page.tsx` | Currency management |
| `/admin/converter` | `app/admin/converter/page.tsx` | Currency conversion tool |
| `/admin/languages` | `app/admin/languages/page.tsx` | Language management |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | Analytics dashboard |
| `/admin/security` | `app/admin/security/page.tsx` | Security overview |
| `/admin/settings` | `app/admin/settings/page.tsx` | System settings |
| `/admin/users` | `app/admin/users/page.tsx` | User account management |

## Documentation Notes

- Legacy references to `/welcome`, `/splash`, `/live-market`, `/admin`, and `components/header.tsx` should be treated as historical and not current implementation details.
- Use this file, the README, and the live route files as the current source of truth for page coverage.
