/**
 * Real-Time Push Notifications Engine (Firebase Cloud Messaging - FCM & In-App Alerts)
 * Manages instant notifications for KYC decisions, Payment Confirmations, Escrow Releases, and New Orders.
 */

class NotificationService {
  constructor() {
    this.userNotifications = new Map(); // Store user alert feeds
  }

  // 1. DISPATCH NOTIFICATION EVENT
  sendNotification(recipientUid, { title, message, type = 'GENERAL', data = {} }) {
    if (!recipientUid) return null;

    if (!this.userNotifications.has(recipientUid)) {
      this.userNotifications.set(recipientUid, []);
    }

    const feed = this.userNotifications.get(recipientUid);
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const notification = {
      id: notificationId,
      recipientUid,
      title,
      message,
      type, // 'KYC_STATUS', 'PAYMENT_CONFIRMED', 'NEW_ORDER', 'ESCROW_RELEASED'
      data,
      isRead: false,
      timestamp: new Date().toISOString(),
    };

    feed.unshift(notification); // Add to top of list

    // Keep feed trimmed to max 50 recent items
    if (feed.length > 50) {
      feed.pop();
    }

    return notification;
  }

  // 2. GET USER ALERTS FEED & UNREAD COUNT
  getUserAlerts(recipientUid) {
    const feed = this.userNotifications.get(recipientUid) || [];
    const unreadCount = feed.filter((n) => !n.isRead).length;

    return {
      feed,
      unreadCount,
    };
  }

  // 3. MARK NOTIFICATION AS READ
  markAsRead(recipientUid, notificationId) {
    const feed = this.userNotifications.get(recipientUid) || [];
    if (notificationId === 'ALL') {
      feed.forEach((n) => (n.isRead = true));
    } else {
      const item = feed.find((n) => n.id === notificationId);
      if (item) item.isRead = true;
    }

    return this.getUserAlerts(recipientUid);
  }
}

module.exports = { NotificationService };
