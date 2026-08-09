```
PHCL APP STRUCTURE - Welcome & Landing Experience
================================================

┌─────────────────────────────────────────────────────┐
│                  App Opens (/)                      │
│                                                     │
│  Redirects to /welcome automatically               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         WELCOME PAGE (/welcome)                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         [PHCL Logo & Company Name]           │  │
│  │      PiHUB COMPANY Limited 🇹🇿              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Hero Section:                                      │
│  "Trade Crypto with Confidence"                    │
│  "Fast, Secure, Easy Cryptocurrency Trading"      │
│                                                     │
│  [Start Trading] [Open Wallet]                     │
│                                                     │
│  Stats: 50K+ Users | 24/7 Support | $100M+ Traded │
│                                                     │
│  Why Choose PHCL:                                   │
│  ⚡ Lightning Fast    🔒 Secure & Safe    🌐 Pi Ready│
│                                                     │
│  Quick Actions:                                     │
│  [💬 AI Chat] [👛 Wallet] [📈 Trading]            │
│                                                     │
│  Footer with links & company info                  │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
    [Start]               [Wallet]
       │                       │
       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│  Chat Page (/)   │  │ Wallet (/wallet) │
│  with PHCL       │  │                  │
│  Header          │  │ [Transfer]       │
│                  │  │ [Deposit]        │
│  Features:       │  │ [Withdraw]       │
│  • Trading Chat  │  │                  │
│  • Live Prices   │  │ Balance Display  │
│  • Analysis      │  │ Transaction Hist │
└──────────────────┘  └──────────────────┘
       │                       │
       ├─ Header Navigation    └─ Trading, Marketplace, etc
       ├─ Language Selector
       └─ PHCL Branding

HEADER (Available on All Pages)
================================
[🟣 PHCL Logo] [Chat] [Wallet] [Trading] [Marketplace] [?]
                                            [🌐 Language] [Start]

DESIGN SYSTEM
=============
Colors:
  Primary: #c922c9 (Vibrant Purple)
  Secondary: #9333ea (Purple)
  Background: #f3e8ff (Light Purple)
  Foreground: #1f2937 (Dark Gray)

Typography:
  Headings: Bold, Large
  Body: Regular, Medium
  Bilingual: English + Swahili

Animations:
  Page Load: Fade In + Slide Up
  Buttons: Scale on Hover
  Dropdowns: Smooth Transition
  Cards: Lift Effect

Responsive:
  Mobile: Hamburger Menu
  Tablet: Compact Version
  Desktop: Full Navigation

KEY FEATURES
============
✅ PHCL Logo Prominently Displayed
✅ Welcome Page with Hero Section
✅ Professional Header Navigation
✅ Language Selector (EN/SW)
✅ Smooth Animations
✅ Mobile-Responsive Design
✅ Quick Action Cards
✅ Professional Footer
✅ Company Information Display
✅ Beautiful Gradient Theme
```

## HOW TO USE

### For First Time Users:
1. App loads → Automatically shows `/welcome` page
2. See PHCL logo and welcome message
3. Choose to "Start Trading" (chat) or "Open Wallet"
4. Can switch language anytime

### For Existing Users:
1. Click logo to return home
2. Use header navigation on all pages
3. Language selector in top right
4. Mobile menu for smaller screens

### Customization:
- Update company info in `/lib/phcl-config.ts`
- Change colors in PHCL_COLORS
- Modify welcome page text for different messaging
- Add real logos to `/public` folder

---
**PHCL App - Professional Cryptocurrency Trading Platform**  
**Tanzania | 2026**
