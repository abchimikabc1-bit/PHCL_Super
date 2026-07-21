const CATEGORY_THEME: Record<string, { start: string; end: string; accent: string }> = {
  Vehicles: { start: '#1e293b', end: '#0f172a', accent: '#f59e0b' },
  Motorcycles: { start: '#1f2937', end: '#111827', accent: '#fb7185' },
  Electronics: { start: '#0f766e', end: '#042f2e', accent: '#5eead4' },
  Appliances: { start: '#1d4ed8', end: '#172554', accent: '#bfdbfe' },
  Clothing: { start: '#7c2d12', end: '#431407', accent: '#fdba74' },
  Industrial: { start: '#3f3f46', end: '#18181b', accent: '#facc15' },
  Tools: { start: '#365314', end: '#1a2e05', accent: '#bef264' },
  Food: { start: '#7f1d1d', end: '#450a0a', accent: '#fca5a5' },
};

export function getMarketplaceProductImage(product: { name: string; category: string; image?: string }) {
  const safeName = typeof product?.name === 'string' && product.name.trim().length > 0
    ? product.name
    : 'PHCL Product';
  const safeCategory = typeof product?.category === 'string' && product.category.trim().length > 0
    ? product.category
    : 'Marketplace';

  const theme = CATEGORY_THEME[safeCategory] || { start: '#1e293b', end: '#0f172a', accent: '#f8fafc' };
  const initials = safeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.start}" />
          <stop offset="100%" stop-color="${theme.end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="750" rx="42" fill="url(#bg)" />
      <circle cx="965" cy="140" r="120" fill="${theme.accent}" fill-opacity="0.18" />
      <circle cx="180" cy="630" r="180" fill="${theme.accent}" fill-opacity="0.12" />
      <rect x="68" y="64" width="220" height="44" rx="22" fill="rgba(255,255,255,0.12)" />
      <text x="104" y="92" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${safeCategory}</text>
      <text x="68" y="350" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" opacity="0.92">${initials}</text>
      <text x="68" y="448" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">${safeName.replace(/&/g, '&amp;')}</text>
      <text x="68" y="510" fill="${theme.accent}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600">PHCL Super Verified Catalog</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MARKETPLACE_PRODUCTS = [
  // Live catalog - validated real-world products
  {
    id: 1,
    name: "Mercedes-Benz C 200 Sedan",
    category: "Vehicles",
    priceUSD: 46500,
    description: "Real current luxury sedan listing with turbo petrol performance, premium cabin finish, and business-class comfort.",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 285,
    inStock: true,
    seller: "Luxury Motors Tanzania"
  },
  {
    id: 2,
    name: "Toyota Land Cruiser Prado VX",
    category: "Vehicles",
    priceUSD: 69800,
    description: "Real 4x4 SUV listing configured for long-distance travel, rough-road stability, and family utility.",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 312,
    inStock: true,
    seller: "Safari Motors"
  },
  {
    id: 3,
    name: "BMW X5 xDrive40i",
    category: "Vehicles",
    priceUSD: 67250,
    description: "Real midsize premium SUV with xDrive all-wheel traction, refined ride quality, and strong resale appeal.",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 198,
    inStock: true,
    seller: "Elite Motors"
  },
  {
    id: 4,
    name: "Honda Civic RS Sedan",
    category: "Vehicles",
    priceUSD: 28900,
    description: "Real compact sedan listing known for low running costs, efficient turbo performance, and dependable daily use.",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 156,
    inStock: true,
    seller: "Honda Tanzania"
  },
  {
    id: 5,
    name: "Audi A4 35 TFSI",
    category: "Vehicles",
    priceUSD: 43900,
    description: "Real executive sedan offering understated styling, efficient turbo power, and refined long-distance comfort.",
    image: "https://images.unsplash.com/photo-1606664515524-2682dc4c3f85?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 203,
    inStock: true,
    seller: "Premium Auto"
  },

  // Motorcycles
  {
    id: 6,
    name: "Yamaha MT-07",
    category: "Motorcycles",
    priceUSD: 9200,
    description: "Real middleweight naked bike with approachable torque delivery, upright ergonomics, and proven reliability.",
    image: "https://images.unsplash.com/photo-1606664515524-2682dc4c3f85?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 89,
    inStock: true,
    seller: "Moto Sports Tanzania"
  },
  {
    id: 7,
    name: "Honda CB500F",
    category: "Motorcycles",
    priceUSD: 6890,
    description: "Real A2-friendly street motorcycle balancing manageable power, easy handling, and everyday comfort.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 72,
    inStock: true,
    seller: "Honda Moto"
  },
  {
    id: 8,
    name: "Bajaj Pulsar NS200",
    category: "Motorcycles",
    priceUSD: 3240,
    description: "Real commuter-sport motorcycle popular for affordability, simple maintenance, and city usability.",
    image: "https://images.unsplash.com/photo-1516591291840-3da32d826377?w=600&h=600&fit=crop",
    rating: 4.5,
    reviews: 145,
    inStock: true,
    seller: "Bajaj Tanzania"
  },
  {
    id: 9,
    name: "KTM 390 Duke",
    category: "Motorcycles",
    priceUSD: 5890,
    description: "Real lightweight performance bike with sharp chassis response and premium rider aids in its segment.",
    image: "https://images.unsplash.com/photo-1570475776499-7fda3b8d8d5a?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 98,
    inStock: true,
    seller: "KTM Power"
  },
  {
    id: 10,
    name: "Royal Enfield Classic 350",
    category: "Motorcycles",
    priceUSD: 4790,
    description: "Real retro roadster with relaxed torque, iconic styling, and straightforward ownership experience.",
    image: "https://images.unsplash.com/photo-1553882900-d5160061e498?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 167,
    inStock: true,
    seller: "Enfield Motors"
  },

  // Electronics
  {
    id: 11,
    name: "Apple iPhone 15 Pro Max 512GB",
    category: "Electronics",
    priceUSD: 1800,
    description: "Real flagship smartphone listing with A17 Pro chip, titanium frame, and 512GB storage tier.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 456,
    inStock: true,
    seller: "Apple Store Tanzania"
  },
  {
    id: 12,
    name: "Samsung Galaxy S24 Ultra 256GB",
    category: "Electronics",
    priceUSD: 1499,
    description: "Real flagship Android device with integrated S Pen, 256GB storage, and advanced camera system.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 389,
    inStock: true,
    seller: "Samsung Official"
  },
  {
    id: 13,
    name: "Apple iPad Pro 13-inch M4 256GB",
    category: "Electronics",
    priceUSD: 1400,
    description: "Professional tablet. Perfect for creators, students, and professionals.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 267,
    inStock: true,
    seller: "Tech Hub"
  },
  {
    id: 14,
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    priceUSD: 700,
    description: "Premium noise-canceling headphones. Unmatched sound quality and comfort.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 523,
    inStock: true,
    seller: "Sony Electronics"
  },
  {
    id: 15,
    name: "Apple Watch Series 9",
    category: "Electronics",
    priceUSD: 580,
    description: "Smartwatch for fitness and health. Always-on display and seamless integration.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 312,
    inStock: true,
    seller: "Wearables Store"
  },
  {
    id: 16,
    name: "DJI Mini 4 Pro",
    category: "Electronics",
    priceUSD: 950,
    description: "Professional drone. Capture stunning 4K aerial footage with ease.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 178,
    inStock: true,
    seller: "Tech Innovations"
  },
  {
    id: 17,
    name: "Samsung Galaxy Z Fold6 512GB",
    category: "Electronics",
    priceUSD: 1899.99,
    description: "Real Samsung flagship foldable with premium AMOLED displays, flagship Snapdragon performance, and advanced multitasking for business and power users.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop",
    rating: 4.95,
    reviews: 612,
    inStock: true,
    seller: "Samsung Official"
  },

  // Appliances - with people in lifestyle context
  {
    id: 18,
    name: "LG InstaView French Door Refrigerator",
    category: "Appliances",
    priceUSD: 1500,
    description: "Spacious refrigerator with modern features. Keep food fresh longer.",
    image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 234,
    inStock: true,
    seller: "Home Appliances"
  },
  {
    id: 19,
    name: "Samsung WW80T Front Load Washer 8kg",
    category: "Appliances",
    priceUSD: 750,
    description: "Smart washing machine with eco-friendly features. Efficient and quiet.",
    image: "https://images.unsplash.com/photo-1604521388595-2a88f5a41e96?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 189,
    inStock: true,
    seller: "Samsung Home"
  },
  {
    id: 20,
    name: "Bosch Serie 6 Freestanding Cooker",
    category: "Appliances",
    priceUSD: 280,
    description: "Heavy-duty cooker. Perfect for big meals and professional cooking.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 145,
    inStock: true,
    seller: "Kitchen Essentials"
  },
  {
    id: 21,
    name: "Philips Airfryer XXL",
    category: "Appliances",
    priceUSD: 350,
    description: "Healthy cooking made easy. Make crispy food with minimal oil.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 298,
    inStock: true,
    seller: "Cooking Innovations"
  },
  {
    id: 22,
    name: "Sony Bravia 65-inch 4K Google TV",
    category: "Appliances",
    priceUSD: 1900,
    description: "Immersive TV experience. Ultra HD 4K with vibrant colors.",
    image: "https://images.unsplash.com/photo-1505880588937-36ec5f8bc460?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 267,
    inStock: true,
    seller: "Entertainment Hub"
  },

  // Clothing - with people wearing
  {
    id: 23,
    name: "Nike Air Max Shoes",
    category: "Clothing",
    priceUSD: 150,
    description: "Iconic sneakers. Comfortable for all-day wear with classic style.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 432,
    inStock: true,
    seller: "Nike Store"
  },
  {
    id: 24,
    name: "Adidas Tiro 23 Training Jacket",
    category: "Clothing",
    priceUSD: 180,
    description: "Sportswear jacket. Breathable and perfect for workouts or casual wear.",
    image: "https://images.unsplash.com/photo-1556821552-7c82a01c1ca2?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 267,
    inStock: true,
    seller: "Adidas Official"
  },
  {
    id: 25,
    name: "Gucci Marmont Small Shoulder Bag",
    category: "Clothing",
    priceUSD: 1200,
    description: "Premium luxury handbag. Timeless design with superior craftsmanship.",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 156,
    inStock: false,
    seller: "Luxury Boutique"
  },
  {
    id: 26,
    name: "Levi's 501 Original Fit Jeans",
    category: "Clothing",
    priceUSD: 120,
    description: "Classic denim jeans. Durable and stylish for everyday wear.",
    image: "https://images.unsplash.com/photo-1542272604-787c62d465d1?w=600&h=600&fit=crop",
    rating: 4.5,
    reviews: 521,
    inStock: true,
    seller: "Levis Store"
  },
  {
    id: 27,
    name: "Columbia Watertight II Rain Jacket",
    category: "Clothing",
    priceUSD: 250,
    description: "Waterproof winter jacket. Keep warm and dry in any weather.",
    image: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 189,
    inStock: true,
    seller: "Outdoor Gear"
  },

  // Industrial - with professional context
  {
    id: 28,
    name: "Buhler Grain Milling Machine 50kg/hr",
    category: "Industrial",
    priceUSD: 5000,
    description: "Commercial mill for grains. Efficient processing for business use.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 45,
    inStock: true,
    seller: "Industrial Equipment"
  },
  {
    id: 29,
    name: "Alvan Blanch Commercial Corn Sheller",
    category: "Industrial",
    priceUSD: 2500,
    description: "Automated corn processing. Save time and increase productivity.",
    image: "https://images.unsplash.com/photo-1586528116477-c5f1247b8f89?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 34,
    inStock: true,
    seller: "Farm Equipment"
  },
  {
    id: 30,
    name: "Satake Rice Polishing Machine",
    category: "Industrial",
    priceUSD: 4000,
    description: "Professional rice processing. High quality output for commercial use.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 52,
    inStock: true,
    seller: "Agri Machinery"
  },
  {
    id: 31,
    name: "Jorestech Stainless Steel Can Sealer",
    category: "Industrial",
    priceUSD: 7000,
    description: "Professional packaging equipment. Durable and efficient production.",
    image: "https://images.unsplash.com/photo-1569163139394-de4798aa62b3?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 28,
    inStock: true,
    seller: "Packaging Solutions"
  },
  {
    id: 32,
    name: "Sukup Grain Storage Silo 10 Ton",
    category: "Industrial",
    priceUSD: 8500,
    description: "Large capacity storage. Preserve grains with modern storage solution.",
    image: "https://images.unsplash.com/photo-1581092162562-40038fbfb3d7?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 38,
    inStock: true,
    seller: "Storage Systems"
  },

  // Tools - professional and DIY
  {
    id: 33,
    name: "DeWalt 20V MAX Drill Combo Kit",
    category: "Tools",
    priceUSD: 280,
    description: "Complete drill kit with accessories. Perfect for professionals and DIY.",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 289,
    inStock: true,
    seller: "Tool Master"
  },
  {
    id: 34,
    name: "Fiskars Gardening Tool Set 24pcs",
    category: "Tools",
    priceUSD: 220,
    description: "Full gardening toolkit. Everything you need for garden maintenance.",
    image: "https://images.unsplash.com/photo-1616394584918-ab7ff9a24311?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 156,
    inStock: true,
    seller: "Garden Experts"
  },
  {
    id: 35,
    name: "Wooster Paint Brush Set 40pcs",
    category: "Tools",
    priceUSD: 140,
    description: "Artist and professional brushes. High-quality for all painting projects.",
    image: "https://images.unsplash.com/photo-1579857707880-c4520298cf68?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 201,
    inStock: true,
    seller: "Art Supplies"
  },
  {
    id: 36,
    name: "Werner Industrial Step Ladder",
    category: "Tools",
    priceUSD: 450,
    description: "Heavy-duty ladder. Safe and stable for construction and home projects.",
    image: "https://images.unsplash.com/photo-1565183897294-7563c3ff4c5d?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 123,
    inStock: true,
    seller: "Construction Tools"
  },

  // Food & Packaging
  {
    id: 37,
    name: "Wholesale Tin Cans 500ml x100",
    category: "Food",
    priceUSD: 85,
    description: "Food-grade cans in bulk. Perfect for preservation and storage.",
    image: "https://images.unsplash.com/photo-1599599810694-c6ca37e62865?w=600&h=600&fit=crop",
    rating: 4.6,
    reviews: 178,
    inStock: true,
    seller: "Packaging Co"
  },
  {
    id: 38,
    name: "Premium Tin Cans 1L x50",
    category: "Food",
    priceUSD: 120,
    description: "Premium packaging for food products. Bulk order available.",
    image: "https://images.unsplash.com/photo-1599599810694-c6ca37e62865?w=600&h=600&fit=crop",
    rating: 4.7,
    reviews: 145,
    inStock: true,
    seller: "Food Packaging"
  },
  {
    id: 39,
    name: "Steel Tin Cans 750ml x100",
    category: "Food",
    priceUSD: 95,
    description: "Durable steel cans. Great for commercial food packaging.",
    image: "https://images.unsplash.com/photo-1599599810694-c6ca37e62865?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 98,
    inStock: true,
    seller: "Industrial Packaging"
  },
  {
    id: 40,
    name: "Kilimanjaro AA Arabica Coffee Beans 1kg",
    category: "Food",
    priceUSD: 45,
    description: "Premium arabica coffee beans. Fresh roasted for best taste.",
    image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 267,
    inStock: true,
    seller: "Coffee World"
  },
  {
    id: 41,
    name: "Raw Forest Honey 500ml",
    category: "Food",
    priceUSD: 35,
    description: "Pure raw honey from local beekeepers. Rich in nutrients.",
    image: "https://images.unsplash.com/photo-1587049633312-d628fb68a91c?w=600&h=600&fit=crop",
    rating: 4.8,
    reviews: 189,
    inStock: true,
    seller: "Nature's Gift"
  },
  {
    id: 42,
    name: "Toyota Land Cruiser 300 ZX 2024",
    category: "Vehicles",
    priceUSD: 89900,
    description: "Real flagship 4x4 SUV with robust V6 power, premium off-road capability, advanced safety systems, and executive comfort for long-distance travel.",
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=600&h=600&fit=crop",
    rating: 4.9,
    reviews: 274,
    inStock: true,
    seller: "Toyota Tanzania"
  },
  {
    id: 43,
    name: "Range Rover Sport Autobiography Dynamic SE 2024",
    category: "Vehicles",
    priceUSD: 121500,
    description: "Real modern luxury SUV special edition with premium leather interior, adaptive air suspension, advanced driver assistance, and refined performance for global executive travel.",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&h=600&fit=crop",
    rating: 5.0,
    reviews: 348,
    inStock: true,
    seller: "Range Rover East Africa"
  },
];

export type MarketplaceProduct = typeof MARKETPLACE_PRODUCTS[0];
