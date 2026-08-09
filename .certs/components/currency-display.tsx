"use client";

import React from "react";
import { CURRENCY_CONFIG, type Currency } from "@/lib/currency-config";

interface CurrencyDisplayProps {
  amount: number;
  currency: Currency;
  bold?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showCode?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency,
  bold = true,
  size = "md",
  showCode = false,
  className = "",
}: CurrencyDisplayProps) {
  const config = CURRENCY_CONFIG[currency];
  
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  return (
    <span className={`${config.textColor} ${sizeClasses[size]} ${className}`}>
      {config.symbol}
      {amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
      {showCode && <span className="ml-1 text-xs opacity-75">({config.code})</span>}
    </span>
  );
}


interface CurrencyBadgeProps {
  amount: number;
  currency: Currency;
  change?: number;
  className?: string;
}

export function CurrencyBadge({ amount, currency, change, className = "" }: CurrencyBadgeProps) {
  const config = CURRENCY_CONFIG[currency];
  const isPositive = change ? change > 0 : false;

  return (
    <div
      className={`px-3 py-2 rounded-lg border ${config.bgColor} ${className}`}
    >
      <div className={`font-bold ${config.textColor}`}>
        {config.symbol}
        {amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      {change !== undefined && (
        <div className={`text-xs font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
