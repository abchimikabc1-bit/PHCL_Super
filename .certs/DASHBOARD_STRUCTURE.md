# PHCL Super Dashboard - 4 Main Folders Organization

## 1. TRADING FOLDER - `/components/trading/`
**Background Color: Light Blue (blue-50)**
Files:
- trading.tsx (Live crypto prices with update button)
- market-stats.tsx (24h change, volume, market cap)
- price-ticker.tsx (Real-time price updates)

## 2. MARKETPLACE FOLDER - `/components/marketplace/`
**Background Color: Light Slate/Gray (slate-50)**
Files:
- shop.tsx (All products with category filters)
- showroom.tsx (Vehicle display - light amber background)
- cart.tsx (Shopping cart - light green background)
- checkout.tsx (Payment processing - light emerald background)
- orders.tsx (Order history - light indigo background)

### Marketplace Sub-categories:
- **Vehicles**: Light amber-50 (warm automotive feel)
- **Construction**: Light orange-50 (building materials)
- **Appliances**: Light cyan-50 (home furniture & electronics)
- **Crypto Products**: Light purple-50 (digital goods)

## 3. GAMES FOLDER - `/components/games/`
**Background Color: Light Green (green-50)**
Files:
- games-hub.tsx (Game selector)
- game-card.tsx (Individual game display)
- leaderboard.tsx (Top players ranking)
- achievements.tsx (Player achievements)

## 4. SETTINGS & PROFILE FOLDER - `/components/account/`
**Background Color: Light Gray (slate-100)**
Files:
- security.tsx (Security settings - light red-50)
- preferences.tsx (Notification preferences)
- team.tsx (Team management)
- policies.tsx (Privacy & policies)
- terms.tsx (Terms & conditions)
- profile.tsx (User profile)

---

## Background Color Scheme

| Section | Light Mode | Dark Mode |
|---------|-----------|----------|
| Trading | blue-50 | gray-800 |
| Marketplace | slate-50 | gray-800 |
| Vehicles | amber-50 | gray-800 |
| Appliances | cyan-50 | gray-800 |
| Games | green-50 | gray-800 |
| Settings | slate-100 | gray-800 |
| Security | red-50 | gray-800 |
| Header | slate-100 | gray-800 |

---

## Header (Consistent Across All Pages)
- Pi Logo (Π) in **Purple (text-purple-600)**
- PHCL Super in **Gold Gradient (from-yellow-400 via-yellow-500 to-amber-500)**
- Light slate-100 background in light mode
- Dark gray-800 background in dark mode
