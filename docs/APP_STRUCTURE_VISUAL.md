# PHCL Super - Current App Structure

```text
/
├── Shared shell
│   ├── app/layout.tsx
│   ├── components/ui/coming-soon-ticker.tsx
│   ├── components/navbar.tsx
│   └── components/global-quick-actions.tsx
│
├── Entry surface
│   ├── app/page.tsx
│   └── app/home-client.tsx
│
├── Commerce routes
│   ├── /marketplace
│   ├── /product/[id]
│   ├── /cart
│   ├── /checkout
│   └── /orders
│
├── Wallet and transaction routes
│   ├── /wallet
│   ├── /exchange
│   ├── /transfer
│   ├── /deposit
│   ├── /withdraw
│   └── /transactions
│
├── Community and account routes
│   ├── /chat
│   ├── /settings
│   ├── /feedback
│   ├── /login
│   ├── /signup
│   ├── /privacy-policy
│   └── /terms-of-service
│
├── Admin routes
│   ├── /admin/login
│   ├── /admin/dashboard
│   ├── /admin/products
│   ├── /admin/orders
│   ├── /admin/transactions
│   ├── /admin/wallet
│   ├── /admin/currencies
│   ├── /admin/converter
│   ├── /admin/languages
│   ├── /admin/analytics
│   ├── /admin/security
│   ├── /admin/settings
│   └── /admin/users
│
└── Internal verification route
    └── /bulk-discount-test
```

## Notes

- The home route `/` is the active landing page.
- There is no current splash or standalone welcome route in `app/`.
- The current navigation component is `components/navbar.tsx`, not `components/header.tsx`.
