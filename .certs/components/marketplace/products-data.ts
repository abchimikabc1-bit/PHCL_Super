export const products = [
  // CARS - SHOWROOM VEHICLES (1 Pi = $314,159)
  { id: 1, name: 'Toyota Corolla 2024', category: 'car', tzs: 52500000, usd: 19999, pi: 0.0637, rating: 4.9, reviews: 456, icon: '🚗', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 2, name: 'Honda Civic 2024', category: 'car', tzs: 58750000, usd: 22500, pi: 0.0716, rating: 4.8, reviews: 389, icon: '🚗', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 3, name: 'Nissan Altima 2024', category: 'car', tzs: 61750000, usd: 23750, pi: 0.0756, rating: 4.7, reviews: 342, icon: '🚗', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 4, name: 'Hyundai Elantra 2024', category: 'car', tzs: 47500000, usd: 18000, pi: 0.0573, rating: 4.8, reviews: 278, icon: '🚗', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 5, name: 'Mazda CX-5 2024', category: 'car', tzs: 71250000, usd: 27000, pi: 0.0859, rating: 4.9, reviews: 501, icon: '🚙', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 6, name: 'Volkswagen Golf 2024', category: 'car', tzs: 63250000, usd: 24000, pi: 0.0764, rating: 4.7, reviews: 312, icon: '🚗', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 7, name: 'Ford F-150 2024', category: 'car', tzs: 94750000, usd: 36000, pi: 0.1146, rating: 4.8, reviews: 567, icon: '🚙', condition: 'New', year: 2024, fuel: 'Diesel' },
  { id: 8, name: 'BMW 3 Series 2024', category: 'car', tzs: 131250000, usd: 50000, pi: 0.1592, rating: 4.9, reviews: 423, icon: '🚘', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 9, name: 'Mercedes C-Class 2024', category: 'car', tzs: 140000000, usd: 53500, pi: 0.1703, rating: 4.9, reviews: 489, icon: '🚘', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 10, name: 'Audi A4 2024', category: 'car', tzs: 136750000, usd: 52000, pi: 0.1655, rating: 4.8, reviews: 401, icon: '🚘', condition: 'New', year: 2024, fuel: 'Petrol' },
  { id: 11, name: 'Toyota Land Cruiser 2024', category: 'car', tzs: 184375000, usd: 70000, pi: 0.2228, rating: 5.0, reviews: 678, icon: '🚙', condition: 'New', year: 2024, fuel: 'Diesel' },
  { id: 12, name: 'Subaru Outback 2024', category: 'car', tzs: 68750000, usd: 26250, pi: 0.0836, rating: 4.7, reviews: 298, icon: '🚙', condition: 'New', year: 2024, fuel: 'Petrol' },

  // CARGO TRUCKS
  { id: 27, name: 'Volvo FM 500 Cargo Truck', category: 'truck', tzs: 315000000, usd: 120000, pi: 0.3820, rating: 4.9, reviews: 234, icon: '🚚', condition: 'New', year: 2024, fuel: 'Diesel', capacity: '25 Tons' },
  { id: 28, name: 'Scania R450 Heavy Cargo', category: 'truck', tzs: 340000000, usd: 130000, pi: 0.4140, rating: 4.8, reviews: 198, icon: '🚚', condition: 'New', year: 2024, fuel: 'Diesel', capacity: '30 Tons' },

  // TRAILERS
  { id: 29, name: 'Flatbed Trailer 40ft', category: 'trailer', tzs: 78750000, usd: 30000, pi: 0.0955, rating: 4.7, reviews: 167, icon: '🚛', condition: 'New', year: 2024, capacity: '20 Tons' },
  { id: 30, name: 'Refrigerated Trailer 20ft', category: 'trailer', tzs: 105000000, usd: 40000, pi: 0.1274, rating: 4.8, reviews: 145, icon: '🚛', condition: 'New', year: 2024, capacity: '15 Tons' },

  // HEAVY DUTY TIPPERS
  { id: 31, name: 'CAT 336 Tipper Truck', category: 'tipper', tzs: 210000000, usd: 80000, pi: 0.2548, rating: 4.9, reviews: 289, icon: '🚧', condition: 'New', year: 2024, fuel: 'Diesel', capacity: '18 Cubic Meters' },
  { id: 32, name: 'Komatsu Dump Tipper', category: 'tipper', tzs: 245000000, usd: 93500, pi: 0.2977, rating: 4.8, reviews: 212, icon: '🚧', condition: 'New', year: 2024, fuel: 'Diesel', capacity: '22 Cubic Meters' },

  // AGRICULTURAL TRACTORS
  { id: 33, name: 'John Deere 5100R Tractor', category: 'tractor', tzs: 157500000, usd: 60000, pi: 0.1911, rating: 4.9, reviews: 334, icon: '🚜', condition: 'New', year: 2024, fuel: 'Diesel', power: '100 HP' },
  { id: 34, name: 'Massey Ferguson 7720S', category: 'tractor', tzs: 183750000, usd: 70000, pi: 0.2228, rating: 4.8, reviews: 267, icon: '🚜', condition: 'New', year: 2024, fuel: 'Diesel', power: '130 HP' },
  { id: 35, name: 'AGCO Allis Tractor 8100', category: 'tractor', tzs: 210000000, usd: 80000, pi: 0.2548, rating: 4.9, reviews: 298, icon: '🚜', condition: 'New', year: 2024, fuel: 'Diesel', power: '150 HP' },

  // CONSTRUCTION EQUIPMENT
  { id: 36, name: 'Excavator CAT 320', category: 'equipment', tzs: 280000000, usd: 106500, pi: 0.3391, rating: 4.8, reviews: 223, icon: '🏗️', condition: 'New', year: 2024, type: 'Excavator', capacity: '1.2 Cubic Meters' },
  { id: 37, name: 'Wheel Loader ZL50', category: 'equipment', tzs: 245000000, usd: 93500, pi: 0.2977, rating: 4.7, reviews: 189, icon: '🏗️', condition: 'New', year: 2024, type: 'Wheel Loader', capacity: '3 Tons' },
  { id: 38, name: 'Road Roller Compactor', category: 'equipment', tzs: 140000000, usd: 53500, pi: 0.1703, rating: 4.8, reviews: 156, icon: '🏗️', condition: 'New', year: 2024, type: 'Compactor', capacity: '12 Tons' },
  { id: 39, name: 'Concrete Mixer Plant', category: 'equipment', tzs: 105000000, usd: 40000, pi: 0.1274, rating: 4.6, reviews: 128, icon: '🏗️', condition: 'New', year: 2024, type: 'Mixer', capacity: '180 Cubic Meters/Hour' },
  { id: 40, name: 'Bulldozer CAT D8T', category: 'equipment', tzs: 315000000, usd: 120000, pi: 0.3820, rating: 4.9, reviews: 267, icon: '🏗️', condition: 'New', year: 2024, type: 'Bulldozer', power: '375 HP' },

  // CRYPTO PRODUCTS
  { id: 13, name: 'Bitcoin Trading Pro', category: 'crypto', tzs: 265000, usd: 99.99, pi: 0.0003183, rating: 4.8, reviews: 234, icon: '₿' },
  { id: 14, name: 'Ethereum Wallet', category: 'crypto', tzs: 397500, usd: 149.99, pi: 0.0004775, rating: 4.9, reviews: 189, icon: 'Ξ' },
  { id: 15, name: 'Pi Network Pack', category: 'crypto', tzs: 132500, usd: 49.99, pi: 0.0001592, rating: 4.7, reviews: 156, icon: 'Π' },
  { id: 16, name: 'USDT Exchange', category: 'crypto', tzs: 529750, usd: 199.99, pi: 0.0006366, rating: 4.6, reviews: 142, icon: '₮' },
  { id: 17, name: 'Trading Bot', category: 'crypto', tzs: 794750, usd: 299.99, pi: 0.0009549, rating: 4.9, reviews: 267, icon: '🤖' },
  { id: 18, name: 'Market Analysis', category: 'crypto', tzs: 212000, usd: 79.99, pi: 0.0002546, rating: 4.5, reviews: 98, icon: '📊' },
  { id: 19, name: 'Crypto Signals', category: 'crypto', tzs: 318750, usd: 120.00, pi: 0.0003820, rating: 4.8, reviews: 201, icon: '📈' },
  { id: 20, name: 'Portfolio Manager', category: 'crypto', tzs: 397500, usd: 150.00, pi: 0.0004775, rating: 4.7, reviews: 174, icon: '💼' },

  // MIXED PRODUCTS
  { id: 21, name: 'DeFi Guide', category: 'guide', tzs: 159375, usd: 60.00, pi: 0.0001911, rating: 4.6, reviews: 127, icon: '📚' },
  { id: 22, name: 'Security Audit', category: 'service', tzs: 528750, usd: 199.50, pi: 0.0006350, rating: 4.9, reviews: 89, icon: '🔒' },
  { id: 23, name: 'Tax Calculator', category: 'tool', tzs: 212000, usd: 80.00, pi: 0.0002546, rating: 4.5, reviews: 156, icon: '🧮' },
  { id: 24, name: 'Mining Guide', category: 'guide', tzs: 265000, usd: 100.00, pi: 0.0003183, rating: 4.7, reviews: 213, icon: '⛏️' },
  { id: 25, name: 'Blockchain Course', category: 'course', tzs: 794750, usd: 299.99, pi: 0.0009549, rating: 4.8, reviews: 342, icon: '🎓' },
  { id: 26, name: 'NFT Creator Tool', category: 'tool', tzs: 397500, usd: 150.00, pi: 0.0004775, rating: 4.6, reviews: 178, icon: '🎨' },

  // SMARTPHONES
  { id: 63, name: 'Samsung Galaxy S26 Ultra', category: 'phone', tzs: 2362500, usd: 899.99, pi: 0.0028659, rating: 4.9, reviews: 1234, icon: '📱', storage: '256GB', color: 'Phantom Black', screen: '6.8"' },
  { id: 64, name: 'Samsung Galaxy S26', category: 'phone', tzs: 2100000, usd: 799.99, pi: 0.0025469, rating: 4.8, reviews: 987, icon: '📱', storage: '128GB', color: 'Graphite', screen: '6.3"' },
  { id: 65, name: 'Samsung Galaxy S24 Ultra', category: 'phone', tzs: 1890000, usd: 699.99, pi: 0.0022276, rating: 4.8, reviews: 856, icon: '📱', storage: '256GB', color: 'Titanium Black', screen: '6.8"' },
  { id: 66, name: 'Samsung Galaxy S24', category: 'phone', tzs: 1575000, usd: 599.99, pi: 0.0019094, rating: 4.7, reviews: 743, icon: '📱', storage: '128GB', color: 'Onyx', screen: '6.1"' },
  { id: 67, name: 'Apple iPhone 16 Pro Max', category: 'phone', tzs: 2625000, usd: 999.99, pi: 0.0031831, rating: 4.9, reviews: 1567, icon: '📱', storage: '256GB', color: 'Space Black', screen: '6.9"' },
  { id: 68, name: 'Apple iPhone 16 Pro', category: 'phone', tzs: 2362500, usd: 899.99, pi: 0.0028659, rating: 4.9, reviews: 1345, icon: '📱', storage: '128GB', color: 'Silver', screen: '6.3"' },
  { id: 69, name: 'Apple iPhone 16', category: 'phone', tzs: 1890000, usd: 699.99, pi: 0.0022276, rating: 4.8, reviews: 1123, icon: '📱', storage: '128GB', color: 'Black', screen: '6.1"' },

  // SMARTWATCHES
  { id: 70, name: 'Apple Watch Ultra 2', category: 'watch', tzs: 945000, usd: 359.99, pi: 0.0011459, rating: 4.9, reviews: 678, icon: '⌚', display: 'LTPO OLED', color: 'Midnight', water: '100m' },
  { id: 71, name: 'Apple Watch Series 10', category: 'watch', tzs: 735000, usd: 279.99, pi: 0.0008913, rating: 4.8, reviews: 567, icon: '⌚', display: 'LTPO OLED', color: 'Space Black', water: '50m' },
  { id: 72, name: 'Samsung Galaxy Watch 7', category: 'watch', tzs: 682500, usd: 259.99, pi: 0.0008275, rating: 4.8, reviews: 512, icon: '⌚', display: 'AMOLED', color: 'Black', water: '50m' },
  { id: 73, name: 'Samsung Galaxy Watch Ultra', category: 'watch', tzs: 787500, usd: 299.99, pi: 0.0009549, rating: 4.9, reviews: 634, icon: '⌚', display: 'AMOLED', color: 'Titanium', water: '100m' },

  // HOME CONSTRUCTION & BUILDING MATERIALS
  { id: 41, name: 'Corrugated Iron Sheet (20 Sheets)', category: 'material', tzs: 315000, usd: 120, pi: 0.0003820, rating: 4.8, reviews: 567, icon: '⛩️', unit: '20 sheets', type: 'Roofing' },
  { id: 42, name: 'Gypsum Board 12.5mm (1 Box)', category: 'material', tzs: 210000, usd: 80, pi: 0.0002548, rating: 4.7, reviews: 423, icon: '📦', unit: '1 box', type: 'Drywall' },
  { id: 43, name: 'Cement Bag 50kg (1 Bag)', category: 'material', tzs: 52500, usd: 20, pi: 0.81, rating: 4.9, reviews: 892, icon: '🪨', unit: '50kg', type: 'Concrete' },
  { id: 44, name: 'Paint 20 Liters (Premium)', category: 'material', tzs: 525000, usd: 200, pi: 8.08, rating: 4.8, reviews: 234, icon: '🎨', unit: '20L', color: 'Assorted', type: 'Exterior' },
  { id: 45, name: 'Sand Cubic Meter', category: 'material', tzs: 131250, usd: 50, pi: 2.02, rating: 4.7, reviews: 567, icon: '⚙️', unit: 'Cubic Meter', type: 'Aggregate' },
  { id: 46, name: 'Gravel Cubic Meter', category: 'material', tzs: 157500, usd: 60, pi: 2.42, rating: 4.6, reviews: 345, icon: '⚙️', unit: 'Cubic Meter', type: 'Aggregate' },
  { id: 47, name: 'Wooden Planks Bundle (50 pieces)', category: 'material', tzs: 262500, usd: 100, pi: 4.04, rating: 4.8, reviews: 289, icon: '🪵', unit: '50 pieces', grade: 'Grade A', type: 'Wood' },
  { id: 48, name: 'Steel Rebar 12mm (50 pieces)', category: 'material', tzs: 210000, usd: 80, pi: 3.23, rating: 4.7, reviews: 412, icon: '🔗', unit: '50 pieces', diameter: '12mm', type: 'Steel' },
  { id: 49, name: 'Ceramic Tiles (50 Tiles)', category: 'material', tzs: 315000, usd: 120, pi: 4.85, rating: 4.9, reviews: 523, icon: '🧱', unit: '50 tiles', size: '40x40cm', type: 'Flooring' },
  { id: 50, name: 'Nails & Screws Assorted (5kg)', category: 'material', tzs: 78750, usd: 30, pi: 1.21, rating: 4.6, reviews: 678, icon: '📌', unit: '5kg mix', type: 'Fasteners' },
  { id: 51, name: 'Mortar Mix 25kg', category: 'material', tzs: 105000, usd: 40, pi: 1.62, rating: 4.7, reviews: 356, icon: '🧱', unit: '25kg', type: 'Adhesive' },
  { id: 52, name: 'Waterproof Sealant (10L)', category: 'material', tzs: 262500, usd: 100, pi: 4.04, rating: 4.8, reviews: 289, icon: '💧', unit: '10L', type: 'Sealant' },
  { id: 53, name: 'Insulation Foam (100 Sheets)', category: 'material', tzs: 420000, usd: 160, pi: 6.46, rating: 4.7, reviews: 178, icon: '📦', unit: '100 sheets', thickness: '50mm', type: 'Insulation' },
  { id: 54, name: 'Electrical Wiring Copper 100m', category: 'material', tzs: 210000, usd: 80, pi: 3.23, rating: 4.8, reviews: 401, icon: '⚡', unit: '100m', gauge: '2.5mm²', type: 'Electrical' },
  { id: 55, name: 'PVC Pipes 4 inch (50 pieces)', category: 'material', tzs: 315000, usd: 120, pi: 4.85, rating: 4.7, reviews: 267, icon: '🔧', unit: '50 pieces', diameter: '4 inch', type: 'Plumbing' },
  { id: 56, name: 'Concrete Blocks (100 Blocks)', category: 'material', tzs: 420000, usd: 160, pi: 6.46, rating: 4.8, reviews: 534, icon: '🧱', unit: '100 blocks', size: '40x20x20cm', type: 'Masonry' },
  { id: 57, name: 'Glass Wool Roll 50mm', category: 'material', tzs: 210000, usd: 80, pi: 3.23, rating: 4.6, reviews: 198, icon: '📦', unit: '1 roll', type: 'Insulation' },
  { id: 58, name: 'Door Frame Complete Set', category: 'material', tzs: 262500, usd: 100, pi: 4.04, rating: 4.8, reviews: 312, icon: '🚪', unit: '1 set', material: 'Hardwood', type: 'Doors' },
  { id: 59, name: 'Window Frame Aluminum (5 pcs)', category: 'material', tzs: 525000, usd: 200, pi: 8.08, rating: 4.7, reviews: 245, icon: '🪟', unit: '5 pieces', type: 'Windows' },
  { id: 60, name: 'Roof Truss Kit (50 sq meters)', category: 'material', tzs: 1050000, usd: 400, pi: 16.16, rating: 4.9, reviews: 189, icon: '⛩️', unit: 'Kit', coverage: '50 sq meters', type: 'Roofing' },
  { id: 61, name: 'Paint Thinner (20L Can)', category: 'material', tzs: 210000, usd: 80, pi: 3.23, rating: 4.6, reviews: 156, icon: '🎨', unit: '20L', type: 'Paint Accessories' },
  { id: 62, name: 'Wood Polish Premium (5L)', category: 'material', tzs: 157500, usd: 60, pi: 2.42, rating: 4.7, reviews: 223, icon: '✨', unit: '5L', type: 'Finishing' },
  { id: 63, name: 'Sandpaper Assorted (50 Sheets)', category: 'material', tzs: 52500, usd: 20, pi: 0.81, rating: 4.8, reviews: 401, icon: '📋', unit: '50 sheets', grits: 'Multiple', type: 'Abrasives' },
  { id: 64, name: 'Wall Putty 20kg', category: 'material', tzs: 105000, usd: 40, pi: 1.62, rating: 4.7, reviews: 334, icon: '🎨', unit: '20kg', type: 'Surface Prep' },
  { id: 65, name: 'Primer Paint (20L)', category: 'material', tzs: 315000, usd: 120, pi: 4.85, rating: 4.8, reviews: 267, icon: '🎨', unit: '20L', type: 'Paint Base' },
  { id: 66, name: 'Stone Chips Cubic Meter', category: 'material', tzs: 189000, usd: 72, pi: 2.91, rating: 4.6, reviews: 278, icon: '⚙️', unit: 'Cubic Meter', type: 'Aggregate' },
  { id: 67, name: 'Lintel Beam Steel (6 meters)', category: 'material', tzs: 210000, usd: 80, pi: 3.23, rating: 4.8, reviews: 189, icon: '🔗', unit: '6m beam', type: 'Steel Structure' },
  { id: 68, name: 'Joint Compound 25kg', category: 'material', tzs: 157500, usd: 60, pi: 2.42, rating: 4.7, reviews: 201, icon: '🧱', unit: '25kg', type: 'Drywall Finish' },
  { id: 69, name: 'Tiles Adhesive 25kg', category: 'material', tzs: 105000, usd: 40, pi: 1.62, rating: 4.8, reviews: 345, icon: '🧱', unit: '25kg', type: 'Tile Materials' },
  { id: 70, name: 'Laminate Flooring (50 sq meters)', category: 'material', tzs: 525000, usd: 200, pi: 8.08, rating: 4.8, reviews: 412, icon: '🏠', unit: '50 sq meters', finish: 'Wood Look', type: 'Flooring' },

  // VIP BUSES
  { id: 71, name: 'Volvo B7R VIP Coach 52 Seater', category: 'bus', tzs: 735000000, usd: 280000, pi: 11312, rating: 4.9, reviews: 145, icon: '🚌', condition: 'New', year: 2024, capacity: '52 passengers', features: 'Luxury interior' },
  { id: 72, name: 'Mercedes Benz Sprinter VIP Bus', category: 'bus', tzs: 840000000, usd: 320000, pi: 12929, rating: 4.9, reviews: 167, icon: '🚌', condition: 'New', year: 2024, capacity: '48 passengers', features: 'Premium comfort' },

  // MOTORCYCLES
  { id: 73, name: 'Harley Davidson Street Glide', category: 'motorcycle', tzs: 157500000, usd: 60000, pi: 2424, rating: 4.8, reviews: 289, icon: '🏍️', condition: 'New', year: 2024, engine: '1746cc', type: 'Cruiser' },
  { id: 74, name: 'Kawasaki Ninja H2 SX', category: 'motorcycle', tzs: 131250000, usd: 50000, pi: 2020, rating: 4.9, reviews: 312, icon: '🏍️', condition: 'New', year: 2024, engine: '998cc', type: 'Sport Touring' },

  // HOME FURNISHINGS - SOFAS
  { id: 75, name: 'Modern L-Shaped Sofa Set', category: 'furniture', tzs: 3150000, usd: 1200, pi: 48.48, rating: 4.8, reviews: 567, icon: '🛋️', material: 'Premium Leather', seats: '5-6 seater', color: 'Black/Gray' },
  { id: 76, name: 'Contemporary 3-Seater Sofa', category: 'furniture', tzs: 2100000, usd: 800, pi: 32.32, rating: 4.7, reviews: 423, icon: '🛋️', material: 'Fabric', seats: '3 seater', color: 'Multiple colors' },
  { id: 77, name: 'Sectional Modular Sofa', category: 'furniture', tzs: 3675000, usd: 1400, pi: 56.56, rating: 4.9, reviews: 345, icon: '🛋️', material: 'Premium Fabric', seats: '6+ configurable', color: 'Customizable' },

  // KITCHEN APPLIANCES
  { id: 78, name: 'Electric Cooker 4-Burner', category: 'appliance', tzs: 1050000, usd: 400, pi: 16.16, rating: 4.8, reviews: 234, icon: '🍳', type: 'Electric stove', power: '8000W', features: 'Timer control' },
  { id: 79, name: 'Premium Electric Cooker Oven', category: 'appliance', tzs: 1575000, usd: 600, pi: 24.24, rating: 4.9, reviews: 289, icon: '🍳', type: 'Electric stove with oven', power: '10000W', features: 'Convection baking' },

  // REFRIGERATORS
  { id: 80, name: 'Samsung Double Door Refrigerator 400L', category: 'appliance', tzs: 2100000, usd: 800, pi: 32.32, rating: 4.9, reviews: 456, icon: '❄️', type: 'Fridge', capacity: '400 liters', features: 'Digital control' },
  { id: 81, name: 'LG French Door Refrigerator 500L', category: 'appliance', tzs: 2625000, usd: 1000, pi: 40.40, rating: 4.8, reviews: 389, icon: '❄️', type: 'Fridge', capacity: '500 liters', features: 'Ice maker, smart display' },

  // WASHING MACHINES
  { id: 82, name: 'Fully Automatic Washing Machine 8kg', category: 'appliance', tzs: 1312500, usd: 500, pi: 20.20, rating: 4.7, reviews: 345, icon: '🧺', type: 'Washer', capacity: '8kg', features: 'Front load, multiple cycles' },
  { id: 83, name: 'Premium Washing Machine 10kg Smart', category: 'appliance', tzs: 1837500, usd: 700, pi: 28.28, rating: 4.9, reviews: 412, icon: '🧺', type: 'Washer', capacity: '10kg', features: 'Wi-Fi control, inverter' },

  // TV SETS
  { id: 84, name: 'Samsung QLED 55 inch 4K TV', category: 'electronics', tzs: 2625000, usd: 1000, pi: 40.40, rating: 4.8, reviews: 523, icon: '📺', screen: '55 inch', resolution: '4K UHD', features: 'Smart TV' },
  { id: 85, name: 'LG OLED 65 inch 4K TV', category: 'electronics', tzs: 3937500, usd: 1500, pi: 60.60, rating: 4.9, reviews: 478, icon: '📺', screen: '65 inch', resolution: '4K OLED', features: 'Premium OLED display' },
  { id: 86, name: 'Sony Bravia 75 inch 8K TV', category: 'electronics', tzs: 5775000, usd: 2200, pi: 88.88, rating: 4.9, reviews: 267, icon: '📺', screen: '75 inch', resolution: '8K', features: '8K resolution, PS5 ready' },

  // MUSIC SYSTEMS
  { id: 87, name: 'JBL Partybox 310 Music System', category: 'electronics', tzs: 2100000, usd: 800, pi: 32.32, rating: 4.8, reviews: 401, icon: '🔊', power: '1100W', features: 'Wireless, LED lights, dual bass' },
  { id: 88, name: 'Bose Professional Sound System', category: 'electronics', tzs: 2625000, usd: 1000, pi: 40.40, rating: 4.9, reviews: 356, icon: '🔊', power: '1000W', features: 'Dolby Atmos, premium sound' },
  { id: 89, name: 'Pioneer Grand Premium DJ System', category: 'electronics', tzs: 3675000, usd: 1400, pi: 56.56, rating: 4.9, reviews: 234, icon: '🔊', power: '1500W', features: 'DJ turntable, mixer, lights' },

  // ADDITIONAL HOME FURNISHINGS
  { id: 90, name: 'Modern Dining Table Set (6 seater)', category: 'furniture', tzs: 1575000, usd: 600, pi: 24.24, rating: 4.7, reviews: 289, icon: '🪑', material: 'Wood/Glass', seats: '6 people', color: 'Walnut/Black' },
  { id: 91, name: 'King Size Bed Frame Premium', category: 'furniture', tzs: 1312500, usd: 500, pi: 20.20, rating: 4.8, reviews: 345, icon: '🛏️', size: 'King (180x200)', material: 'Solid wood', features: 'Storage drawers' },
  { id: 92, name: 'Office Desk Executive Series', category: 'furniture', tzs: 1050000, usd: 400, pi: 16.16, rating: 4.7, reviews: 201, icon: '🖥️', type: 'Desk', size: '150cm', material: 'Engineered wood' },
  { id: 93, name: 'Wall-Mounted Air Conditioner 2.5 Ton', category: 'appliance', tzs: 1575000, usd: 600, pi: 24.24, rating: 4.8, reviews: 367, icon: '❄️', capacity: '2.5 Ton', features: 'Inverter, quiet operation' },
  { id: 94, name: 'Ceiling Fan Energy Efficient', category: 'appliance', tzs: 315000, usd: 120, pi: 4.85, rating: 4.6, reviews: 512, icon: '🌀', power: '60W', features: 'Remote control, 3 speeds' },
  { id: 95, name: 'Microwave Oven 30L Convection', category: 'appliance', tzs: 787500, usd: 300, pi: 12.12, rating: 4.7, reviews: 278, icon: '🍶', capacity: '30 liters', features: 'Convection, grill functions' },
];
