export const getProductPrice = (product: any, currency: string) => {
  if (currency === 'tzs') return product.tzs;
  if (currency === 'usd') return product.usd;
  if (currency === 'pi') return product.pi;
  return product.usd;
};

export const getCurrencySymbol = (currency: string) => {
  if (currency === 'tzs') return 'TSh';
  if (currency === 'usd') return '$';
  if (currency === 'pi') return 'Π';
  return '$';
};

export const getCurrencyColor = (currency: string) => {
  if (currency === 'tzs') return 'text-black font-bold';
  if (currency === 'usd') return 'text-yellow-600 font-bold';
  if (currency === 'pi') return 'text-purple-600 font-bold';
  return 'text-yellow-600 font-bold';
};
