"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  showChat?: boolean;
}

export default function Header({ showChat = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, switchLanguage } = useLanguage();

  const getLabel = (en: string, sw: string) => language === "en" ? en : sw;
  
  const navItems = [
    { label: getLabel("Chat", "Mazungumzo"), href: "/chat" },
    { label: getLabel("Wallet", "Wallet"), href: "/wallet" },
    { label: getLabel("Trading", "Biashara"), href: "/live-market" },
    { label: getLabel("Convert", "Badili"), href: "/converter" },
    { label: getLabel("Marketplace", "Soko"), href: "/marketplace" },
    { label: getLabel("Profile", "Profaili"), href: "/profile" },
    { label: getLabel("Security", "Usalama"), href: "/security" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-purple-200/30 bg-gradient-to-r from-white/95 via-purple-50/80 to-white/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <div className="text-2xl font-bold text-purple-600">PiHCL</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:text-purple-600 hover:bg-purple-100/50 font-medium transition-all"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language Selector */}
            <div className="hidden sm:flex items-center gap-1">
              <button 
                onClick={() => switchLanguage(language === "en" ? "sw" : "en")}
                className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors text-gray-700 hover:text-purple-600 text-sm font-medium"
              >
                {language === "en" ? "SW" : "EN"}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-purple-100/50 rounded-lg transition-colors text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>

            {/* CTA Button */}
            <Link href="/" className="hidden sm:block">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {getLabel("Start Trading", "Anza Biashara")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Menu - Conditional Rendering */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-purple-200/30 bg-white/95 backdrop-blur-sm">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 hover:text-purple-600 hover:bg-purple-100/50 font-medium text-sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
