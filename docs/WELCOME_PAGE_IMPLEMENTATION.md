# PHCL Super Home Experience Implementation

The repository no longer uses a separate `/welcome` page. The current landing experience is implemented directly on `/`.

## Active Files

- `app/page.tsx`
- `app/home-client.tsx`
- `components/navbar.tsx`
- `components/global-quick-actions.tsx`

## Current Home Experience

- `app/page.tsx` defines the page metadata and wraps the home content
- `app/home-client.tsx` renders the branded hero, language toggle, route shortcuts, featured marketplace content, metrics, testimonials, and contact sections
- `components/navbar.tsx` provides the shared bottom navigation for supported routes
- `components/global-quick-actions.tsx` keeps the floating AI action visible

## Active User Flow

1. User opens `/`
2. The branded landing page is shown immediately
3. The user can jump directly to `/marketplace`, `/wallet`, `/chat`, `/exchange`, `/admin/dashboard`, or `/settings`
4. Legal and account routes remain available through their dedicated pages

## Cleanup Note

Any older documentation that mentions `/app/welcome/page.tsx`, `/app/index.tsx`, or `components/header.tsx` is outdated and should not be used as an implementation reference.
