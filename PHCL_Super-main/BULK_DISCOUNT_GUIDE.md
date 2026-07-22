# PHCL Bulk Purchase Discount System

## Overview
The 10% bulk discount system is fully integrated into PHCL and automatically applies when customers purchase 3+ items.

## How It Works

### Automatic Application
- **Threshold**: 3 or more items
- **Discount**: 10% off total purchase price
- **Code**: BULK10 (optional - discount applies automatically)
- **No expiry**: Always available
- **Unlimited uses**: Applies to all customers

### Where Users See It

#### 1. Welcome Page (Before Registration)
- **Location**: `/welcome` → Promotional Offers Section
- **Display**: Shows BULK10 code with 10% discount amount
- **Action**: Users can copy code before signup
- **File**: `/app/welcome/page.tsx`

#### 2. Marketplace Page (After Entry)
- **Location**: `/marketplace` → Bulk Discount Calculator
- **Display**: Interactive calculator showing:
  - Add items → see 10% savings immediately
  - Quick select buttons (3, 5, 10, 20 items)
  - Exact savings amount
- **File**: `/components/bulk-discount-calculator.tsx`

#### 3. Shopping Cart (During Purchase)
- **Location**: Shopping cart view
- **Display**: Auto-detects 3+ items and shows:
  - 10% discount applied
  - Original price
  - Discounted price
  - Savings amount
- **File**: `/components/shopping-cart.tsx`

#### 4. Wallet Dashboard (Registered Users)
- **Location**: `/wallet` → Special Offers & Discounts
- **Display**: Available promotions with:
  - BULK10 code details
  - How to qualify (3+ items)
  - Apply button
- **File**: `/components/promo-dashboard.tsx`

#### 5. Admin Panel (Manage Promotions)
- **Location**: `/admin` → Promos tab
- **Features**:
  - View BULK10 statistics
  - Edit discount percentage
  - Change minimum quantity threshold
  - Track usage (1240+ uses)
- **File**: `/components/admin-promo-panel.tsx`

## Technical Implementation

### Data Structure
```typescript
{
  id: "promo_bulk10",
  code: "BULK10",
  type: "bulk",
  discount: 10,
  description: "10% discount on bulk purchases of 3+ items",
  minQuantity: 3,
  bulkThreshold: 3,
  maxUses: null,
  usedCount: 1240,
  expiryDate: "2025-12-31",
  status: "active"
}
```

### Validation Logic
- Checks if order quantity >= bulkThreshold
- Applies discount percentage to subtotal
- Prevents double-discounting with other promos
- Calculates final price with tax

### Calculation Example
- 5 items @ $100 each = $500
- Apply 10% bulk discount = $500 × 0.90 = $450
- Savings: $50

## Multi-Language Support
All bulk discount messaging is available in 10 languages:
- English, Swahili, Chinese, French, Spanish, Arabic, Portuguese, German, Japanese, Korean

## Key Features
✓ Automatic application (no code entry required)
✓ Real-time calculator on marketplace
✓ Pre-registration visibility
✓ Post-registration tracking
✓ Admin management tools
✓ Bilingual interface (10 languages)
✓ Mobile responsive
✓ No expiry date
✓ Unlimited uses
✓ Complete audit trail

## Files Involved
- `/lib/promo-system.ts` - Core logic
- `/components/bulk-discount-calculator.tsx` - Interactive calculator
- `/components/shopping-cart.tsx` - Cart with auto-discount
- `/components/promo-dashboard.tsx` - User dashboard
- `/components/admin-promo-panel.tsx` - Admin management
- `/app/welcome/page.tsx` - Pre-registration display
- `/app/marketplace/page.tsx` - Marketplace integration
- `/app/wallet/page.tsx` - Post-registration display
- `/app/admin/page.tsx` - Admin interface
