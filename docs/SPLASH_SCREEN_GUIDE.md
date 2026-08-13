# PHCL Super Splash Screen Guide

## Status

The splash-screen flow described in older documentation is no longer part of the current app structure.

## Current Behavior

- `/` is the active landing route
- `app/page.tsx` renders the home experience directly
- `app/home-client.tsx` contains the branded landing content
- Navigation shortcuts send users straight to functional routes without an intermediate splash screen

## Documentation Rule

Do not document `/app/splash/page.tsx` as an active route unless that file is added back to the codebase.
