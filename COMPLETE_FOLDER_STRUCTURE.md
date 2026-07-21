# PHCL Super App - Complete Folder Structure

## Project Organization

### 📁 `/components/marketplace/` - E-Commerce & Business Operations

Core marketplace functionality split into focused modules:

- **`products-data.ts`** - Centralized product database with all crypto products, pricing in 4 currencies (TZS, nTZS, USD, PI)
- **`currency-utils.ts`** - Reusable utility functions:
  - `getProductPrice(product, currency)` - Convert prices between currencies
  - `getCurrencySymbol(currency)` - Get display symbol (₿, $, Π, TSh)
  - `getCurrencyColor(currency)` - Get color styling for each currency

- **`shop.tsx`** - Shop Component
  - Displays product grid with icons and ratings
  - Add to cart functionality
  - Currency selector (TZS, nTZS, USD, PI)
  - Hover animations and responsive layout

- **`cart.tsx`** - Shopping Cart Component
  - Displays cart items with quantities
  - Quantity +/- controls
  - Item removal functionality
  - Real-time total calculation
  - Multi-currency support with color-coded display

- **`trading.tsx`** - Live Trading Component
  - Real-time crypto price display (BTC, ETH, PI, USDT)
  - Buy/Sell/Trade action buttons
  - Price change indicators
  - Grid layout with cryptocurrency data

- **`checkout.tsx`** - Checkout Component
  - Multi-step checkout process (Cart Review → Shipping → Payment)
  - Order summary display
  - Payment method selection
  - Order total calculation

- **`orders.tsx`** - Orders Component
  - Order history with status tracking
  - Status indicators: delivered, in-transit, processing
  - Order details (ID, date, items, amount)
  - Icon display for product types

---

### 📁 `/components/settings/` - Account & Configuration Management

User account settings split into focused modules:

- **`security.tsx`** - Security Component
  - Logout button with gradient styling
  - Security-related actions
  - Passed `isLoggedIn` and `onLogout` props

- **`preferences.tsx`** - Preferences Component
  - Notification toggle checkboxes
  - Email Notifications option
  - Transaction Alerts option
  - Marketing Updates option
  - Dark mode responsive styling

- **`team.tsx`** - Team Management Component
  - Display team members with roles
  - Add Member button
  - Member list with email and role info
  - Delete/Remove member functionality
  - Team collaboration features

- **`policies.tsx`** - Policies Component
  - Expandable policy sections
  - Privacy Policy
  - Terms of Service
  - Refund Policy
  - Security Policy
  - Collapse/expand functionality with icons

- **`terms.tsx`** - Terms & Conditions Component
  - Detailed terms sections (scrollable)
  - User Responsibilities
  - Prohibited Activities
  - Limitation of Liability
  - Modification terms
  - Agreement acknowledgment

---

### 📁 `/app/dashboard/` - Main Application

- **`page.tsx`** - Main Dashboard Component
  - Orchestrates all marketplace and settings components
  - Tab navigation system (Chat, Shop, Wallet, Trading, Marketplace, Orders, Team, Leaders, Games, Analytics, Settings)
  - Authentication system
  - Dark/Light mode toggle
  - Cart state management
  - Currency selection logic
  - Email verification flow
  - Login/Logout functionality

---

## Data Flow Architecture

```
Dashboard (Main Hub)
    ├── Cart State → Shop Component → User selects products
    ├── Cart State → Cart Component → User reviews items
    ├── Cart State → Checkout Component → User completes purchase
    ├── → Orders Component → User views order history
    ├── → Trading Component → User trades crypto
    └── Settings Tab
        ├── → PreferencesSettings → Notifications
        ├── → Team → Team management
        ├── → Policies → Read policies
        ├── → Terms → Accept terms
        └── → SecuritySettings → Logout

All components access shared utilities:
    - currency-utils.ts for price/symbol/color functions
    - products-data.ts for product information
```

---

## Component Integration Points

1. **Shop Component**
   - Input: `darkMode` boolean, `onAddToCart` function
   - Output: Product grid with interactive cards

2. **Cart Component**
   - Input: `cart` array, `cartCurrency`, callback functions
   - Output: Cart display with quantity controls

3. **Trading Component**
   - Input: `darkMode` boolean
   - Output: Trading interface with price data

4. **Checkout Component**
   - Input: `darkMode`, `total`, `currency`
   - Output: Checkout steps interface

5. **Orders Component**
   - Input: `darkMode` boolean
   - Output: Order history display

6. **Settings Components**
   - Input: `darkMode`, auth-related props
   - Output: Settings forms/displays

---

## Key Features

✅ Modular architecture - Each component has single responsibility
✅ Reusable utilities - Currency functions shared across components
✅ Centralized data - Products database in one file
✅ Consistent styling - Tailwind CSS with dark mode support
✅ Type-safe - TypeScript interfaces for all components
✅ Scalable - Easy to add new components or features
✅ Clean imports - Dashboard orchestrates all components
✅ Professional organization - Logical folder structure

---

## Next Steps for Development

- Add backend API integration for products and orders
- Implement real-time crypto price updates
- Add user profile data persistence
- Implement payment gateway integration
- Add multi-language support
- Implement advanced analytics tracking
- Add real-time notifications system
