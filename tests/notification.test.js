/**
 * Automated Tests for Real-Time Push Notifications & Alert Feed (Phase 2)
 */

const assert = require('assert');
const { NotificationService } = require('../notification_service');

describe('Phase 2 Real-Time Push Notifications Test Suite', () => {
  let service;
  const uid = 'usr_notification_test';

  beforeEach(() => {
    service = new NotificationService();
  });

  test('Dispatches real-time notification and tracks unread count', () => {
    const notif = service.sendNotification(uid, {
      title: '🎉 KYC Approved!',
      message: 'Hongera, KYC yako imeidhinishwa.',
      type: 'KYC_STATUS',
    });

    assert.ok(notif.id.startsWith('notif_'));
    assert.strictEqual(notif.isRead, false);

    const alerts = service.getUserAlerts(uid);
    assert.strictEqual(alerts.unreadCount, 1);
    assert.strictEqual(alerts.feed.length, 1);
  });

  test('Marks notifications as read', () => {
    service.sendNotification(uid, { title: 'Alert 1', message: 'Message 1' });
    service.sendNotification(uid, { title: 'Alert 2', message: 'Message 2' });

    let alerts = service.getUserAlerts(uid);
    assert.strictEqual(alerts.unreadCount, 2);

    service.markAsRead(uid, 'ALL');
    alerts = service.getUserAlerts(uid);
    assert.strictEqual(alerts.unreadCount, 0);
  });
});
