export function calculateDiscount(quantity: number, basePrice: number) {
  const discountTiers = [
    { min: 1, max: 2, discount: 0 },
    { min: 3, max: 4, discount: 10 },
    { min: 5, max: 9, discount: 20 },
    { min: 10, max: Infinity, discount: 25 },
  ];

  const tier = discountTiers.find((tier) => quantity >= tier.min && quantity <= tier.max);
  const discount = tier?.discount ?? 0;
  const total = basePrice * quantity;
  const discountAmount = (total * discount) / 100;

  return {
    discount,
    discountAmount,
    finalPrice: total - discountAmount,
  };
}

export function getActivePromos() {
  return [
    { code: 'SAVE10', discount: 10, description: '10% off your order' },
    { code: 'BULK15', discount: 15, description: '15% off for large orders' },
  ];
}

export function applyPromo(subtotal: number, promoCode: string, totalQuantity: number) {
  const promos = getActivePromos();
  const promo = promos.find((promo) => promo.code.toUpperCase() === promoCode.toUpperCase());

  if (!promo) {
    return { success: false, message: 'Promo code is invalid' };
  }

  if (promo.code === 'BULK15' && totalQuantity < 10) {
    return { success: false, message: 'BULK15 requires at least 10 items' };
  }

  return {
    success: true,
    message: `Promo ${promo.code} applied`,
    discountAmount: (subtotal * promo.discount) / 100,
  };
}
