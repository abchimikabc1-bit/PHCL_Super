# PHCL Super Documentation Cleanup Checklist

This checklist records the current route audit after cleaning stale page documentation.

## Shared Experience

- [x] `app/layout.tsx` reviewed
- [x] `app/page.tsx` confirmed as the active entry route
- [x] `app/home-client.tsx` confirmed as the active landing implementation
- [x] `components/navbar.tsx` confirmed as the active shared navigation component
- [x] `components/global-quick-actions.tsx` confirmed as the floating AI shortcut

## Public Pages Reviewed

- [x] `/`
- [x] `/marketplace`
- [x] `/product/[id]`
- [x] `/cart`
- [x] `/checkout`
- [x] `/orders`
- [x] `/chat`
- [x] `/wallet`
- [x] `/exchange`
- [x] `/transfer`
- [x] `/deposit`
- [x] `/withdraw`
- [x] `/transactions`
- [x] `/settings`
- [x] `/feedback`
- [x] `/login`
- [x] `/signup`
- [x] `/privacy-policy`
- [x] `/terms-of-service`
- [x] `/bulk-discount-test`

## Admin Pages Reviewed

- [x] `/admin/login`
- [x] `/admin/dashboard`
- [x] `/admin/products`
- [x] `/admin/orders`
- [x] `/admin/transactions`
- [x] `/admin/wallet`
- [x] `/admin/currencies`
- [x] `/admin/converter`
- [x] `/admin/languages`
- [x] `/admin/analytics`
- [x] `/admin/security`
- [x] `/admin/settings`
- [x] `/admin/users`

## Cleanup Outcomes

- [x] Removed stale splash and welcome flow claims from page-oriented docs
- [x] Replaced deleted file references with current route files
- [x] Removed unverifiable marketing metrics from the core route docs
- [x] Aligned legal-page documentation with `/privacy-policy` and `/terms-of-service`
- [x] Aligned bulk discount documentation with the current calculator and cart implementation
