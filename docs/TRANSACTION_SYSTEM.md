# PHCL Super Transaction Routes

This document reflects the transaction-related routes that currently exist in the app.

## Active Pages

### `/wallet`
- File: `app/wallet/page.tsx`
- Purpose: wallet overview, balances, and quick links into transaction flows

### `/exchange`
- File: `app/exchange/page.tsx`
- Purpose: exchange and converter experience

### `/transfer`
- File: `app/transfer/page.tsx`
- Purpose: send crypto flow

### `/deposit`
- File: `app/deposit/page.tsx`
- Purpose: receive crypto flow

### `/withdraw`
- File: `app/withdraw/page.tsx`
- Purpose: withdraw flow

### `/transactions`
- File: `app/transactions/page.tsx`
- Purpose: transaction history and filtering

## Supporting Notes

- The active transaction pages are routed directly from `app/`
- The wallet flow is linked from the landing surface, navigation shell, and related commerce/account pages
- There is no active `app/transaction-demo/page.tsx` in the current repository
