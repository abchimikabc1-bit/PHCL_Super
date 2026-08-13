# 🚀 PHCL Super

[![Release Gate](https://github.com/abchimikabc1-bit/PHCL_Super/actions/workflows/release-gate.yml/badge.svg?branch=main)](https://github.com/abchimikabc1-bit/PHCL_Super/actions/workflows/release-gate.yml)
![Next.js 15](https://img.shields.io/badge/Next.js-15.5.9-black?style=flat-square)
![Repository Status](https://img.shields.io/badge/Status-Active-blue?style=flat-square)

## Overview

PHCL Super is a Next.js application for marketplace browsing, wallet and checkout flows, admin operations, multilingual UI, and release-gated deployment checks.

This README has been cleaned to reflect the repository as it exists now. It avoids placeholder APIs, outdated framework versions, and unverifiable claims.

## Current Stack

- Next.js 15.5.9
- React 18
- TypeScript
- Tailwind CSS
- Firebase client/admin integrations
- Prisma packages included in the project
- GitHub Actions release gate workflow

## Implemented Areas in This Repository

- `app/` Next.js App Router pages and API routes
- `components/` UI, marketplace, checkout, admin, and shared components
- `lib/` currency, translations, auth, analytics, commerce, and support utilities
- `hooks/` reusable client hooks
- `public/` static branding and image assets
- `.github/workflows/release-gate.yml` CI verification workflow

## Key Product Capabilities Present in Code

- Marketplace browsing and product detail pages
- Wallet, checkout, cart, orders, transfer, deposit, and withdraw pages
- Admin pages for dashboard, orders, products, currencies, analytics, and security
- Multilingual UI with 16 language options defined in `lib/translations.ts`
- Currency and payment support including USD, TZS, nTZS, and PI in core flows
- AI chat route and Firebase health ping route
- Release verification scripts for local and CI checks

## Repository Structure

```text
PHCL_Super/
├── app/
│   ├── api/
│   ├── admin/
│   ├── marketplace/
│   ├── product/[id]/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── docs/
├── hooks/
├── lib/
├── marketplace/
├── prisma/
├── public/
├── scripts/
├── .github/workflows/release-gate.yml
├── apphosting.yaml
├── firebase.json
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## Local Setup

### Prerequisites

- Node.js 18+  
- npm

### Install

```bash
npm ci
```

### Configure Environment

Use the template at `/home/runner/work/PHCL_Super/PHCL_Super/.env.example`.

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows:

```powershell
copy .env.example .env.local
```

Then fill in the required values in `.env.local`.

### Run Locally

```bash
npm run dev
```

Useful variants:

```bash
npm run dev:lan
npm run dev:https
npm run dev:https:3443
```

## Validation Commands

```bash
npm run lint
npm run build
npm test
```

Full release verification:

```bash
npm run release:verify
```

## API Routes Currently Present

These routes exist under `app/api` in the current repository:

```text
/api/admin/auth
/api/admin/config
/api/admin/security/overview
/api/admin/stock
/api/alerts
/api/alerts/preferences
/api/analytics/performance
/api/chat
/api/commerce/backup
/api/commerce/sync
/api/exchange/rates
/api/firebase/ping
```

If a route is not listed above, do not document it as available unless it is added to the codebase.

## CI/CD and Branch Hardening

The repository includes:

- Workflow: `/home/runner/work/PHCL_Super/PHCL_Super/.github/workflows/release-gate.yml`
- Status check name: `PHCL Release Gate`

To harden the `main` branch in GitHub:

1. Go to **Settings → Branches**
2. Add or edit the rule for `main`
3. Disable force pushes
4. Disable branch deletion
5. Require the `PHCL Release Gate` status check before merging

Important: branch protection is a GitHub repository setting, not something enforced by README alone.

## Deployment-Related Files Present

- `apphosting.yaml`
- `firebase.json`
- `next.config.mjs`
- `scripts/release-readiness.mjs`
- `scripts/compliance-readiness.mjs`
- `scripts/post-build-smoke.mjs`

Any deployment guide should stay aligned with those files and the active CI workflow.

## Documentation Source-of-Truth Rules

When updating project records:

- Prefer documented features that are visible in code
- Prefer exact route names over planned route names
- Prefer actual package versions from `package.json`
- Prefer current file names such as `next.config.mjs`
- Avoid claiming branch protection is enabled unless it is enabled in GitHub settings
- Remove stale examples when implementation changes

## Notes

- The repository currently does not publish an open-source `LICENSE` file.
- Some older markdown files in the repo may describe historical states; use this README and the live codebase together as the primary reference.

