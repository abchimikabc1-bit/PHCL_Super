'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ArrowRight,
  Truck,
  Shield,
} from 'lucide-react';

// Color mapping for currencies
const getCurrencyColor = (currency: string): string => {
  const colors: Record<string, string> = {
    "USD": "text-black",
    "TZS": "text-green-600",
    "PI": "text-purple-600",
    "usd": "text-black",
    "tsh": "text-green-600",
    "pi": "text-purple-600",
  };
  return colors[currency] || "text-gray-700";
};

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CheckoutState {
  step: 'cart' | 'shipping' | 'payment' | 'confirmation';
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: 'pi' | 'usd' | 'tzs' | 'ntzs';
}

interface CheckoutFormProps {
  items: CartItem[];
  onCheckoutComplete?: (order: any) => void;
}

export function CheckoutForm({ items, onCheckoutComplete }: CheckoutFormProps) {
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'confirmation'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'pi' | 'usd' | 'tzs' | 'ntzs'>('pi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Tanzania',
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 5000000 ? 0 : 100000; // Free shipping over 5M
  const tax = Math.round(subtotal * 0.1); // 10% tax
  const total = subtotal + shipping + tax;

  const PI_GCV_USD = 314159;
  const USD_TO_TZS = 2621.5;
  const totalUsd = total / 1000000;
  const totalTzs = totalUsd * USD_TO_TZS;
  const totalNTzs = totalUsd * USD_TO_TZS;
  const totalPi = totalUsd / PI_GCV_USD;

  const getTotalByPayment = () => {
    if (paymentMethod === 'usd') {
      return { label: 'USD', amount: `$${totalUsd.toFixed(2)}` };
    }
    if (paymentMethod === 'tzs') {
      return { label: 'TZS', amount: `TSh ${totalTzs.toLocaleString('en-US', { maximumFractionDigits: 0 })}` };
    }
    if (paymentMethod === 'ntzs') {
      return { label: 'nTZS', amount: `nTSh ${totalNTzs.toLocaleString('en-US', { maximumFractionDigits: 0 })}` };
    }
    return { label: 'PI', amount: `Π ${totalPi.toFixed(8)}` };
  };

  const paymentMethods = [
    {
      id: 'usd',
      name: 'US Dollar (USD)',
      icon: '$',
      color: 'from-amber-500 to-yellow-500',
      description: 'Pay in US dollars',
    },
    {
      id: 'pi',
      name: 'Pi Network',
      icon: 'Π',
      color: 'from-purple-500 to-purple-600',
      description: '1 PI = $314,159 GCV',
    },
    {
      id: 'tzs',
      name: 'Tanzanian Shilling',
      icon: 'TSh',
      color: 'from-sky-500 to-blue-600',
      description: 'Local currency',
    },
    {
      id: 'ntzs',
      name: 'Digital TZS (nTZS)',
      icon: 'nTSh',
      color: 'from-cyan-500 to-sky-700',
      description: 'Digital shilling settlement',
    },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setOrderConfirmed(true);
      setStep('confirmation');
      setIsProcessing(false);

      const order = {
        id: `ORD-${Date.now()}`,
        items,
        subtotal,
        shipping,
        tax,
        total,
        paymentMethod,
        deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ...formData,
      };
      
      onCheckoutComplete?.(order);
    }, 2000);
  };

  if (orderConfirmed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success card */}
        <Card className="premium-card border-2 border-green-500 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full">
                <CheckCircle size={48} />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
            <p className="text-gray-700 mb-6">
              Your order has been successfully placed and is being processed.
            </p>

            {/* Order details */}
            <div className="bg-white rounded-lg p-6 mb-6 space-y-4 text-left">
              <div className="flex justify-between">
                <span className="font-semibold">Order ID:</span>
                <Badge>ORD-{Date.now().toString().slice(-6)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-lg font-bold text-amber-600">{getTotalByPayment().amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Payment Method:</span>
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  {paymentMethods.find(m => m.id === paymentMethod)?.name}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Estimated Delivery:</span>
                <span className="text-gray-700">5-7 business days</span>
              </div>
            </div>

            {/* Delivery info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
              <div className="flex gap-3 mb-3">
                <Truck size={20} className="text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-blue-900">Delivery Info</p>
                  <p className="text-blue-800">We&apos;ll send tracking details to your email shortly</p>
                  <p className="text-blue-800 mt-1">Pi uses GCV valuation: 1 PI = $314,159</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => window.location.href = '/marketplace'}>
                Continue Shopping
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600">
                Track Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {(['cart', 'shipping', 'payment', 'confirmation'] as const).map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === s
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  : step === 'cart'
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-green-500 text-white'
              }`}
            >
              {idx + 1}
            </div>
            {idx < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  ['cart', 'shipping', 'payment'].indexOf(step) > idx
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Cart step */}
      {step === 'cart' && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold text-gray-900">${(item.price / 1000000).toFixed(2)}M</p>
              </div>
            ))}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${(subtotal / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-semibold">{shipping === 0 ? 'Free' : `$${(shipping / 1000000).toFixed(2)}M`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-semibold">${(tax / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span className="text-amber-600">${(total / 1000000).toFixed(2)}M</span>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              <p className="font-semibold mb-1">Accepted currencies</p>
              <p>USD: ${totalUsd.toFixed(2)}</p>
              <p>TZS: TSh {totalTzs.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <p>PI: Π {totalPi.toFixed(8)} (GCV)</p>
            </div>

            <Button
              onClick={() => setStep('shipping')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
            >
              Proceed to Shipping <ArrowRight className="ml-2" size={16} />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shipping step */}
      {step === 'shipping' && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <Input
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Address</label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">City</label>
                <Input
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Postal Code</label>
                <Input
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('cart')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep('payment')}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600"
              >
                Continue to Payment <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment step */}
      {step === 'payment' && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === method.id
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <div className={`bg-gradient-to-br ${method.color} text-white p-3 rounded-lg mb-3 inline-block text-2xl`}>
                    {method.icon}
                  </div>
                  <p className="font-bold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-600">{method.description}</p>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Shield size={20} className="text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Secure Payment</p>
                <p>Your payment information is encrypted and secure</p>
                <p className="mt-1">Total in {getTotalByPayment().label}: <span className="font-semibold">{getTotalByPayment().amount}</span></p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
              >
                {isProcessing ? 'Processing...' : 'Complete Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CheckoutForm;
