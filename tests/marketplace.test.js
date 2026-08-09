/**
 * Automated Security & Tier-Gated Access Tests for International Marketplace
 */

const assert = require('assert');
const { MarketplaceService } = require('../marketplace_service');

describe('Marketplace Security & Tier Access Guards', () => {
  let service;

  beforeEach(() => {
    service = new MarketplaceService();
  });

  test('Allows public listing queries', () => {
    const products = service.getAllListings();
    assert(products.length >= 2, 'Should return initial seed products');
  });

  test('Blocks Tier 0 / Tier 1 user from creating product listings (Tier 2 Required)', () => {
    const unverifiedUser = { uid: 'usr_tier1', kycTier: 1, email: 't1@domain.com' };

    assert.throws(
      () =>
        service.createListing(unverifiedUser, {
          title: 'Unauthorised Listing Item',
          price: 50,
        }),
      /Ufikiaji Umekataliwa: Lazima ukamilishe Uhakiki wa Tier 2 KYC/,
      'Tier 1 user must not be allowed to post products'
    );
  });

  test('Allows Tier 2 Verified user to create product listings', () => {
    const tier2User = { uid: 'usr_tier2', kycTier: 2, displayName: 'Verified Seller' };

    const item = service.createListing(tier2User, {
      title: 'Authentic Tanzanite Ring 18K Gold',
      description: 'Certified 2.5 carat blue Tanzanite gemstone.',
      price: 850,
      category: 'Jewelry',
    });

    assert.strictEqual(item.sellerKycTier, 2);
    assert.strictEqual(item.status, 'ACTIVE');
  });

  test('Blocks Tier 2 buyer from purchasing high-value items exceeding $1,000 (Tier 3 Required)', () => {
    const tier2Buyer = { uid: 'usr_buyer_t2', kycTier: 2, email: 'buyer2@domain.com' };
    const expensiveItem = Array.from(service.listings.values()).find((i) => i.price > 1000);

    assert.throws(
      () => service.purchaseListing(tier2Buyer, expensiveItem.id),
      /Ufikiaji Umekataliwa: Muamala huu unazidi \$1,000. Lazima ukamilishe Tier 3 KYC/,
      'High-value transactions must require Tier 3 KYC'
    );
  });

  test('Allows Tier 3 Verified buyer to complete high-value transactions', () => {
    const tier3Buyer = { uid: 'usr_buyer_t3', kycTier: 3, email: 'buyer3@domain.com' };
    const expensiveItem = Array.from(service.listings.values()).find((i) => i.price > 1000);

    const order = service.purchaseListing(tier3Buyer, expensiveItem.id);
    assert.strictEqual(order.buyerId, 'usr_buyer_t3');
    assert.strictEqual(order.price, expensiveItem.price);
  });
});
