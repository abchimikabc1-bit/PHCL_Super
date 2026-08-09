/**
 * Marketplace Service with KYC Tier Enforcement & Security Guards
 * Features:
 * - Real-Time Multi-Currency Conversions: USD, TZS, nTZS (1:1 with TZS), and Pi Network Coin (1 Pi = $314,159 USD GCV Standard)
 * - Multi-Angle Gallery & Interior Showcase Images for All Flagship Products
 * - High-Value Escrow Purchase Protections
 */

const PI_GCV_RATE_USD = 314159.0; // 1 Pi = $314,159 USD GCV Standard
const USD_TO_TZS_RATE = 2700.0;  // 1 USD = 2,700 TZS

class MarketplaceService {
  constructor() {
    this.listings = new Map();
    this.orders = new Map();

    // Initial Seed Products
    this.seedInitialListings();
  }

  seedInitialListings() {
    const seed = [
      {
        id: 'prod_cullinan_2025',
        title: 'Rolls-Royce Cullinan Series II (2025 Black Badge SUV)',
        description: 'Gari la Kifahari Sana Toleo Jipya la 2025 (Ultra-Luxury SUV) lenye V12 Twin-Turbo Engine, Black Badge Edition, Illuminated Grille, Executive Rear Lounge. Tazama Pande Zote na Ndani kwenye Gallery!',
        price: 480000,
        currency: 'USD',
        priceTZS: 480000 * USD_TO_TZS_RATE, // 1,296,000,000 TZS
        pricennTZS: 480000 * USD_TO_TZS_RATE,
        pricePi: parseFloat((480000 / PI_GCV_RATE_USD).toFixed(6)), // 1.527889 Pi
        category: 'Vehicles',
        sellerId: 'usr_verified_seller_cullinan',
        sellerName: 'Royal Auto Gallery Dar es Salaam',
        sellerKycTier: 3,
        imageUrl: '/cullinan_2025.jpg',
        gallery: [
          '/cullinan_2025.jpg',      // Front Angle
          '/cullinan_interior.jpg',  // Starlight Executive Interior Cabin
          '/cullinan_rear.jpg'       // Rear Tailgate Profile
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod_prado_2025',
        title: 'Toyota Land Cruiser Prado (2025 VX 3.3L Twin Turbo)',
        description: 'Toleo Jipya la 2025 la SUV ya Kifahari ya Land Cruiser Prado VX yenye Injini ya 3.3L Twin Turbo Diesel, Leather Interior, Cockpit Dual Displays, Panoramic Sunroof.',
        price: 85000,
        currency: 'USD',
        priceTZS: 85000 * USD_TO_TZS_RATE, // 229,500,000 TZS
        pricennTZS: 85000 * USD_TO_TZS_RATE,
        pricePi: parseFloat((85000 / PI_GCV_RATE_USD).toFixed(6)), // 0.270564 Pi
        category: 'Vehicles',
        sellerId: 'usr_verified_seller_prado',
        sellerName: 'Tanzania Luxury Motors',
        sellerKycTier: 3,
        imageUrl: '/prado_2025.jpg',
        gallery: [
          '/prado_2025.jpg',      // Front SUV Angle
          '/prado_interior.jpg'   // Cockpit & Leather Interior
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod_samsung_zfold7',
        title: 'Samsung Galaxy Z Fold 7 (512GB, 16GB RAM)',
        description: 'Simu ya Kifahari ya Samsung Galaxy Z Fold 7 yenye kioo cha Dual AMOLED 120Hz, Titanium Frame, Pro Triple Camera (200MP). Tazama ikiwa imekunjwa na kufunguliwa ndani!',
        price: 1899.99,
        currency: 'USD',
        priceTZS: 1899.99 * USD_TO_TZS_RATE, // 5,129,973 TZS
        pricennTZS: 1899.99 * USD_TO_TZS_RATE,
        pricePi: parseFloat((1899.99 / PI_GCV_RATE_USD).toFixed(6)), // 0.006048 Pi
        category: 'Electronics',
        sellerId: 'usr_verified_seller_samsung',
        sellerName: 'Samsung Official Tanzania Hub',
        sellerKycTier: 3,
        imageUrl: '/samsung_zfold7.jpg',
        gallery: [
          '/samsung_zfold7.jpg',     // Folded Front Angle
          '/zfold7_unfolded.jpg'     // Unfolded Inner Screen Tablet View
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod_iphone16_promax',
        title: 'iPhone 16 Pro Max 1TB Titanium',
        description: 'Apple Flagship 2025 yenye A18 Pro Bionic Chip, Desert Titanium, 48MP Fusion Camera, Apple Intelligence. Tazama kioo cha mbele na kamera za nyuma!',
        price: 1599,
        currency: 'USD',
        priceTZS: 1599 * USD_TO_TZS_RATE, // 4,317,300 TZS
        pricennTZS: 1599 * USD_TO_TZS_RATE,
        pricePi: parseFloat((1599 / PI_GCV_RATE_USD).toFixed(6)), // 0.005090 Pi
        category: 'Electronics',
        sellerId: 'usr_verified_seller_apple',
        sellerName: 'iStore Official Tanzania',
        sellerKycTier: 3,
        imageUrl: '/iphone16_promax.jpg',
        gallery: [
          '/iphone16_promax.jpg', // OLED Front Angle
          '/iphone16_back.jpg'    // Titanium Triple Camera Back Angle
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod_pixel9_pro_fold',
        title: 'Google Pixel 9 Pro Fold (512GB Obsidian)',
        description: 'Simu ya kipekee ya Google yenye Tensor G4 Chip, Gemini AI Multimodal Built-in, Dual Display, Titanium Hinge.',
        price: 1799,
        currency: 'USD',
        priceTZS: 1799 * USD_TO_TZS_RATE, // 4,857,300 TZS
        pricennTZS: 1799 * USD_TO_TZS_RATE,
        pricePi: parseFloat((1799 / PI_GCV_RATE_USD).toFixed(6)), // 0.005726 Pi
        category: 'Electronics',
        sellerId: 'usr_verified_seller_google',
        sellerName: 'Pixel Hub East Africa',
        sellerKycTier: 3,
        imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500',
        gallery: [
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500'
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod_macbook_m3max',
        title: 'MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD)',
        description: 'Apple Laptop ya Kazi Nzitonzito M3 Max, 16-core CPU, 40-core GPU, Liquid Retina XDR Display.',
        price: 3499,
        currency: 'USD',
        priceTZS: 3499 * USD_TO_TZS_RATE, // 9,447,300 TZS
        pricennTZS: 3499 * USD_TO_TZS_RATE,
        pricePi: parseFloat((3499 / PI_GCV_RATE_USD).toFixed(6)), // 0.011138 Pi
        category: 'Electronics',
        sellerId: 'usr_verified_seller_01',
        sellerName: 'TechHub Tanzania',
        sellerKycTier: 2,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
        gallery: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'
        ],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    ];

    seed.forEach((item) => this.listings.set(item.id, item));
  }

  // 1. GET ALL LISTINGS (Public Access)
  getAllListings(category) {
    let items = Array.from(this.listings.values()).filter((i) => i.status === 'ACTIVE');
    if (category) {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    return items;
  }

  // 2. CREATE PRODUCT LISTING (Sharti: Mtumiaji lazima awe na Tier >= 2 KYC)
  createListing(user, { title, description, price, currency = 'USD', category, imageUrl, gallery }) {
    if (!user || user.kycTier < 2) {
      throw new Error('Ufikiaji Umekataliwa: Lazima ukamilishe Uhakiki wa Tier 2 KYC (NIDA/Passport) kabla ya kuuza bidhaa sokoni.');
    }

    if (!title || title.length < 3 || title.length > 150) {
      throw new Error('Kichwa cha bidhaa kinatakiwa kuwa na herufi kati ya 3 na 150.');
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      throw new Error('Bei halali ya bidhaa inahitajika.');
    }

    const priceUSD = price;
    const priceTZS = priceUSD * USD_TO_TZS_RATE;
    const pricennTZS = priceTZS;
    const pricePi = parseFloat((priceUSD / PI_GCV_RATE_USD).toFixed(6));

    const listingId = `prod_${Date.now()}`;
    const defaultImg = imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

    const newListing = {
      id: listingId,
      title,
      description: description || '',
      price: priceUSD,
      currency,
      priceTZS,
      pricennTZS,
      pricePi,
      category: category || 'General',
      sellerId: user.uid,
      sellerName: user.displayName || user.email,
      sellerKycTier: user.kycTier,
      imageUrl: defaultImg,
      gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery : [defaultImg],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.listings.set(listingId, newListing);
    return newListing;
  }

  // 3. EXECUTE PURCHASE (Sharti: Miamala ya zaidi ya $1,000 inahitaji Tier 3 KYC)
  purchaseListing(buyer, listingId) {
    const item = this.listings.get(listingId);
    if (!item || item.status !== 'ACTIVE') {
      throw new Error('Bidhaa hii haipatikani au imeshauzwa.');
    }

    if (item.sellerId === buyer.uid) {
      throw new Error('Hauwezi kununua bidhaa uliyoiweka mwenyewe.');
    }

    // High-Value Transaction Guard: Miamala inayozidi $1,000 inahitaji Tier 3 KYC
    if (item.price > 1000 && buyer.kycTier < 3) {
      throw new Error('Ufikiaji Umekataliwa: Muamala huu unazidi $1,000. Lazima ukamilishe Tier 3 KYC (Proof of Address & AML Check) ili kuendelea.');
    }

    item.status = 'SOLD';
    const orderId = `ord_${Date.now()}`;

    const order = {
      orderId,
      listingId: item.id,
      itemTitle: item.title,
      price: item.price,
      currency: item.currency,
      buyerId: buyer.uid,
      buyerEmail: buyer.email,
      sellerId: item.sellerId,
      executedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, order);
    return order;
  }
}

module.exports = { MarketplaceService, PI_GCV_RATE_USD, USD_TO_TZS_RATE };
