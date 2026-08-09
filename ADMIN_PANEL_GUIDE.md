# 🔐 PHCL Super - Admin Panel Guide

## 📋 Overview

The PHCL Super Admin Panel provides complete control over your e-commerce platform with authentication, product management, and system configuration.

---

## 🚀 Quick Start

### Access Admin Panel

1. **Go to Admin Login**
   - URL: `http://localhost:3000/admin/login`
   - Or navigate via: `yourdomain.com/admin/login`

2. **Login Credentials** (Development)
   ```
   Email: admin@phclsuper.com
   Password: PHCL_Admin_2026_Secure!
   ```

3. **Dashboard**
   - After login, you'll be redirected to `/admin/dashboard`
   - All admin features accessible from main menu

---

## 🔑 Authentication System

### How It Works
- **Session Management**: 24-hour session duration
- **Storage**: localStorage for session persistence
- **Security**: Password hashing in production
- **Auto-Logout**: Automatic logout after session expires

### Security Features
- ✅ Protected routes (middleware)
- ✅ Session validation
- ✅ Timeout protection
- ✅ Secure credential handling

---

## 📊 Admin Dashboard

### Main Menu Options

#### 1. **📦 Products**
- View all marketplace products
- Add new products
- Edit existing products
- Delete products
- Filter by category
- Search functionality

**Features:**
- Real-time editing
- Multi-field validation
- Bulk operations ready
- Stock management

#### 2. **💱 Currencies**
- Manage 35+ currencies (15+ crypto + 20+ fiat)
- Update exchange rates
- Configure currency display
- Set currency symbols

**Available:**
- BTC, ETH, USDT, PI, XRP, ADA, SOL, DOGE, LINK, MATIC, BCH, LTC, XMR, ZEC, USDC
- USD, EUR, GBP, JPY, CHF, CAD, AUD, SGD, HKD, INR, ZAR, TZS, KES, NGN, ZWL

#### 3. **🌍 Languages**
- Manage 16 language translations
- Edit language packs
- Configure language settings
- RTL language support

**Supported Languages:**
- English, Kiswahili, Chinese, French, Spanish, Arabic, Portuguese, German, Japanese, Korean, Italian, Russian, Hindi, Vietnamese, Thai, Indonesian

#### 4. **📊 Analytics**
- View system statistics
- Track user metrics
- Monitor sales data
- Generate reports

#### 5. **👥 Users**
- Manage user accounts
- View user activity
- Handle user support requests
- Configure user permissions

#### 6. **⚙️ Settings**
- System configuration
- Email settings
- Payment gateway setup
- API configuration

---

## 🎯 Product Management

### Add New Product

```
1. Click "+ Add Product" button
2. Fill in product details:
   - Product Name (required)
   - Category (dropdown)
   - Price in USD (required)
   - Description
   - Seller Name
   - Image URL
   - Rating (1-5)
   - Review Count
   - Stock Status

3. Click "Add Product"
```

### Edit Product

```
1. Find product in list
2. Click "Edit" button
3. Modify fields inline
4. Click "Save"
5. Changes are instant
```

### Delete Product

```
1. Find product in list
2. Click "Delete" button
3. Product is removed immediately
```

### Search & Filter

```
- Search by product name
- Filter by category
- Sort by price/rating
- View stock status
```

---

## 💱 Currency Management

### Update Exchange Rates

```
1. Go to Currencies section
2. Select currency pair
3. Enter new rate
4. Click "Update"
5. Rate applies globally
```

### Add New Currency

```
1. Go to Currencies section
2. Click "+ Add Currency"
3. Enter currency code (e.g., "NEW")
4. Set exchange rate
5. Configure display symbol
6. Click "Add"
```

### Configure Display

- Symbol: e.g., $, €, ₿, Π
- Decimal places: Based on currency type
- Format: Regional settings
- Color coding: For UI display

---

## 🌐 Language Management

### Edit Translations

```
1. Go to Languages section
2. Select language
3. Edit translation strings
4. Save changes
5. Changes reflect instantly
```

### Add New Language

```
1. Click "+ Add Language"
2. Enter language code
3. Upload translation pack
4. Set as active/inactive
5. Configure RTL if needed
```

### Translation Structure

```typescript
{
  "en": {
    "home": "Home",
    "products": "Products",
    ...
  },
  "sw": {
    "home": "Nyumbani",
    "products": "Bidhaa",
    ...
  }
}
```

---

## 📈 Analytics Dashboard

### Key Metrics

- **Total Products**: Current inventory count
- **Total Currencies**: Active currency pairs
- **Languages**: Supported languages
- **System Status**: Health check indicators

### Reports Available

- Sales by category
- Currency conversion trends
- Language usage statistics
- User activity logs
- Payment transaction history

