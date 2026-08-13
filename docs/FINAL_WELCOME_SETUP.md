# PHCL Super Final Landing Setup

## Current State

PHCL Super now uses a single landing route at `/` instead of a multi-step splash-to-welcome flow.

## Active Entry Files

- `app/page.tsx` - page metadata and top-level landing wrapper
- `app/home-client.tsx` - landing content and route shortcuts
- `app/layout.tsx` - global shell
- `components/navbar.tsx` - shared bottom navigation
- `components/global-quick-actions.tsx` - floating AI shortcut

## Current Entry Flow

1. User opens `/`
2. The branded landing surface loads immediately
3. The user can navigate to chat, marketplace, wallet, exchange, settings, or admin dashboard from the home shortcuts
4. Shared shell elements remain visible where the layout allows

## Retired Flow

The repository does not currently implement these legacy entry files:

- `app/splash/page.tsx`
- `app/welcome/page.tsx`
- `app/index.tsx`

If these names appear in older notes, treat them as historical only.
