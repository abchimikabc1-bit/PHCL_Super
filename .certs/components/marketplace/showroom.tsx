'use client';

import { products } from './products-data';

interface ShowroomProps {
  darkMode: boolean;
  language?: string;
  onAddToCart: (product: any) => void;
}

export function Showroom({ darkMode, language = 'en', onAddToCart }: ShowroomProps) {
  const titles = {
    en: { heading: 'Car Showroom 2024', subtitle: 'Premium selection of new vehicles', buy: 'Buy Now', specs: 'Specs' },
    sw: { heading: 'Duka la Magari 2024', subtitle: 'Magari bora ya soko', buy: 'Nunua Sasa', specs: 'Maelezo' }
  };
  const t = titles[language as keyof typeof titles] || titles['en'];
  const cars = products.filter(p => p.category === 'car');
  
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-amber-50'} rounded-lg p-6`}>
      <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : ''}`}>{t.heading}</h2>
      <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.subtitle}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.map((car) => (
          <div key={car.id} className={`border-2 rounded-lg overflow-hidden transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-700 border-cyan-600 hover:border-cyan-400' : 'bg-gradient-to-br from-white to-blue-50 border-blue-300 hover:border-cyan-500'}`}>
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white">
              <h3 className="text-xl font-bold">{car.name}</h3>
              <p className="text-sm text-blue-100">{car.year} Model • {car.fuel} Engine</p>
            </div>
            
            <div className={`h-40 flex items-center justify-center text-6xl ${darkMode ? 'bg-gray-600' : 'bg-blue-100'}`}>
              {car.icon}
            </div>
            
            {/* Car Details */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${car.condition === 'New' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
                  {car.condition}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-sm">★ {car.rating}</span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>({car.reviews})</span>
                </div>
              </div>
              
              {/* Pricing */}
              <div className={`space-y-2 mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-blue-50'}`}>
                <p className="font-bold text-black">TSh {car.tzs.toLocaleString()}</p>
                <p className="font-bold text-lg text-yellow-600">${car.usd.toLocaleString('en-US', {maximumFractionDigits: 2})}</p>
                <p className="font-bold text-purple-600">Π {car.pi.toFixed(2)}</p>
              </div>
              
              {/* Specs */}
              <div className={`text-xs space-y-1 mb-4 p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                <p>Year: {car.year}</p>
                <p>Fuel: {car.fuel}</p>
                <p>Status: {car.condition}</p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2">
                <button onClick={() => { onAddToCart(car); alert(`${language === 'sw' ? 'Bidhaa imeongezwa kwenye karata' : 'Product added to cart'}!`); }} className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-lg transition-all text-sm">{t.buy}</button>
                <button onClick={() => alert(`${language === 'sw' ? 'Ajali ya mtihani imechelewa' : 'Test drive scheduled'}!`)} className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all text-sm">{t.specs}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