---

## ⚙️ System Settings

### Configuration Options

#### Email Settings
```
- SMTP Host
- SMTP Port
- Sender Email
- Email Templates
```

#### Payment Gateway
```
- Stripe API Keys
- Crypto Payment Gateway
- Webhook URLs
- Currency Pairs
```

#### API Configuration
```
- API Base URL
- API Keys
- Rate Limiting
- CORS Settings
```

#### Security Settings
```
- SSL Certificate
- HSTS Headers
- CSP Policy
- 2FA Configuration
```

---

## 🔒 Security Best Practices

### For Administrators

1. **Change Default Credentials**
   ```
   Change password immediately after first login
   Use strong, unique passwords
   Enable 2FA when available
   ```

2. **Protect Session**
   - Don't share login credentials
   - Log out when finished
   - Clear cookies on shared devices
   - Use secure networks only

3. **Data Security**
   - Regular backups
   - Encrypted sensitive data
   - Audit trails for changes
   - Restricted access levels

4. **API Security**
   - Rotate API keys regularly
   - Monitor API usage
   - Rate limit requests
   - Use HTTPS only

---

## 🐛 Troubleshooting

### Cannot Login

**Issue**: "Invalid email or password"
**Solution**: 
- Verify email is: `admin@phclsuper.com`
- Verify password is: `PHCL_Admin_2026_Secure!`
- Clear browser cache
- Try incognito mode

### Session Expired

**Issue**: Redirected to login after inactivity
**Solution**:
- Session expires after 24 hours
- Log in again
- Keep session active by using the panel

### Changes Not Saving

**Issue**: Product edits not persisting
**Solution**:
- Verify form validation (all required fields filled)
- Check browser console for errors
- Try saving again
- Clear browser cache

### Slow Performance

**Issue**: Admin panel loading slowly
**Solution**:
- Check internet connection
- Reduce number of products loaded
- Clear browser cache
- Use newer browser version

---

## 📱 Mobile Admin Access

### Responsive Design

- Admin panel is mobile-responsive
- All features accessible on tablets
- Touch-friendly interface
- Optimized for small screens

### Best Practices

- Use desktop for bulk operations
- Mobile for quick updates
- Avoid slow connections
- Test on target devices

---

## 🔄 Data Backup

### Backup Your Data

```bash
# Export products
npm run export:products

# Export currencies
npm run export:currencies

# Full backup
npm run backup
```

### Restore Data

```bash
# Import products
npm run import:products <file>

# Import currencies
npm run import:currencies <file>

# Full restore
npm run restore <backup_file>
```

---

## 📞 Support

### Common Issues Documentation
- See `/docs/admin-troubleshooting.md`

### Contact Support
- **Email**: support@phclsuper.com
- **Phone**: +255 (0) 693 863 356
- **Hours**: 24/7

---

## 🎓 Next Steps

### After Initial Setup

1. ✅ Change default admin password
2. ✅ Add your products
3. ✅ Configure currencies
4. ✅ Translate content
5. ✅ Set up payment gateway
6. ✅ Configure email settings
7. ✅ Enable analytics
8. ✅ Set up backups

### Advanced Configuration

- API integration
- Custom webhooks
- Advanced analytics
- Multi-admin users
- Permission levels
- Custom reports

---

## 📊 File Structure

```
Admin System Files:
├── hooks/useAdminAuth.ts           # Authentication hook
├── lib/admin-context.tsx           # Admin context provider
├── components/coming-soon-overlay.tsx  # Loading screen
├── app/admin/
│   ├── layout.tsx                  # Admin layout wrapper
│   ├── login/page.tsx              # Login page
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── products/page.tsx           # Product management
│   ├── currencies/page.tsx         # Currency management
│   ├── languages/page.tsx          # Language management
│   ├── analytics/page.tsx          # Analytics view
│   ├── users/page.tsx              # User management
│   └── settings/page.tsx           # System settings
└── middleware.ts                   # Route protection
```

---

## ✅ Checklist Before Going Live

- [ ] Change default admin password
- [ ] Configure SSL/TLS certificate
- [ ] Set up email notifications
- [ ] Configure payment gateway
- [ ] Test all CRUD operations
- [ ] Verify currency updates
- [ ] Test language switching
- [ ] Set up database backups
- [ ] Configure analytics
- [ ] Enable logging
- [ ] Test on mobile devices
- [ ] Security audit complete

---

**Status**: ✅ Admin Panel Ready  
**Last Updated**: June 15, 2026  
**Version**: 1.0.0

---

*Secure administration panel for PHCL Super*  
*Pi Hub Company Limited (PiHCL) - Tanzania 🇹🇿*
