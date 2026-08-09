// Multi-currency product pricing utilities
// Automatically converts product prices to all supported currencies

import { MARKETPLACE_PRODUCTS } from './marketplace-products';
import { CURRENCY_RATES, CURRENCIES } from './currencies';
import { convertCurrency } from './currency-converter';

export interface PricedProduct {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  seller: string;
  prices: {
    USD: number;
    [key: string]: number;
  };
  formattedPrices: {
    USD: string;
    [key: string]: string;
  };
}

// Get product with all currency prices
export const getProductWithAllPrices = (productId: number): PricedProduct | null => {
  const product = MARKETPLACE_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  const prices: PricedProduct['prices'] = {
    USD: product.priceUSD,
  };

  const formattedPrices: PricedProduct['formattedPrices'] = {
    USD: `$${product.priceUSD.toFixed(2)}`,
  };

  // Add all other currencies
  Object.entries(CURRENCY_RATES).forEach(([currency, rate]) => {
    if (currency !== 'USD') {
      const convertedPrice = product.priceUSD * rate;
      prices[currency] = convertedPrice;

      const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
      const symbol = currencyInfo?.symbol || currency;

      // Format based on currency type
      let formatted: string;
      if (currency.includes('BTC') || currency.includes('ETH')) {
        formatted = `${symbol} ${convertedPrice.toFixed(8)}`;
      } else if (convertedPrice < 1) {
        formatted = `${symbol} ${convertedPrice.toFixed(6)}`;
      } else if (convertedPrice < 1000) {
        formatted = `${symbol} ${convertedPrice.toFixed(2)}`;
      } else {
        formatted = `${symbol} ${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      formattedPrices[currency] = formatted;
    }
  });

  return {
    ...product,
    prices,
    formattedPrices,
  };
};

// Get all products with prices in specific currencies
export const getProductsWithPrices = (
  currencies: string[] = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'TZS', 'PI']
): PricedProduct[] => {
  return MARKETPLACE_PRODUCTS.map((product) => {
    const prices: PricedProduct['prices'] = {
      USD: product.priceUSD,
    };

    const formattedPrices: PricedProduct['formattedPrices'] = {
      USD: `$${product.priceUSD.toFixed(2)}`,
    };

    currencies.forEach((currency) => {
      if (currency !== 'USD' && CURRENCY_RATES[currency]) {
        const rate = CURRENCY_RATES[currency];
        const convertedPrice = product.priceUSD * rate;
        prices[currency] = convertedPrice;

        const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
        const symbol = currencyInfo?.symbol || currency;

        let formatted: string;
        if (currency === 'BTC' || currency === 'ETH') {
          formatted = `${symbol} ${convertedPrice.toFixed(8)}`;
        } else if (convertedPrice < 1) {
          formatted = `${symbol} ${convertedPrice.toFixed(6)}`;
        } else if (convertedPrice < 1000) {
          formatted = `${symbol} ${convertedPrice.toFixed(2)}`;
        } else {
          formatted = `${symbol} ${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        formattedPrices[currency] = formatted;
      }
    });

    return {
      ...product,
      prices,
      formattedPrices,
    };
  });
};

// Get product price in specific currency
export const getProductPrice = (
  productId: number,
  currency: string = 'USD'
): { formatted: string; numeric: number } | null => {
  const product = MARKETPLACE_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  if (currency === 'USD') {
    return {
      formatted: `$${product.priceUSD.toFixed(2)}`,
      numeric: product.priceUSD,
    };
  }

  const rate = CURRENCY_RATES[currency];
  if (!rate) return null;

  const convertedPrice = product.priceUSD * rate;
  const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
  const symbol = currencyInfo?.symbol || currency;

  let formatted: string;
  if (currency === 'BTC' || currency === 'ETH') {
    formatted = `${symbol} ${convertedPrice.toFixed(8)}`;
  } else if (convertedPrice < 1) {
    formatted = `${symbol} ${convertedPrice.toFixed(6)}`;
  } else if (convertedPrice < 1000) {
    formatted = `${symbol} ${convertedPrice.toFixed(2)}`;
  } else {
    formatted = `${symbol} ${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return {
    formatted,
    numeric: convertedPrice,
  };
};

// Get cheapest and most expensive products in a currency
export const getPriceRange = (currency: string = 'USD') => {
  const allPrices = MARKETPLACE_PRODUCTS.map((p) => {
    if (currency === 'USD') {
      return p.priceUSD;
    }
    return (p.priceUSD * (CURRENCY_RATES[currency] || 1));
  });

  return {
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
    average: allPrices.reduce((a, b) => a + b, 0) / allPrices.length,
  };
};

// Filter products by price range in specific currency
export const filterProductsByPrice = (
  minPrice: number,
  maxPrice: number,
  currency: string = 'USD'
) => {
  return MARKETPLACE_PRODUCTS.filter((product) => {
    let price = product.priceUSD;
    if (currency !== 'USD') {
      price = product.priceUSD * (CURRENCY_RATES[currency] || 1);
    }
    return price >= minPrice && price <= maxPrice;
  });
};

// Get products by category with pricing
export const getProductsByCategory = (
  category: string,
  currency: string = 'USD'
): PricedProduct[] => {
  return getProductsWithPrices([currency]).filter((p) => p.category === category);
};

// Get all unique product categories
export const getProductCategories = (): string[] => {
  const categories = new Set(MARKETPLACE_PRODUCTS.map((p) => p.category));
  return Array.from(categories);
};

// Get trending products (by rating and reviews)
export const getTrendingProducts = (limit: number = 10): PricedProduct[] => {
  const sorted = [...MARKETPLACE_PRODUCTS]
    .sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews))
    .slice(0, limit);

  return getProductsWithPrices(['USD', 'BTC', 'ETH', 'EUR']).slice(0, limit);
};

// Get products with discount simulation
export const getProductsWithDiscount = (
  discountPercent: number,
  currency: string = 'USD'
): PricedProduct[] => {
  const products = getProductsWithPrices([currency]);
  return products.map((p) => {
    const discountedPrices: PricedProduct['prices'] = { USD: p.prices.USD } as PricedProduct['prices'];
    const discountedFormatted: PricedProduct['formattedPrices'] = { USD: p.formattedPrices.USD } as PricedProduct['formattedPrices'];

    Object.entries(p.prices).forEach(([curr, price]) => {
      const discounted = price * (1 - discountPercent / 100);
      discountedPrices[curr] = discounted;

      const currencyInfo = CURRENCIES[curr as keyof typeof CURRENCIES];
      const symbol = currencyInfo?.symbol || curr;

      let formatted: string;
      if (curr === 'BTC' || curr === 'ETH') {
        formatted = `${symbol} ${discounted.toFixed(8)}`;
      } else if (discounted < 1) {
        formatted = `${symbol} ${discounted.toFixed(6)}`;
      } else {
        formatted = `${symbol} ${discounted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      discountedFormatted[curr] = formatted;
    });

    return {
      ...p,
      prices: discountedPrices,
      formattedPrices: discountedFormatted,
    };
  });
};
