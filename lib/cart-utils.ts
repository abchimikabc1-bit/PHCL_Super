export const getCartTotal = (items: { price: number; quantity: number }[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};
