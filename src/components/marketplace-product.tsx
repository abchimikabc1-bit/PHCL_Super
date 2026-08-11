// components/marketplace-products.tsx
'use client';

import React, { useMemo, useState } from 'react';

export interface Product {
  id: string;
  name: string;
  category: 'car' | 'motorcycle' | 'tractor' | 'construction' | 'electrical' | 'appliance' | 'phone' | 'wearable' | 'audio' | 'furniture';
  brand: string;
  condition: 'New' | 'Refurbished';
  year: number;
  spec?: string;
  rating: number;
  reviews: number;
  icon: string;
  usd: number;
  tzs: number;
  ntzs: number;
  pi: number;
  description: string;
}

export interface MobilePaymentDetails {
  network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa' | null;
  phone: string;
}

const CATEGORY_META: Record<Product['category'], { label: string; className: string }> = {
  car: { label: 'Magari', className: 'text-orange-300' },
  motorcycle: { label: 'Pikipiki', className: 'text-sky-300' },
  tractor: { label: 'Tractors', className: 'text-lime-300' },
  construction: { label: 'Ujenzi', className: 'text-orange-300' },
  electrical: { label: 'Umeme', className: 'text-sky-300' },
  appliance: { label: 'Appliances', className: 'text-lime-300' },
  phone: { label: 'Simu', className: 'text-orange-300' },
  wearable: { label: 'Wearables', className: 'text-sky-300' },
  audio: { label: 'Audio', className: 'text-lime-300' },
  furniture: { label: 'Furniture', className: 'text-orange-300' },
};

export function MarketplaceCatalog({ currency = 'tzs' }: { currency?: 'usd' | 'tzs' | 'ntzs' | 'pi' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | Product['category']>('all');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      const matchesCategory = category === 'all' || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const formatPrice = (p: Product) => {
    if (currency === 'usd') return `USD ${p.usd.toLocaleString()}`;
    if (currency === 'ntzs') return `nTZS ${p.ntzs.toLocaleString()}`;
    if (currency === 'pi') return `PI ${p.pi.toFixed(4)}`;
    return `TZS ${p.tzs.toLocaleString()}`;
  };

  const categories = ['all', ...Object.keys(CATEGORY_META)] as const;

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-3xl p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tafuta bidhaa..."
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Categories zote' : CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={[
              'rounded-full px-3 py-2 text-xs font-semibold transition',
              category === c
                ? 'bg-amber-300 text-slate-900'
                : 'bg-slate-800/80 text-amber-100 hover:bg-slate-700',
            ].join(' ')}>
            {c === 'all' ? 'All' : CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => (
          <article
            key={p.id}
            className="glow-card p-4 transition hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-3xl">{p.icon}</div>
                <h3 className="mt-2 text-lg font-bold text-white">{p.name}</h3>
                <p className={`text-sm font-semibold ${CATEGORY_META[p.category].className}`}>
                  {CATEGORY_META[p.category].label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-200">{formatPrice(p)}</p>
                <p className="text-xs text-slate-400">⭐ {p.rating} ({p.reviews})</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-300">{p.description}</p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-400">Brand: {p.brand}</p>
              <p className="text-xs text-slate-400">Condition: {p.condition}</p>
              <p className="text-xs text-slate-400">Year: {p.year}</p>
              {p.spec && <p className="mt-1 text-xs text-slate-300">Spec: {p.spec}</p>}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          Hakuna bidhaa iliyopatikana.
        </div>
      )}
    </div>
  );
}

