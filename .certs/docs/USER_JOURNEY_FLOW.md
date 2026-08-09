# PHCL App User Journey

## Complete User Flow

```
┌─────────────────────────────────────────────────────────┐
│                   APP LAUNCH (/)                        │
│         Root page redirects to splash                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              SPLASH SCREEN (/splash)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🎨 Purple gradient background                   │  │
│  │ 🔄 Animated circles (pulse)                     │  │
│  │                                                  │  │
│  │      π (PHCL Logo - bouncing)                  │  │
│  │                                                  │  │
│  │      WELCOME                                    │  │
│  │      PHCL (gradient: yellow→white→purple)       │  │
│  │      Trade Crypto with Confidence              │  │
│  │                                                  │  │
│  │      [Enter App Button] (appears after 3s)      │  │
│  │      ⏳ Auto-redirect to /welcome (5s total)    │  │
│  └──────────────────────────────────────────────────┘  │
│  Duration: 5 seconds (or click Enter App)              │
└──────────────────┬──────────────────────────────────────┘
                   │ Auto-redirect or button click
                   ▼
┌─────────────────────────────────────────────────────────┐
│             WELCOME PAGE (/welcome)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Header: PHCL Logo + Navigation                  │  │
│  │                                                  │  │
│  │ Hero Section:                                   │  │
│  │ - Welcome message                              │  │
│  │ - "Trade Crypto" CTA                           │  │
│  │                                                  │  │
│  │ Features Cards:                                 │  │
│  │ - Lightning Fast Trading                        │  │
│  │ - Secure & Safe                                │  │
│  │ - Pi Network Ready                             │  │
│  │                                                  │  │
│  │ Quick Actions:                                  │  │
│  │ [Start Trading] [Open Wallet] [Learn More]     │  │
│  │                                                  │  │
│  │ Footer: Links & Contact Info                    │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬────────────────┐
    │              │              │                │
    ▼              ▼              ▼                ▼
 [Chat]      [Wallet]        [Trading]      [Marketplace]
   /            /wallet       /live-market      /marketplace
```

## Feature Access Points

### From Welcome Page
1. **Start Trading** → Redirects to chat
2. **Open Wallet** → Shows wallet balance & transactions
3. **Learn More** → Shows features & benefits

### From Header (Always Available)
1. **Chat** (💬) → `/` - Chat interface
2. **Wallet** (👛) → `/wallet` - Wallet management
3. **Trading** (📈) → `/live-market` - Live market data
4. **Marketplace** (🛍️) → `/marketplace` - Buy/sell crypto
5. **FAQ** (❓) → `/faq` - Help & support

### Language Selection
- Toggle between English & Swahili
- Available on all pages
- Header dropdown (desktop) or mobile menu

## Page Details

### Splash Screen
- **Duration**: 5 seconds
- **Auto-redirect**: To /welcome
- **Manual action**: Click "Enter App" button
- **Mobile responsive**: Yes
- **Animations**: Logo bounce, background pulse

### Welcome Page
- **Hero**: Large welcome message with CTA
- **Features**: 3-4 benefit cards
- **Stats**: Users, trading volume, uptime
- **Footer**: Company links & contact
- **Mobile responsive**: Yes
- **Animations**: Fade-in, slide-in effects

### Chat Page
- **Pi Network integration**: Already authenticated
- **Messages**: Real-time chat
- **Language support**: EN/SW
- **Mobile responsive**: Yes

### Wallet Page
- **Balance display**: Current holdings
- **Quick actions**: Transfer, Deposit, Withdraw
- **Transaction history**: Recent transactions
- **Mobile responsive**: Yes

### Trading/Market
- **Live prices**: BTC, ETH, PI, USDT
- **Buy/Sell interface**: Simple trading
- **Order history**: Past trades
- **Mobile responsive**: Yes

## Design System

### Colors
- **Primary**: Purple (#7c3aed)
- **Secondary**: Indigo (#4f46e5)
- **Text**: White on purple, Gray on white
- **Gradient**: Yellow → White → Purple (on PHCL text)

### Typography
- **Headlines**: Bold, large font
- **Body**: Regular, readable font
- **Small text**: Gray, secondary info

### Spacing
- **Padding**: 4-8 units per section
- **Gaps**: 4-6 units between elements
- **Mobile**: Tighter spacing on small screens

### Animations
- **Splash logo**: bounce-slow (3s)
- **Background**: pulse (2s)
- **Text**: fade-in (1s)
- **Page transitions**: fade, slide-in

## Performance Targets
- Page load time: < 2 seconds
- Smooth animations: 60fps
- Mobile responsive: < 5 seconds
- Auto-redirect: Instant

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

## Accessibility
- Alt text on all images
- Keyboard navigation support
- Screen reader friendly
- High contrast text
- Touch-friendly buttons (44px+ height)

## Next Phase Possibilities
1. User registration/login
2. Authentication with Pi Network
3. Real-time trading dashboard
4. Notification system
5. Advanced analytics
6. Social features
7. Referral program
8. Premium features
