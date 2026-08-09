// Analytics & Event Tracking Service for PHCL Super

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'product_added_to_cart'
  | 'product_removed_from_cart'
  | 'checkout_started'
  | 'purchase_completed'
  | 'user_signup'
  | 'user_login'
  | 'search_performed'
  | 'filter_applied'
  | 'favorite_toggled'
  | 'notification_clicked';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  sessionId: string;
  userAgent: string;
  referrer: string;
}

export interface UserAnalytics {
  userId: string;
  totalSessions: number;
  totalEvents: number;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  lastActive: Date;
  firstSeen: Date;
  devices: string[];
  referringSources: string[];
}

export interface PageAnalytics {
  page: string;
  views: number;
  uniqueUsers: number;
  avgTimeSpent: number; // in seconds
  bounceRate: number; // 0-100%
  topReferrers: string[];
}

export interface ProductAnalytics {
  productId: number;
  name: string;
  views: number;
  addToCartClicks: number;
  conversionRate: number; // views to purchase
  totalSales: number;
  revenue: number;
}

const ANALYTICS_STORAGE_KEY = 'phcl_analytics';
const SESSION_STORAGE_KEY = 'phcl_session_id';
const EVENTS_STORAGE_KEY = 'phcl_events';

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private startTime: Date;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startTime = new Date();
    this.trackPageView(window.location.pathname);
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  trackEvent(type: EventType, data: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: this.userId,
      timestamp: new Date(),
      data,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'direct',
    };

    this.saveEvent(event);
    console.log('[v0] Analytics event tracked:', {
      type: event.type,
      userId: event.userId,
      data: event.data,
    });

    return event;
  }

  trackPageView(page: string) {
    return this.trackEvent('page_view', { page, referrer: document.referrer });
  }

  trackProductView(productId: number, productName: string) {
    return this.trackEvent('product_view', { productId, productName });
  }

  trackAddToCart(productId: number, productName: string, price: number, quantity: number) {
    return this.trackEvent('product_added_to_cart', {
      productId,
      productName,
      price,
      quantity,
      value: price * quantity,
    });
  }

  trackRemoveFromCart(productId: number, productName: string) {
    return this.trackEvent('product_removed_from_cart', { productId, productName });
  }

  trackCheckoutStarted(cartValue: number, itemCount: number) {
    return this.trackEvent('checkout_started', { cartValue, itemCount });
  }

  trackPurchaseCompleted(orderId: string, totalAmount: number, paymentMethod: string) {
    return this.trackEvent('purchase_completed', {
      orderId,
      totalAmount,
      paymentMethod,
      currency: 'USD',
    });
  }

  trackUserSignup(signupMethod: 'email' | 'pi_network') {
    return this.trackEvent('user_signup', { signupMethod });
  }

  trackUserLogin(loginMethod: 'email' | 'pi_network') {
    return this.trackEvent('user_login', { loginMethod });
  }

  trackSearch(query: string, resultsCount: number) {
    return this.trackEvent('search_performed', { query, resultsCount });
  }

  trackFilterApplied(filterType: string, filterValue: string) {
    return this.trackEvent('filter_applied', { filterType, filterValue });
  }

  trackFavoriteToggled(productId: number, isFavorited: boolean) {
    return this.trackEvent('favorite_toggled', { productId, isFavorited });
  }

  trackNotificationClick(notificationId: string, notificationType: string) {
    return this.trackEvent('notification_clicked', { notificationId, notificationType });
  }

  private saveEvent(event: AnalyticsEvent) {
    try {
      const events = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) || '[]');
      events.push(event);
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.shift();
      }
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.log('[v0] Error saving analytics event:', error);
    }
  }

  getEvents(filter?: { type?: EventType; userId?: string; limit?: number }): AnalyticsEvent[] {
    try {
      let events = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) || '[]');

      if (filter?.type) {
        events = events.filter((e: AnalyticsEvent) => e.type === filter.type);
      }
      if (filter?.userId) {
        events = events.filter((e: AnalyticsEvent) => e.userId === filter.userId);
      }

      if (filter?.limit) {
        events = events.slice(-filter.limit);
      }

      return events;
    } catch {
      return [];
    }
  }

  getUserAnalytics(userId: string): UserAnalytics {
    const userEvents = this.getEvents({ userId });
    const purchases = userEvents.filter((e) => e.type === 'purchase_completed');
    const totalSpent = purchases.reduce((sum, e) => sum + (e.data.totalAmount || 0), 0);

    return {
      userId,
      totalSessions: new Set(userEvents.map((e) => e.sessionId)).size,
      totalEvents: userEvents.length,
      totalPurchases: purchases.length,
      totalSpent,
      averageOrderValue: purchases.length > 0 ? totalSpent / purchases.length : 0,
      lastActive: userEvents.length > 0 ? userEvents[userEvents.length - 1].timestamp : new Date(),
      firstSeen: userEvents.length > 0 ? userEvents[0].timestamp : new Date(),
      devices: [...new Set(userEvents.map((e) => this.parseUserAgent(e.userAgent)))],
      referringSources: [...new Set(userEvents.map((e) => e.referrer))],
    };
  }

  getPageAnalytics(page: string): PageAnalytics {
    const pageEvents = this.getEvents({ type: 'page_view', limit: 1000 }).filter(
      (e) => e.data.page === page
    );

    return {
      page,
      views: pageEvents.length,
      uniqueUsers: new Set(pageEvents.map((e) => e.userId)).size,
      avgTimeSpent: 0, // Would need more complex tracking
      bounceRate: 0, // Would need session tracking
      topReferrers: this.getTopValues(pageEvents.map((e) => e.referrer), 5),
    };
  }

  getProductAnalytics(productId: number): ProductAnalytics {
    const allEvents = this.getEvents({ limit: 10000 });
    const productViews = allEvents.filter(
      (e) => e.type === 'product_view' && e.data.productId === productId
    );
    const addToCart = allEvents.filter(
      (e) => e.type === 'product_added_to_cart' && e.data.productId === productId
    );
    const purchases = allEvents.filter(
      (e) => e.type === 'purchase_completed' && e.data.orderId
    );

    const productName = productViews[0]?.data.productName || `Product ${productId}`;
    const totalRevenue = addToCart.reduce((sum, e) => sum + (e.data.value || 0), 0);

    return {
      productId,
      name: productName,
      views: productViews.length,
      addToCartClicks: addToCart.length,
      conversionRate: productViews.length > 0 ? (addToCart.length / productViews.length) * 100 : 0,
      totalSales: addToCart.length,
      revenue: totalRevenue,
    };
  }

  private parseUserAgent(userAgent: string): string {
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  private getTopValues(values: string[], limit: number): string[] {
    const counts = new Map<string, number>();
    values.forEach((v) => {
      counts.set(v, (counts.get(v) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([v]) => v);
  }

  clearEvents() {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    console.log('[v0] Analytics events cleared');
  }
}

export const analytics = new AnalyticsService();
