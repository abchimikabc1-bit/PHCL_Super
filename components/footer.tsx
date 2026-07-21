"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { Mail, Phone, MapPin, Globe, ExternalLink } from "lucide-react";
import { PHCL_CONFIG, PHCL_COLORS } from "@/lib/phcl-config";

export default function Footer() {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              {language === "en" ? "Phcl Super" : "Phcl Super"}
            </h3>
            <p className="text-sm text-purple-200 mb-4">
              {language === "en"
                ? "Pi Hub Company Limited (PiHCL) - Leading cryptocurrency trading platform in East Africa"
                : "Pi Hub Company Limited (PiHCL) - Jukumu linaloongoza la biashara ya sarafu ya kripto katika Afrika Mashariki"}
            </p>
            <p className="text-xs text-purple-300 mb-3">
              {language === "en" ? "Developed by: Alfred Benard Chimika" : "Iliyotengenezwa na: Alfred Benard Chimika"}
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-purple-300 transition-colors">
                <Globe size={20} />
              </a>
              <a href="#" className="hover:text-purple-300 transition-colors">
                <ExternalLink size={20} />
              </a>
              <a href="#" className="hover:text-purple-300 transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">
              {language === "en" ? "Quick Links" : "Viungo Vya Haraka"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Home" : "Nyumbani"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "About" : "Kuhusu"}
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Wallet" : "Wallet"}
                </Link>
              </li>
              <li>
                <Link href="/live-market" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Trading" : "Biashara"}
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Marketplace" : "Soko"}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Profile" : "Profaili"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4">
              {language === "en" ? "Legal" : "Kisheria"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Privacy Policy" : "Sera ya Faragha"}
                </Link>
              </li>
              <li>
                <Link href="/legal" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Terms of Service" : "Masharti ya Huduma"}
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-purple-200 hover:text-white transition-colors">
                  {language === "en" ? "Security" : "Usalama"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4">
              {language === "en" ? "Contact & Developer" : "Wasiliana & Mtengenezaji"}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:support@phclsuper.app" className="text-purple-200 hover:text-white transition-colors">
                  support@phclsuper.app
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <a href="tel:+255693863356" className="text-purple-200 hover:text-white transition-colors">
                  +255 (0) 693 863 356
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-purple-200">
                  {language === "en" ? "Dar es Salaam, Tanzania" : "Dar es Salaam, Tanzania"}
                </span>
              </li>
              <li className="text-xs text-purple-300 mt-3 pt-3 border-t border-purple-700">
                <span className="font-semibold">{language === "en" ? "Developer" : "Mtengenezaji"}:</span> Alfred Chimika
                <br />
                <a href="mailto:abchimikabc@gmail.com" className="text-purple-200 hover:text-white transition-colors">
                  abchimikabc@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-purple-700 my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-purple-300">
          <p>
            &copy; {currentYear} Pi Hub Company Limited (PiHCL).{" "}
            {language === "en" ? "All rights reserved." : "Haki zote zimehifadhiwa."}
          </p>
          <p>
            {language === "en"
              ? "Phcl Super - Developed by Alfred Benard Chimika"
              : "Phcl Super - Iliyotengenezwa na Alfred Benard Chimika"}
          </p>
        </div>
      </div>
    </footer>
  );
}
