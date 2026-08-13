# PHCL Super Legal Pages and Shared Visuals

## Active Legal Pages

### Privacy Policy
- Route: `/privacy-policy`
- File: `app/privacy-policy/page.tsx`
- Includes an effective date, data-use summary, security controls, retention, and contact details

### Terms of Service
- Route: `/terms-of-service`
- File: `app/terms-of-service/page.tsx`
- Includes bilingual content, effective date signals, eligibility rules, trading risk language, prohibited activities, and support contact details

## Current Linking Pattern

- Privacy page links back to `/settings` and across to `/terms-of-service`
- Terms page links across to `/privacy-policy`
- The legal routes are separate dedicated pages and should be documented with their exact live paths

## Shared Visual Surfaces in the Current App

- `app/page.tsx` and `app/home-client.tsx` provide the primary branded hero experience
- `components/navbar.tsx` provides shared navigation
- `components/global-quick-actions.tsx` provides the floating AI shortcut

## Cleanup Note

Do not treat `/app/privacy/page.tsx`, `/app/terms/page.tsx`, `/app/agreement/page.tsx`, or `components/live-matrix-graphic.tsx` as active implementation files unless they exist in the repository.
