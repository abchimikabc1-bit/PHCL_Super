'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Settings, 
  ArrowLeftRight, 
  User 
} from 'lucide-react';

// 1. NEMBO MAALUM YA POCHI YA DHAHABU (GOLD WALLET SVG)
function PhclGoldWallet({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
      <path d="M3 6h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="url(#goldGrad)" stroke="#fbbf24" strokeWidth="1" />
      <path d="M11 9h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="13" cy="12" r="1.5" fill="url(#goldGrad)" />
      <text x="4" y="14" fill="#0f172a" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">PHCL</text>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 2. NEMBO YA KIFAHARI YA NYOTA YA AI (GLOWING PURPLE STAR SVG)
function PhclAiStar({ size = 20 }: { size?: number }) {
  return (
    <div className="rounded-full bg-violet-950/50 p-1.5 border border-violet-500/45 shadow-[0_0_18px_rgba(109,40,217,0.85)] flex items-center justify-center animate-pulse">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" fill="url(#aiGrad)" />
        <defs>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" /> {/* Pink/Fuchsia */}
            <stop offset="35%" stopColor="#c084fc" /> {/* Purple */}
            <stop offset="70%" stopColor="#22d3ee" /> {/* Cyan */}
            <stop offset="100%" stopColor="#818cf8" /> {/* Indigo */}
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  if (
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/privacy-policy' || 
    pathname === '/terms-of-service'
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 border-t-2 border-amber-500 backdrop-blur-xl z-50 shadow-[0_-4px_25px_rgba(245,158,11,0.35)]">
      {/* Msimbo wa CSS wa Discolight kwa ajili ya Exchange Icon */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes discoLight {
          0% { color: #a78bfa; filter: drop-shadow(0 0 2px #a78bfa); }     
          33% { color: #f472b6; filter: drop-shadow(0 0 2px #f472b6); }    
          66% { color: #22d3ee; filter: drop-shadow(0 0 2px #22d3ee); }    
          100% { color: #a78bfa; filter: drop-shadow(0 0 2px #a78bfa); }
        }
        .animate-disco {
          animation: discoLight 3s linear infinite;
        }
      `}} />

      <div className="max-w-6xl mx-auto px-2 flex justify-around h-16 items-center">
        <NavLink href="/marketplace" icon={ShoppingCart} label="Shop" active={pathname === '/marketplace'} activeColor="text-emerald-400" />
        
        {/* EXCHANGE CHENYE DISCOLIGHT */}
        <NavLink href="/exchange" icon={ArrowLeftRight} label="Exchange" active={pathname === '/exchange'} activeColor="text-indigo-400" isDisco={!(pathname === '/exchange')} />
        
        {/* WALLET YENYE UMBO MAALUM LA POCHI YA DHAHABU YA PHCL */}
        <NavLink href="/wallet" customIcon={PhclGoldWallet} label="Wallet" active={pathname === '/wallet'} activeColor="text-amber-400" />
        
        <NavLink href="/profile" icon={User} label="Profile" active={pathname === '/profile'} activeColor="text-pink-400" />
        <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} activeColor="text-slate-300" />
        
        {/* NYOTA YA AI - IMESHUSHWA KULIA KABISA KWA MUONEKANO WA KIFAHARI */}
        <NavLink href="/chat" customIcon={PhclAiStar} label="AI Chat" active={pathname === '/chat'} activeColor="text-violet-300" />
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, customIcon: CustomIcon, label, active, activeColor, isDisco }: any) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center gap-1 p-1 rounded-xl transition duration-300 ${
        active 
          ? `${activeColor} font-black scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]` 
          : isDisco 
            ? 'animate-disco text-xs' 
            : 'text-slate-400 hover:text-white'
      }`}
    >
      {CustomIcon ? <CustomIcon size={22} /> : Icon ? <Icon size={22} className={isDisco ? 'animate-disco' : ''} /> : null}
      <span className="text-[10px] tracking-tight font-semibold">{label}</span>
    </Link>
  );
}
