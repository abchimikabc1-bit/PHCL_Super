'use client';

import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Settings,
  ShoppingCart,
  User,
} from 'lucide-react';

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string }
>;

interface CustomIconProps {
  size?: number;
}

interface NavLinkProps {
  href: string;
  icon?: IconComponent;
  customIcon?: ComponentType<CustomIconProps>;
  label: string;
  active: boolean;
  activeColor: string;
  isDisco?: boolean;
}

const HIDDEN_ROUTES = [
  '/login',
  '/signup',
  '/privacy-policy',
  '/terms-of-service',
];

function PhclGoldWallet({ size = 22 }: CustomIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="[w3.org](http://www.w3.org/2000/svg)"
      className="animate-pulse"
      aria-hidden="true"
    >
      <path
        d="M3 6h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        fill="url(#phcl-wallet-gold)"
        stroke="#fbbf24"
        strokeWidth="1"
      />
      <path
        d="M11 9h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"
        fill="#0f172a"
        stroke="#fbbf24"
        strokeWidth="1"
      />
      <circle
        cx="13"
        cy="12"
        r="1.5"
        fill="url(#phcl-wallet-gold)"
      />
      <text
        x="4"
        y="14"
        fill="#0f172a"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        PHCL
      </text>

      <defs>
        <linearGradient
          id="phcl-wallet-gold"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PhclAiStar({ size = 20 }: CustomIconProps) {
  return (
    <div className="flex items-center justify-center rounded-full border border-violet-500/45 bg-violet-950/50 p-1.5 shadow-[0_0_18px_rgba(109,40,217,0.85)]">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="[w3.org](http://www.w3.org/2000/svg)"
        className="animate-pulse"
        aria-hidden="true"
      >
        <path
          d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"
          fill="url(#phcl-ai-gradient)"
        />

        <defs>
          <linearGradient
            id="phcl-ai-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="35%" stopColor="#c084fc" />
            <stop offset="70%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();

  const shouldHideNavbar = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (shouldHideNavbar) {
    return null;
  }

  return (
    <nav
      aria-label="Main mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-amber-500 bg-slate-950/90 shadow-[0_-4px_25px_rgba(245,158,11,0.35)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-6 items-center px-1">
        <NavLink
          href="/marketplace"
          icon={ShoppingCart}
          label="Shop"
          active={isRouteActive(pathname, '/marketplace')}
          activeColor="text-emerald-400"
        />

        <NavLink
          href="/exchange"
          icon={ArrowLeftRight}
          label="Exchange"
          active={isRouteActive(pathname, '/exchange')}
          activeColor="text-indigo-400"
          isDisco={!isRouteActive(pathname, '/exchange')}
        />

        <NavLink
          href="/wallet"
          customIcon={PhclGoldWallet}
          label="Wallet"
          active={isRouteActive(pathname, '/wallet')}
          activeColor="text-amber-400"
        />

        <NavLink
          href="/profile"
          icon={User}
          label="Profile"
          active={isRouteActive(pathname, '/profile')}
          activeColor="text-pink-400"
        />

        <NavLink
          href="/settings"
          icon={Settings}
          label="Settings"
          active={isRouteActive(pathname, '/settings')}
          activeColor="text-slate-300"
        />

        <NavLink
          href="/chat"
          customIcon={PhclAiStar}
          label="AI Chat"
          active={isRouteActive(pathname, '/chat')}
          activeColor="text-violet-300"
        />
      </div>

      <style jsx>{`
        @keyframes disco-light {
          0%,
          100% {
            color: #a78bfa;
            filter: drop-shadow(0 0 2px #a78bfa);
          }

          33% {
            color: #f472b6;
            filter: drop-shadow(0 0 2px #f472b6);
          }

          66% {
            color: #22d3ee;
            filter: drop-shadow(0 0 2px #22d3ee);
          }
        }

        .animate-disco {
          animation: disco-light 3s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-disco {
            animation: none;
          }
        }
      `}</style>
    </nav>
  );
}

function NavLink({
  href,
  icon: Icon,
  customIcon: CustomIcon,
  label,
  active,
  activeColor,
  isDisco = false,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 transition duration-300 ${
        active
          ? `${activeColor} scale-105 font-black drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]`
          : isDisco
            ? 'animate-disco'
            : 'text-slate-400 hover:text-white'
      }`}
    >
      {CustomIcon ? (
        <CustomIcon size={22} />
      ) : Icon ? (
        <Icon
          size={22}
          className={isDisco ? 'animate-disco' : undefined}
          aria-hidden="true"
        />
      ) : null}

      <span className="max-w-full truncate text-[9px] font-semibold tracking-tight sm:text-[10px]">
        {label}
      </span>
    </Link>
  );
}
