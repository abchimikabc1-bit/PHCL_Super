/**
 * Express Controller Router for Real-Time Push Notifications (Phase 2)
 */

const express = require('express');
const { NotificationService } = require('./notification_service');
const { sanitizeRequestBody } = require('./security_sanitizer');

const router = express.Router();
const notificationService = new NotificationService();

router.use(express.json());
router.use(sanitizeRequestBody);

// 1. GET USER ALERTS FEED & UNREAD COUNT
router.get('/notifications/my-alerts', (req, res) => {
  const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
  const result = notificationService.getUserAlerts(userUid);
  res.status(200).json({ success: true, data: result });
});

// 2. MARK NOTIFICATIONS AS READ
router.post('/notifications/mark-read', (req, res) => {
  const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
  const { notificationId } = req.body;

  const result = notificationService.markAsRead(userUid, notificationId || 'ALL');
  res.status(200).json({ success: true, data: result });
});

// 3. TRIGGER TEST NOTIFICATION
router.post('/notifications/send-test', (req, res) => {
  const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
  const { title, message, type } = req.body;

  const notif = notificationService.sendNotification(userUid, {
    title: title || '🎉 Welcome Alert',
    message: message || 'Mfumo wako wa Real-Time Push Notifications upo tayari!',
    type: type || 'GENERAL',
  });

  res.status(201).json({ success: true, data: notif });
});

module.exports = { router, notificationService };