const products: Product[] = [
  {
    id: 'phone-1',
    name: 'Samsung Galaxy S26 Ultra 5G (512GB)',
    category: 'phone',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Snapdragon 8 Gen 5, 12GB RAM',
    rating: 4.9,
    reviews: 340,
    icon: '📱',
    usd: 1299,
    tzs: 34098375,
    ntzs: 34098375,
    pi: 0.0413,
    description: 'Simu janja ya kipekee yenye kamera kali ya 200MP na kalamu ya S-Pen kwa ajili ya kazi na burudani.'
  },
  {
    id: 'phone-2',
    name: 'Apple iPhone 17 Pro Max (1TB)',
    category: 'phone',
    brand: 'Apple',
    condition: 'New',
    year: 2026,
    spec: 'A19 Pro Chip, Titanium Body',
    rating: 5.0,
    reviews: 512,
    icon: '📱',
    usd: 1499,
    tzs: 39347375,
    ntzs: 39347375,
    pi: 0.0477,
    description: 'Simu bora zaidi duniani kwa sasa, yenye uwezo mkubwa wa betri na ulinzi wa hali ya juu wa faragha.'
  },
  {
    id: 'phone-3',
    name: 'Tecno Phantom V Fold 2 5G',
    category: 'phone',
    brand: 'Tecno',
    condition: 'New',
    year: 2026,
    spec: 'Foldable Dual Screen, 512GB',
    rating: 4.7,
    reviews: 180,
    icon: '📱',
    usd: 1050,
    tzs: 27562500,
    ntzs: 27562500,
    pi: 0.0334,
    description: 'Simu ya kukunja ya kisasa inayokupa nafasi ya kompyuta kibao na simu ya kawaida kwa pamoja.'
  },
  {
    id: 'phone-4',
    name: 'Google Pixel 10 Pro (512GB)',
    category: 'phone',
    brand: 'Google',
    condition: 'New',
    year: 2026,
    spec: 'Tensor G5, 16GB RAM',
    rating: 4.8,
    reviews: 240,
    icon: '📱',
    usd: 1299,
    tzs: 34073750,
    ntzs: 34073750,
    pi: 0.0413,
    description: 'Simu janja yenye AI camera ya kiwango cha juu na usalama wa hali ya juu wa Android.'
  },
  {
    id: 'phone-5',
    name: 'Xiaomi 16 Ultra (512GB)',
    category: 'phone',
    brand: 'Xiaomi',
    condition: 'New',
    year: 2026,
    spec: 'Leica Camera System',
    rating: 4.7,
    reviews: 198,
    icon: '📱',
    usd: 1099,
    tzs: 28848750,
    ntzs: 28848750,
    pi: 0.0349,
    description: 'Performance kali, kamera bora na charging ya kasi sana.'
  },
  {
    id: 'phone-6',
    name: 'OnePlus 14 Pro (512GB)',
    category: 'phone',
    brand: 'OnePlus',
    condition: 'New',
    year: 2026,
    spec: '120Hz AMOLED, 100W Fast Charge',
    rating: 4.7,
    reviews: 174,
    icon: '📱',
    usd: 999,
    tzs: 26223750,
    ntzs: 26223750,
    pi: 0.0317,
    description: 'Simu yenye speed kubwa kwa gaming, biashara na multitasking.'
  },
  {
    id: 'phone-7',
    name: 'Infinix Zero Ultra Pro 5G',
    category: 'phone',
    brand: 'Infinix',
    condition: 'New',
    year: 2026,
    spec: '256GB, 12GB RAM',
    rating: 4.6,
    reviews: 260,
    icon: '📱',
    usd: 620,
    tzs: 16275000,
    ntzs: 16275000,
    pi: 0.0197,
    description: 'Chaguo bora kwa matumizi ya kila siku na gharama rafiki.'
  },
  {
    id: 'elec-3',
    name: 'JA Solar 550W Mono Panel (Set x10)',
    category: 'electrical',
    brand: 'JA Solar',
    condition: 'New',
    year: 2026,
    spec: '5.5kW Combined',
    rating: 4.8,
    reviews: 133,
    icon: '☀️',
    usd: 2100,
    tzs: 5512500,
    ntzs: 5512500,
    pi: 0.0067,
    description: 'Panel za kisasa za umeme wa jua kwa nyumba na biashara ndogo.'
  },
  {
    id: 'elec-4',
    name: 'Lithium Battery Pack 48V 200Ah',
    category: 'electrical',
    brand: 'PowerVault',
    condition: 'New',
    year: 2026,
    spec: 'Long-cycle Energy Storage',
    rating: 4.9,
    reviews: 121,
    icon: '🔋',
    usd: 3200,
    tzs: 8400000,
    ntzs: 8400000,
    pi: 0.0102,
    description: 'Betri kubwa ya kuhifadhi umeme wa solar kwa muda mrefu.'
  },
  {
    id: 'elec-5',
    name: 'Solar Charge Controller MPPT 120A',
    category: 'electrical',
    brand: 'Victron',
    condition: 'New',
    year: 2026,
    spec: 'High Efficiency MPPT',
    rating: 4.8,
    reviews: 98,
    icon: '⚙️',
    usd: 680,
    tzs: 1785000,
    ntzs: 1785000,
    pi: 0.0022,
    description: 'Controller imara kwa kulinda betri na kuongeza efficiency ya mfumo.'
  },
  {
    id: 'elec-6',
    name: 'Copper Cable 16mm (100m Roll)',
    category: 'electrical',
    brand: 'Helukabel',
    condition: 'New',
    year: 2026,
    spec: 'Heavy Duty Power Cable',
    rating: 4.7,
    reviews: 212,
    icon: '🧵',
    usd: 420,
    tzs: 1102500,
    ntzs: 1102500,
    pi: 0.0013,
    description: 'Cable ya ubora wa juu kwa miradi ya umeme wa nyumba na viwandani.'
  },
  {
    id: 'app-7',
    name: 'Universal Smartphone Fast Charger Kit (65W)',
    category: 'appliance',
    brand: 'Anker',
    condition: 'New',
    year: 2026,
    spec: 'USB-C PD + Cables',
    rating: 4.8,
    reviews: 430,
    icon: '🔌',
    usd: 69,
    tzs: 181125,
    ntzs: 181125,
    pi: 0.0002,
    description: 'Charger ya haraka kwa simu nyingi janja pamoja na cable seti.'
  },
  {
    id: 'app-8',
    name: 'Phone Screen Protector + Case Bundle (Premium)',
    category: 'appliance',
    brand: 'Spigen',
    condition: 'New',
    year: 2026,
    spec: 'Tempered Glass + Shockproof Case',
    rating: 4.7,
    reviews: 510,
    icon: '🛡️',
    usd: 35,
    tzs: 91875,
    ntzs: 91875,
    pi: 0.0001,
    description: 'Spare muhimu za ulinzi wa simu: screen protector na cover imara.'
  },
  // --- MAGARI YA KIFAHARI & SUV ---
  {
    id: 'car-1',
    name: 'Toyota Land Cruiser V8 (ZX Model 2026)',
    category: 'car',
    brand: 'Toyota',
    condition: 'New',
    year: 2026,
    spec: 'Twin-Turbo V6 Diesel',
    rating: 4.9,
    reviews: 128,
    icon: '🚙',
    usd: 95000,
    tzs: 249375000,
    ntzs: 249375000,
    pi: 0.3024,
    description: 'SUV ya kifahari yenye uwezo mkubwa wa kupenya barabara zote na teknolojia ya kisasa.'
  },
  {
    id: 'car-2',
    name: 'Range Rover Sport Autobiography',
    category: 'car',
    brand: 'Land Rover',
    condition: 'New',
    year: 2026,
    spec: 'Mild Hybrid Petrol',
    rating: 4.8,
    reviews: 94,
    icon: '🏎️',
    usd: 115000,
    tzs: 301875000,
    ntzs: 301875000,
    pi: 0.3660,
    description: 'Anasa isiyo na kifani na nguvu ya injini kwa ajili ya safari za hadhi ya juu.'
  },
  {
    id: 'car-3',
    name: 'Toyota RAV4 Hybrid Limited',
    category: 'car',
    brand: 'Toyota',
    condition: 'New',
    year: 2025,
    spec: 'Hybrid Eco',
    rating: 4.7,
    reviews: 215,
    icon: '🚗',
    usd: 38000,
    tzs: 99750000,
    ntzs: 99750000,
    pi: 0.1209,
    description: 'Gari la kisasa linalotumia mafuta kidogo sana, linadumu na lina nafasi nzuri ya familia.'
  },
  {
    id: 'car-4',
    name: 'Lexus LX 600 VIP Edition',
    category: 'car',
    brand: 'Lexus',
    condition: 'New',
    year: 2026,
    spec: 'Twin-Turbo V6 Luxury',
    rating: 5.0,
    reviews: 67,
    icon: '🚙',
    usd: 130000,
    tzs: 341250000,
    ntzs: 341250000,
    pi: 0.4138,
    description: 'Kilele cha utulivu, usalama na ubora wa hali ya juu ndani ya gari.'
  },

  // --- PIKIPIKI MBALIMBALI ---
  {
    id: 'moto-1',
    name: 'Yamaha MT-09 ABS Streetfighter',
    category: 'motorcycle',
    brand: 'Yamaha',
    condition: 'New',
    year: 2026,
    spec: '890cc Triple Engine',
    rating: 4.9,
    reviews: 142,
    icon: '🏍️',
    usd: 10500,
    tzs: 27562500,
    ntzs: 27562500,
    pi: 0.0334,
    description: 'Pikipiki ya kasi na nguvu ya ajabu kwa ajili ya michezo na usafiri wa haraka.'
  },
  {
    id: 'moto-2',
    name: 'Honda CRF450RX Off-Road',
    category: 'motorcycle',
    brand: 'Honda',
    condition: 'New',
    year: 2026,
    spec: '450cc Racing Spec',
    rating: 4.8,
    reviews: 89,
    icon: '🏍️',
    usd: 9800,
    tzs: 25725000,
    ntzs: 25725000,
    pi: 0.0311,
    description: 'Maalum kwa ajili ya mashindano na kupitia njia ngumu za milimani na porini.'
  },
  {
    id: 'moto-3',
    name: 'Boxer BM 150X (Heavy Duty)',
    category: 'motorcycle',
    brand: 'Bajaj',
    condition: 'New',
    year: 2026,
    spec: '150cc Utility',
    rating: 4.7,
    reviews: 520,
    icon: '🛵',
    usd: 1600,
    tzs: 4200000,
    ntzs: 4200000,
    pi: 0.0050,
    description: 'Pikipiki imara sana kwa ajili ya biashara ya bodaboda na mizigo mizito mikoani.'
  },
  {
    id: 'moto-4',
    name: 'Vespa Primavera 150 Scooter',
    category: 'motorcycle',
    brand: 'Vespa',
    condition: 'New',
    year: 2026,
    spec: '150cc Classic',
    rating: 4.9,
    reviews: 110,
    icon: '🛵',
    usd: 4500,
    tzs: 11812500,
    ntzs: 11812500,
    pi: 0.0143,
    description: 'Pikipiki ya kisasa ya kike na kiume yenye muonekano wa kiitaliano wa kuvutia.'
  },

  // --- MATRECTOR YA KILIMO ---
  {
    id: 'tractor-1',
    name: 'John Deere 5075E 4WD Tractor',
    category: 'tractor',
    brand: 'John Deere',
    condition: 'New',
    year: 2026,
    spec: '75 HP Diesel Engine',
    rating: 4.9,
    reviews: 78,
    icon: '🚜',
    usd: 38500,
    tzs: 101062500,
    ntzs: 101062500,
    pi: 0.1225,
    description: 'Tractor imara ya kilimo cha kisasa yenye uwezo mkubwa wa kulima maeneo makubwa.'
  },
  {
    id: 'tractor-2',
    name: 'Massey Ferguson 385 4WD',
    category: 'tractor',
    brand: 'Massey Ferguson',
    condition: 'New',
    year: 2026,
    spec: '85 HP Heavy Duty',
    rating: 4.8,
    reviews: 95,
    icon: '🚜',
    usd: 34000,
    tzs: 89250000,
    ntzs: 89250000,
    pi: 0.1082,
    description: 'Tractor inayopendwa zaidi kwa uimara wake na urahisishaji wa matengenezo.'
  },

  // --- VIFAA VYA UJENZI ---
  {
    id: 'const-1',
    name: 'CAT 320 Hydraulic Excavator',
    category: 'construction',
    brand: 'Caterpillar',
    condition: 'New',
    year: 2026,
    spec: 'Heavy Earthmover',
    rating: 5.0,
    reviews: 45,
    icon: '🏗️',
    usd: 185000,
    tzs: 485625000,
    ntzs: 485625000,
    pi: 0.5888,
    description: 'Chombo kizito cha kuchimba na kusawazisha ardhi kwenye ujenzi mkubwa.'
  },
  {
    id: 'const-2',
    name: 'Portable Concrete Mixer Machine (500L)',
    category: 'construction',
    brand: 'PowerMax',
    condition: 'New',
    year: 2026,
    spec: 'Diesel/Electric Powered',
    rating: 4.7,
    reviews: 130,
    icon: '🧱',
    usd: 2200,
    tzs: 5775000,
    ntzs: 5775000,
    pi: 0.0070,
    description: 'Mashine ya kuchanganya zege kwa kasi na ubora wa hali ya juu kwenye miradi ya ujenzi.'
  },
  {
    id: 'const-3',
    name: 'High-Tensile Iron Steel Bars Bundle (Y16)',
    category: 'construction',
    brand: 'Apex Steel',
    condition: 'New',
    year: 2026,
    spec: 'Standard Grade 500',
    rating: 4.9,
    reviews: 310,
    icon: '🔩',
    usd: 850,
    tzs: 2228275,
    ntzs: 2228275,
    pi: 0.0027,
    description: 'Nondo imara za kujengea nguzo na slabs kwa usalama wa jengo lako.'
  },

  // --- VIFAA VYA UMEME (ELECTRICAL & POWER) ---
  {
    id: 'elec-1',
    name: 'Huawei 10kW Hybrid Solar Inverter + Battery Kit',
    category: 'electrical',
    brand: 'Huawei',
    condition: 'New',
    year: 2026,
    spec: 'Lithium Storage System',
    rating: 4.9,
    reviews: 188,
    icon: '⚡',
    usd: 4800,
    tzs: 12600000,
    ntzs: 12600000,
    pi: 0.0152,
    description: 'Mfumo kamili wa nishati ya jua wa kuaminika kwa nyumba nzima au ofisi.'
  },
  {
    id: 'elec-2',
    name: 'Perkins Silent Diesel Generator 50kVA',
    category: 'electrical',
    brand: 'Perkins',
    condition: 'New',
    year: 2026,
    spec: 'Commercial Backup',
    rating: 4.8,
    reviews: 64,
    icon: '🔌',
    usd: 12500,
    tzs: 32812500,
    ntzs: 32812500,
    pi: 0.0397,
    description: 'Jenereta kubwa ya kimya ya kutoa umeme wa dharura kwenye biashara na magorofa.'
  },

  // --- SIMU ZA MKONONI (SMARTPHONES) ---
  {
    id: 'phone-1',
    name: 'Samsung Galaxy S26 Ultra 5G (512GB)',
    category: 'phone',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Snapdragon 8 Gen 5, 12GB RAM',
    rating: 4.9,
    reviews: 340,
    icon: '📱',
    usd: 1299,
    tzs: 34098375,
    ntzs: 34098375,
    pi: 0.0413,
    description: 'Simu janja ya kipekee yenye kamera kali ya 200MP na kalamu ya S-Pen kwa ajili ya kazi na burudani.'
  },
  {
    id: 'phone-2',
    name: 'Apple iPhone 17 Pro Max (1TB)',
    category: 'phone',
    brand: 'Apple',
    condition: 'New',
    year: 2026,
    spec: 'A19 Pro Chip, Titanium Body',
    rating: 5.0,
    reviews: 512,
    icon: '📱',
    usd: 1499,
    tzs: 39347375,
    ntzs: 39347375,
    pi: 0.0477,
    description: 'Simu bora zaidi duniani kwa sasa, yenye uwezo mkubwa wa betri na ulinzi wa hali ya juu wa faragha.'
  },
  {
    id: 'phone-3',
    name: 'Tecno Phantom V Fold 2 5G',
    category: 'phone',
    brand: 'Tecno',
    condition: 'New',
    year: 2026,
    spec: 'Foldable Dual Screen, 512GB',
    rating: 4.7,
    reviews: 180,
    icon: '📱',
    usd: 1050,
    tzs: 27562500,
    ntzs: 27562500,
    pi: 0.0334,
    description: 'Simu ya kukunja ya kisasa inayokupa nafasi ya kompyuta kibao na simu ya kawaida kwa pamoja.'
  },

  // --- SAA ZA KISASA (SMARTWATCHES) ---
  {
    id: 'wear-1',
    name: 'Apple Watch Ultra 3 (Titanium Case)',
    category: 'wearable',
    brand: 'Apple',
    condition: 'New',
    year: 2026,
    spec: 'GPS + Cellular, Ocean Band',
    rating: 4.9,
    reviews: 230,
    icon: '⌚',
    usd: 799,
    tzs: 20973375,
    ntzs: 20973375,
    pi: 0.0254,
    description: 'Saa thabiti na ya kisasa kwa ajili ya michezo mikali, kupiga mbizi na ufuatiliaji wa afya.'
  },
  {
    id: 'wear-2',
    name: 'Samsung Galaxy Watch 8 Classic',
    category: 'wearable',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Rotating Bezel, Body Composition',
    rating: 4.8,
    reviews: 195,
    icon: '⌚',
    usd: 420,
    tzs: 11025000,
    ntzs: 11025000,
    pi: 0.0134,
    description: 'Saa yenye muonekano wa asili wa kikale na teknolojia ya kisasa ya kupima mapigo ya moyo na usingizi.'
  },

  // --- REDIO NA SPIKA ZA BLUETOOTH (AUDIO) ---
  {
    id: 'audio-1',
    name: 'JBL PartyBox Ultimate Wireless Speaker',
    category: 'audio',
    brand: 'JBL',
    condition: 'New',
    year: 2026,
    spec: '1100W Massive Sound & Lights',
    rating: 4.9,
    reviews: 290,
    icon: '🔊',
    usd: 1499,
    tzs: 39347375,
    ntzs: 39347375,
    pi: 0.0477,
    description: 'Spika kubwa ya burudani yenye sauti isiyo na kifani, mwangaza wa disco na ulinzi wa maji.'
  },
  {
    id: 'audio-2',
    name: 'Sony Home Theater System 5.1ch Dolby Atmos',
    category: 'audio',
    brand: 'Sony',
    condition: 'New',
    year: 2026,
    spec: 'Wireless Rear Speakers & Subwoofer',
    rating: 4.8,
    reviews: 165,
    icon: '📻',
    usd: 850,
    tzs: 22282750,
    ntzs: 22282750,
    pi: 0.0270,
    description: 'Redio na mfumo kamili wa sauti wa ukumbi ndani ya nyumba yako kwa ajili ya sinema na muziki.'
  },

  // --- SAMANI ZA KISASA (FURNITURE - VITI NA MEZA) ---
  {
    id: 'furn-1',
    name: 'Ergonomic Executive Office Chair & Desk Set',
    category: 'furniture',
    brand: 'Herman Miller',
    condition: 'New',
    year: 2026,
    spec: 'Adjustable Mesh Chair + Solid Wood Desk',
    rating: 4.9,
    reviews: 140,
    icon: '🪑',
    usd: 1250,
    tzs: 32812500,
    ntzs: 32812500,
    pi: 0.0397,
    description: 'Seti ya meza na kiti cha kisasa cha ofisini kilichoundwa kulinda mgongo wako wakati wa kazi ndefu.'
  },
  {
    id: 'furn-2',
    name: 'Modern L-Shaped Velvet Living Room Sofa Set',
    category: 'furniture',
    brand: 'Ashley Furniture',
    condition: 'New',
    year: 2026,
    spec: 'Luxurious 6-Seater Sectional',
    rating: 4.8,
    reviews: 210,
    icon: '🛋️',
    usd: 1800,
    tzs: 47250000,
    ntzs: 47250000,
    pi: 0.0573,
    description: 'Kochi la kifahari la umbo la L lenye ulaini wa hali ya juu kupendezesha sebule yako.'
  },
  {
    id: 'furn-3',
    name: 'Italian Glass Top Dining Table Set (8 Seaters)',
    category: 'furniture',
    brand: 'Milano Design',
    condition: 'New',
    year: 2026,
    spec: 'Tempered Glass + Leather Chairs',
    rating: 4.9,
    reviews: 95,
    icon: '🪑',
    usd: 1500,
    tzs: 39375000,
    ntzs: 39375000,
    pi: 0.0477,
    description: 'Meza ya kisasa ya kulia chakula ya vioo vigumu ikiambatana na viti 8 vya ngozi vya kupendeza.'
  },

  // --- MASHINE ZA KUFUA NGUO & TV ---
  {
    id: 'app-1',
    name: 'Samsung Bespoke AI Smart Washing Machine & Dryer (12kg)',
    category: 'appliance',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Washer & Dryer Combo',
    rating: 4.9,
    reviews: 240,
    icon: '🧺',
    usd: 950,
    tzs: 2493750,
    ntzs: 2493750,
    pi: 0.0030,
    description: 'Mashine ya kisasa inayofua na kukausha nguo yenyewe kwa teknolojia ya AI.'
  },
  {
    id: 'app-2',
    name: 'LG OLED evo C4 85-Inch 4K Smart TV',
    category: 'appliance',
    brand: 'LG',
    condition: 'New',
    year: 2026,
    spec: 'OLED 120Hz Cinema Display',
    rating: 5.0,
    reviews: 410,
    icon: '📺',
    usd: 2999,
    tzs: 7872375,
    ntzs: 7872375,
    pi: 0.0095,
    description: 'Televisheni kubwa yenye rangi za kuvutia na sauti ya ukumbi wa sinema.'
  },
  {
    id: 'app-3',
    name: 'Samsung 75-Inch Neo QLED 8K Smart TV',
    category: 'appliance',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Quantum Matrix Pro',
    rating: 4.9,
    reviews: 320,
    icon: '📺',
    usd: 3499,
    tzs: 9184725,
    ntzs: 9184725,
    pi: 0.0111,
    description: 'Ufafanuzi wa kipekee wa 8K kwa ajili ya wataalamu na wapenda burudani wa hali ya juu.'
  },

  // --- VYOMBO VYA NDANI & JIKO (KITCHEN & APPLIANCES) ---
  {
    id: 'app-4',
    name: 'Bosch Smart Double-Door Gas & Electric Cooker',
    category: 'appliance',
    brand: 'Bosch',
    condition: 'New',
    year: 2026,
    spec: 'Oven + 4 Gas / 2 Electric Burners',
    rating: 4.8,
    reviews: 175,
    icon: '🍳',
    usd: 850,
    tzs: 2228275,
    ntzs: 2228275,
    pi: 0.0027,
    description: 'Jiko bora la gesi na umeme lenye oveni kubwa ya kisasa ya kuchoma keki na nyama.'
  },
  {

    id: 'app-5',
    name: 'Samsung Bespoke AI Family Hub Smart Refrigerator',
    category: 'appliance',
    brand: 'Samsung',
    condition: 'New',
    year: 2026,
    spec: 'Multi-Door Smart Fridge',
    rating: 4.9,
    reviews: 210,
    icon: '🧊',
    usd: 1850,
    tzs: 4854775,
    ntzs: 4854775,
    pi: 0.0058,
    description: 'Jokofu lenye skrini ya smart, linalokusaidia kuangalia vyakula na kuunganisha vifaa vya nyumbani.'
  },
  {
    
    id: 'app-6',
    name: 'Royal Porcelain Dinnerware Set (72 Pieces)',
    category: 'appliance',
    brand: 'Royal Albert',
    condition: 'New',
    year: 2026,
    spec: 'Luxury Gold Trim Tableware',
    rating: 4.9,
    reviews: 155,
    icon: '🍽️',
    usd: 350,
    tzs: 918750,
    ntzs: 918750,
    pi: 0.0011,
    description: 'Seti ya vyombo vya chakula vya kifahari vilivyotengenezwa kwa udongo safi wenye mapambo ya dhahabu.'
  }
];
