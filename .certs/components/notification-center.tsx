'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  ShoppingCart,
  Truck,
  CreditCard,
  TrendingUp,
  Clock,
  Trash2,
} from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'order' | 'payment' | 'trending';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onNotificationRead?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
  maxVisibleNotifications?: number;
}

export function NotificationCenter({
  notifications: initialNotifications = [],
  onNotificationRead,
  onNotificationDismiss,
  maxVisibleNotifications = 3,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const visibleNotifications = notifications.slice(0, maxVisibleNotifications);

  const handleDismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    onNotificationDismiss?.(id);
  }, [onNotificationDismiss]);

  const handleRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    onNotificationRead?.(id);
  }, [onNotificationRead]);

  const getIcon = (type: Notification['type']) => {
    const iconProps = { size: 20 };
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      case 'error':
        return <AlertCircle {...iconProps} className="text-red-600" />;
      case 'warning':
        return <AlertCircle {...iconProps} className="text-yellow-600" />;
      case 'order':
        return <ShoppingCart {...iconProps} className="text-blue-600" />;
      case 'payment':
        return <CreditCard {...iconProps} className="text-purple-600" />;
      case 'trending':
        return <TrendingUp {...iconProps} className="text-orange-600" />;
      default:
        return <Info {...iconProps} className="text-blue-600" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'order':
        return 'bg-blue-50 border-blue-200';
      case 'payment':
        return 'bg-purple-50 border-purple-200';
      case 'trending':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Bell size={20} className="text-amber-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-600 ml-auto">{unreadCount} new</Badge>
              )}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No notifications yet</p>
                <p className="text-gray-500 text-sm">Check back later for updates</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 ${getBgColor(notification.type)} border-l-4 hover:bg-opacity-75 transition-colors ${
                    !notification.read ? 'border-b border-gray-200' : ''
                  }`}
                  onClick={() => !notification.read && handleRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2" />
                          )}
                        </p>
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <X size={16} className="text-gray-500" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(notification.timestamp)}
                      </p>
                      {notification.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => window.location.href = notification.actionUrl!}
                        >
                          {notification.actionLabel || 'View'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 p-3 border-t border-gray-200 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-600 hover:text-gray-900"
                onClick={() => setNotifications([])}
              >
                Clear all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Example notification templates */
export const notificationTemplates = {
  orderConfirmed: (orderID: string): Notification => ({
    id: `order-${orderID}`,
    type: 'order',
    title: 'Order Confirmed',
    message: `Your order #${orderID} has been confirmed and will be delivered soon.`,
    timestamp: new Date(),
    read: false,
    actionUrl: `/orders/${orderID}`,
    actionLabel: 'Track Order',
  }),

  paymentSuccessful: (amount: string): Notification => ({
    id: `payment-${Date.now()}`,
    type: 'payment',
    title: 'Payment Successful',
    message: `Payment of ${amount} has been processed successfully.`,
    timestamp: new Date(),
    read: false,
  }),

  shipmentDispatched: (trackingNumber: string): Notification => ({
    id: `ship-${trackingNumber}`,
    type: 'order',
    title: 'Shipment Dispatched',
    message: `Your order is on the way! Tracking: ${trackingNumber}`,
    timestamp: new Date(),
    read: false,
    actionUrl: `/tracking/${trackingNumber}`,
    actionLabel: 'Track Package',
  }),

  priceAlert: (product: string, price: string): Notification => ({
    id: `price-${Date.now()}`,
    type: 'trending',
    title: 'Price Alert',
    message: `${product} is now available at ${price}. Limited time!`,
    timestamp: new Date(),
    read: false,
    actionUrl: '/marketplace',
    actionLabel: 'View Deal',
  }),

  accountWarning: (warning: string): Notification => ({
    id: `warn-${Date.now()}`,
    type: 'warning',
    title: 'Account Alert',
    message: warning,
    timestamp: new Date(),
    read: false,
  }),

  systemUpdate: (message: string): Notification => ({
    id: `update-${Date.now()}`,
    type: 'info',
    title: 'System Update',
    message: message,
    timestamp: new Date(),
    read: false,
  }),
};

export default NotificationCenter;
