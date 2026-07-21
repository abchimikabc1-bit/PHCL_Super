'use client';

interface FooterProps {
  darkMode: boolean;
}

export function Footer({ darkMode }: FooterProps) {
  return (
    <footer className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-100 border-slate-200'} border-t mt-8`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Branding */}
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 mb-4">
              <span className="text-3xl text-purple-600">Π</span>
              <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent">PHCL Super</span>
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              Cryptocurrency Trading Platform
            </p>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
              Trade Bitcoin, Ethereum, Pi Network and more. Shop, play games, and grow your crypto portfolio in one unified platform.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className={`font-bold mb-4 ${darkMode ? 'text-white' : ''}`}>Contact Us</h4>
            <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              <p>
                <span className="font-semibold">Email:</span> abchimikabc1@gmail.com
              </p>
              <p>
                <span className="font-semibold">Phone:</span> +255 693 863 356
              </p>
              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                Available Monday - Friday, 9:00 AM - 6:00 PM EAT
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`font-bold mb-4 ${darkMode ? 'text-white' : ''}`}>Quick Links</h4>
            <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              <li><a href="#chat" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Chat</a></li>
              <li><a href="#shop" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Shop</a></li>
              <li><a href="#showroom" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Showroom</a></li>
              <li><a href="#trading" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Trading</a></li>
              <li><a href="#games" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Games</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-slate-200'} py-6`}></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            © 2026 PHCL Super - Cryptocurrency Trading Platform
          </p>
          <div className={`flex gap-4 mt-4 md:mt-0 text-xs ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            <a href="#privacy" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Privacy Policy</a>
            <span className={`${darkMode ? 'text-gray-600' : 'text-slate-300'}`}>•</span>
            <a href="#terms" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Terms of Service</a>
            <span className={`${darkMode ? 'text-gray-600' : 'text-slate-300'}`}>•</span>
            <a href="#security" className={`hover:${darkMode ? 'text-white' : 'text-slate-900'} transition-colors`}>Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
