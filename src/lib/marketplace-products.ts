export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  priceUSD: number;
  rating: number;
  seller: string;
  image?: string;
}

export const MARKETPLACE_PRODUCTS: Product[] = [
  // Vehicles
  { id: 1, name: 'Sedan Car', description: 'Compact sedan for city driving.', category: 'Vehicles', priceUSD: 20000, rating: 4.5, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=Sedan+Car' },
  { id: 2, name: 'SUV', description: 'Spacious SUV with off‑road capability.', category: 'Vehicles', priceUSD: 35000, rating: 4.7, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=SUV' },
  { id: 3, name: 'Pickup Truck', description: 'Heavy‑duty pickup for work and play.', category: 'Vehicles', priceUSD: 28000, rating: 4.6, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=Pickup+Truck' },
  // Motorcycles
  { id: 4, name: 'Sport Bike', description: 'High‑performance sport motorcycle.', category: 'Motorcycles', priceUSD: 15000, rating: 4.4, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Sport+Bike' },
  { id: 5, name: 'Cruiser', description: 'Comfortable cruiser for long rides.', category: 'Motorcycles', priceUSD: 12000, rating: 4.5, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Cruiser' },
  { id: 6, name: 'Electric Scooter', description: 'Eco‑friendly urban scooter.', category: 'Motorcycles', priceUSD: 800, rating: 4.3, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Electric+Scooter' },
  // Electronics
  { id: 7, name: 'Smartphone X', description: 'Flagship smartphone with AI camera.', category: 'Electronics', priceUSD: 999, rating: 4.8, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Smartphone+X' },
  { id: 8, name: '4K OLED TV', description: '55" OLED TV with HDR.', category: 'Electronics', priceUSD: 1499, rating: 4.7, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=4K+OLED+TV' },
  { id: 9, name: 'Wireless Headphones', description: 'Noise‑cancelling over‑ear headphones.', category: 'Electronics', priceUSD: 199, rating: 4.6, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Wireless+Headphones' },
  // Flagship devices (new)
  { id: 44, name: 'Apple iPhone 15 Pro Max 512GB', description: 'Real flagship smartphone listing with A17 Pro chip, titanium frame, and 512GB storage tier.', category: 'Electronics', priceUSD: 1800, rating: 4.9, seller: 'Apple Store Tanzania', image: 'https://via.placeholder.com/400x300?text=iPhone+15+Pro+Max' },
  { id: 45, name: 'Samsung Galaxy S24 Ultra 256GB', description: 'Real flagship Android device with integrated S Pen, 256GB storage, and advanced camera system.', category: 'Electronics', priceUSD: 1499, rating: 4.8, seller: 'Samsung Official', image: 'https://via.placeholder.com/400x300?text=Galaxy+S24+Ultra' },
  { id: 46, name: 'Apple iPad Pro 13-inch M4 256GB', description: 'Professional tablet. Perfect for creators, students, and professionals.', category: 'Electronics', priceUSD: 1400, rating: 4.7, seller: 'Tech Hub', image: 'https://via.placeholder.com/400x300?text=iPad+Pro+13' },
  { id: 47, name: 'Sony WH-1000XM5 Headphones', description: 'Premium noise-canceling headphones. Unmatched sound quality and comfort.', category: 'Electronics', priceUSD: 399, rating: 4.9, seller: 'Sony Official', image: 'https://via.placeholder.com/400x300?text=WH-1000XM5' },
  // Appliances
  { id: 10, name: 'Smart Refrigerator', description: 'Connected fridge with touch screen.', category: 'Appliances', priceUSD: 2200, rating: 4.5, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Smart+Refrigerator' },
  { id: 11, name: 'Washing Machine', description: 'Front‑load washer with AI cycles.', category: 'Appliances', priceUSD: 1100, rating: 4.4, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Washing+Machine' },
  { id: 12, name: 'Microwave Oven', description: 'Convection microwave with grill.', category: 'Appliances', priceUSD: 250, rating: 4.3, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Microwave+Oven' },
  // Clothing
  { id: 13, name: 'Denim Jeans', description: 'Classic straight‑fit denim.', category: 'Clothing', priceUSD: 60, rating: 4.6, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Denim+Jeans' },
  { id: 14, name: 'Leather Jacket', description: 'Premium leather biker jacket.', category: 'Clothing', priceUSD: 250, rating: 4.8, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Leather+Jacket' },
  { id: 15, name: 'Sports T‑Shirt', description: 'Breathable performance tee.', category: 'Clothing', priceUSD: 35, rating: 4.5, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Sports+T‑Shirt' },
  // Industrial
  { id: 16, name: 'Industrial Drill', description: 'Heavy‑duty cordless drill.', category: 'Industrial', priceUSD: 180, rating: 4.4, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Industrial+Drill' },
  { id: 17, name: 'Hydraulic Press', description: 'Compact hydraulic press for metal shaping.', category: 'Industrial', priceUSD: 1200, rating: 4.5, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Hydraulic+Press' },
  { id: 18, name: 'Welding Machine', description: 'MIG/TIG welding unit.', category: 'Industrial', priceUSD: 950, rating: 4.6, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Welding+Machine' },
  // Tools
  { id: 19, name: 'Electric Screwdriver', description: 'Rechargeable screwdriver set.', category: 'Tools', priceUSD: 80, rating: 4.5, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Electric+Screwdriver' },
  { id: 20, name: 'Laser Measure', description: 'Accurate laser distance measurer.', category: 'Tools', priceUSD: 120, rating: 4.7, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Laser+Measure' },
  { id: 21, name: 'Portable Generator', description: '5kW portable power generator.', category: 'Tools', priceUSD: 420, rating: 4.4, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Portable+Generator' },
  // Food
  { id: 22, name: 'Organic Coffee Beans', description: 'Premium Arabica beans, 1kg.', category: 'Food', priceUSD: 30, rating: 4.9, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Organic+Coffee+Beans' },
  { id: 23, name: 'Artisanal Chocolate', description: 'Dark chocolate bar, 100g.', category: 'Food', priceUSD: 8, rating: 4.8, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Artisanal+Chocolate' },
  { id: 24, name: 'Protein Powder', description: 'Vanilla whey protein, 2kg.', category: 'Food', priceUSD: 55, rating: 4.7, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Protein+Powder' },
  // Additional Vehicles
  { id: 48, name: 'Compact Hatchback', description: 'Fuel‑efficient compact hatchback.', category: 'Vehicles', priceUSD: 15000, rating: 4.4, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=Compact+Hatchback' },
  // Additional Food
  { id: 49, name: 'Organic Honey', description: 'Pure raw honey, 500 g.', category: 'Food', priceUSD: 15, rating: 4.8, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Organic+Honey' },
  // Mixed items
  { id: 31, name: 'Gaming Laptop Pro', description: '15" RTX‑3080 gaming laptop.', category: 'Electronics', priceUSD: 2200, rating: 4.7, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Gaming+Laptop+Pro' },
  { id: 32, name: '4‑Door Refrigerator', description: 'Large capacity fridge with frost‑free technology.', category: 'Appliances', priceUSD: 1800, rating: 4.5, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=4‑Door+Refrigerator' },
  { id: 33, name: 'Leather Boots', description: 'Hand‑stitched leather boots.', category: 'Clothing', priceUSD: 120, rating: 4.6, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Leather+Boots' },
  { id: 34, name: 'Heavy‑Duty Hammer', description: '16 oz steel hammer for construction.', category: 'Tools', priceUSD: 25, rating: 4.4, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Heavy‑Duty+Hammer' },
  { id: 35, name: 'Industrial Safety Gloves', description: 'Cut‑resistant gloves.', category: 'Industrial', priceUSD: 15, rating: 4.5, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Safety+Gloves' },
  { id: 36, name: 'Motorbike Helmet', description: 'Full‑face safety helmet.', category: 'Motorcycles', priceUSD: 80, rating: 4.6, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Motorbike+Helmet' },
  { id: 37, name: 'Electric Kettle', description: 'Fast‑boil smart kettle.', category: 'Appliances', priceUSD: 45, rating: 4.5, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Electric+Kettle' },
  { id: 38, name: 'Bluetooth Speaker', description: 'Portable waterproof speaker.', category: 'Electronics', priceUSD: 60, rating: 4.7, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Bluetooth+Speaker' },
  { id: 39, name: 'Running Shoes', description: 'Lightweight breathable shoes.', category: 'Clothing', priceUSD: 70, rating: 4.6, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Running+Shoes' },
  { id: 40, name: 'Solar Panel 300W', description: 'High‑efficiency monocrystalline panel.', category: 'Industrial', priceUSD: 250, rating: 4.8, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Solar+Panel+300W' },
  { id: 41, name: 'Smartwatch X2', description: 'Health tracking smartwatch.', category: 'Electronics', priceUSD: 199, rating: 4.5, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Smartwatch+X2' },
  { id: 42, name: 'Chef Knife Set', description: 'Professional 7‑piece kitchen knives.', category: 'Tools', priceUSD: 120, rating: 4.7, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Chef+Knife+Set' },
  { id: 43, name: 'Organic Olive Oil', description: 'Extra virgin olive oil, 500 ml.', category: 'Food', priceUSD: 22, rating: 4.9, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Organic+Olive+Oil' }
  // L‑Prefixed Products (new)
  { id: 50, name: 'Luxe Sedan', description: 'Premium luxury sedan with leather interior.', category: 'Vehicles', priceUSD: 60000, rating: 4.9, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=Luxe+Sedan' },
  { id: 51, name: 'LED TV Ultra', description: '65" 8K OLED TV with HDR10+', category: 'Electronics', priceUSD: 3500, rating: 4.8, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=LED+TV+Ultra' },
  { id: 52, name: 'Lawn Mower', description: 'Electric cordless lawn mower, battery‑powered.', category: 'Tools', priceUSD: 200, rating: 4.6, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Lawn+Mower' },
  { id: 53, name: 'Lemon Tart', description: 'Gourmet lemon tart, 250 g.', category: 'Food', priceUSD: 12, rating: 4.7, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Lemon+Tart' },
  { id: 100, name: 'Luxury Sports Car', description: 'High‑performance luxury sports car with sleek design.', category: 'Vehicles', priceUSD: 120000, rating: 4.9, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Luxury+Sports+Car' },
  { id: 101, name: 'Super Coupe', description: 'Exclusive super coupe with premium interior.', category: 'Vehicles', priceUSD: 95000, rating: 4.8, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Super+Coupe' },
  { id: 102, name: 'Electric Hypercar', description: 'Fast electric hypercar with cutting‑edge tech.', category: 'Vehicles', priceUSD: 200000, rating: 5.0, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Electric+Hypercar' },
  { id: 103, name: 'Luxury SUV', description: 'Spacious luxury SUV with advanced features.', category: 'Vehicles', priceUSD: 85000, rating: 4.7, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Luxury+SUV' },
  { id: 104, name: 'Classic Vintage Car', description: 'Restored classic vintage luxury car.', category: 'Vehicles', priceUSD: 75000, rating: 4.6, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Classic+Vintage+Car' },
  { id: 105, name: 'Economy Hatchback', description: 'Affordable compact hatchback.', category: 'Vehicles', priceUSD: 15000, rating: 4.2, seller: 'PHCL Super Vehicles', image: 'https://via.placeholder.com/400x300?text=Economy+Hatchback' },
  { id: 106, name: 'Luxury Convertible', description: 'Premium convertible with leather interior.', category: 'Vehicles', priceUSD: 75000, rating: 4.7, seller: 'PHCL Luxury Motors', image: 'https://via.placeholder.com/400x300?text=Luxury+Convertible' },
  { id: 107, name: 'Off‑road Motorcycle', description: 'Rugged bike for off‑road adventures.', category: 'Motorcycles', priceUSD: 13000, rating: 4.5, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Off‑road+Motorcycle' },
  { id: 108, name: 'Touring Bike', description: 'Comfortable touring motorcycle.', category: 'Motorcycles', priceUSD: 12000, rating: 4.4, seller: 'PHCL Super Motorcycles', image: 'https://via.placeholder.com/400x300?text=Touring+Bike' },
  { id: 109, name: 'Gaming Tablet Pro', description: 'High‑performance tablet for gaming.', category: 'Electronics', priceUSD: 899, rating: 4.6, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Gaming+Tablet+Pro' },
  { id: 110, name: '4K Monitor', description: '27" 4K HDR monitor.', category: 'Electronics', priceUSD: 699, rating: 4.7, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=4K+Monitor' },
  { id: 111, name: 'Smart Home Hub', description: 'Control your smart home devices.', category: 'Electronics', priceUSD: 199, rating: 4.5, seller: 'PHCL Super Electronics', image: 'https://via.placeholder.com/400x300?text=Smart+Home+Hub' },
  { id: 112, name: 'Air Conditioner', description: 'Energy‑efficient split AC.', category: 'Appliances', priceUSD: 1200, rating: 4.4, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Air+Conditioner' },
  { id: 113, name: 'Dishwasher', description: 'Quiet, water‑saving dishwasher.', category: 'Appliances', priceUSD: 850, rating: 4.5, seller: 'PHCL Super Appliances', image: 'https://via.placeholder.com/400x300?text=Dishwasher' },
  { id: 114, name: 'Designer Dress', description: 'Elegant evening dress.', category: 'Clothing', priceUSD: 250, rating: 4.8, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Designer+Dress' },
  { id: 115, name: 'Running Sneakers', description: 'Lightweight performance shoes.', category: 'Clothing', priceUSD: 120, rating: 4.6, seller: 'PHCL Super Clothing', image: 'https://via.placeholder.com/400x300?text=Running+Sneakers' },
  { id: 116, name: 'Industrial Forklift', description: 'Heavy‑duty forklift for warehouses.', category: 'Industrial', priceUSD: 35000, rating: 4.7, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Industrial+Forklift' },
  { id: 117, name: 'Conveyor Belt System', description: 'Modular conveyor for production lines.', category: 'Industrial', priceUSD: 22000, rating: 4.6, seller: 'PHCL Super Industrial', image: 'https://via.placeholder.com/400x300?text=Conveyor+Belt+System' },
  { id: 118, name: 'Power Saw', description: 'High‑power electric saw.', category: 'Tools', priceUSD: 300, rating: 4.5, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Power+Saw' },
  { id: 119, name: 'Drill Press', description: 'Precision drill press for metalwork.', category: 'Tools', priceUSD: 450, rating: 4.6, seller: 'PHCL Super Tools', image: 'https://via.placeholder.com/400x300?text=Drill+Press' },
  { id: 120, name: 'Exotic Fruit Basket', description: 'Assorted tropical fruits.', category: 'Food', priceUSD: 80, rating: 4.9, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Exotic+Fruit+Basket' },
  { id: 121, name: 'Gourmet Cheese Pack', description: 'Selection of premium cheeses.', category: 'Food', priceUSD: 65, rating: 4.8, seller: 'PHCL Super Food', image: 'https://via.placeholder.com/400x300?text=Gourmet+Cheese+Pack' },
];
