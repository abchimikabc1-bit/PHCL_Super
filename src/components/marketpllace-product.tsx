// components/marketplace-products.tsx
'use client';

import React, { useState } from 'react';

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

export const products: Product[] = [
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

interface CheckoutProps {
  darkMode?: boolean;
  total: number;
  currency: string;
  language?: 'sw' | 'en';
  onMobilePaymentDetailsChange?: (details: MobilePaymentDetails) => void;
  onCompletePurchase: (paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi', details?: MobilePaymentDetails) => void;
  canCompletePurchase: boolean;
  isSubmitting: boolean;
  onBlockedPurchase?: (reason: string) => void;
  allowPiPayments?: boolean;
}

export function Checkout({
  total,
  currency,
  language = 'sw',
  onMobilePaymentDetailsChange,
  onCompletePurchase,
  canCompletePurchase,
  isSubmitting,
  onBlockedPurchase,
  allowPiPayments = true,
}: CheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('tzs');
  const [network, setNetwork] = useState<'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa'>('mpesa');
  const [phone, setPhone] = useState('');

  const isSwahili = language === 'sw';

  const handleMobileChange = (net: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa', ph: string) => {
    setNetwork(net);
    setPhone(ph);
    if (onMobilePaymentDetailsChange) {
      onMobilePaymentDetailsChange({ network: net, phone: ph });
    }
  };

  const handleCheckoutClick = () => {
    if (!canCompletePurchase) {
      if (onBlockedPurchase) {
        onBlockedPurchase('shipping_or_policy');
      }
      return;
    }
    onCompletePurchase(selectedMethod, { network, phone });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white max-w-xl mx-auto backdrop-blur-md">
      <h2 className="text-xl font-bold mb-4">{isSwahili ? 'Sehemu ya Malipo (Checkout)' : 'Checkout Payment'}</h2>
      
      <div className="mb-4">
        <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Chagua Njia ya Malipo' : 'Select Payment Method'}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedMethod('tzs')}
            className={`rounded-lg p-2 text-xs font-semibold border ${selectedMethod === 'tzs' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300'}`}
          >
            TZS (M-Pesa/Tigo)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('ntzs')}
            className={`rounded-lg p-2 text-xs font-semibold border ${selectedMethod === 'ntzs' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300'}`}
          >
            nTZS (Wallet)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('usd')}
            className={`rounded-lg p-2 text-xs font-semibold border ${selectedMethod === 'usd' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300'}`}
          >
            USD ($)
          </button>
          {allowPiPayments && (
            <button
              type="button"
              onClick={() => setSelectedMethod('pi')}
              className={`rounded-lg p-2 text-xs font-semibold border ${selectedMethod === 'pi' ? 'bg-yellow-600 border-yellow-400 text-slate-900' : 'bg-slate-800 border-white/10 text-slate-300'}`}
            >
              PI Network
            </button>
          )}
        </div>
      </div>

      {(selectedMethod === 'tzs' || selectedMethod === 'ntzs') && (
        <div className="mb-4 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Mtandao wa Simu' : 'Mobile Network'}</label>
            <select
              value={network}
              onChange={(e) => handleMobileChange(e.target.value as any, phone)}
              className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="mpesa">Vodacom M-Pesa</option>
              <option value="tigopesa">Tigo Pesa</option>
              <option value="airtelmoney">Airtel Money</option>
              <option value="halopesa">HaloPesa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Namba ya Simu ya Malipo' : 'Payment Phone Number'}</label>
            <input
              type="tel"
              placeholder="+255 7XX XXX XXX"
              value={phone}
              onChange={(e) => handleMobileChange(network, e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center border-t border-white/10 pt-4">
        <span className="text-slate-300">{isSwahili ? 'Jumla ya Malipo:' : 'Total Amount:'}</span>
        <span className="font-bold text-emerald-400 text-lg">{currency.toUpperCase()} {total.toLocaleString()}</span>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleCheckoutClick}
        className={`w-full rounded-lg py-3 text-sm font-bold text-white transition shadow-lg ${
          canCompletePurchase ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (isSwahili ? 'Inachakata...' : 'Processing...') : (isSwahili ? 'Kamilisha Ununuzi' : 'Complete Purchase')}
      </button>
    </div>
  );
}

// Hili ndilo lililokosekana na nime liongeza!
export default Checkout;
