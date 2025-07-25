---
id: expo-stripe-payments
title: Expo + Stripe Payments Integration
category: mobile
tags: [expo, stripe, payments, react-native, mobile]
difficulty: intermediate
last_updated: "2025-01-15"
tested_versions:
  expo: "51.x"
  "@stripe/stripe-react-native": "0.38.x"
estimated_time: "3 hours"
prerequisites:
  - "Expo project setup"
  - "Stripe account with API keys"
---

# Expo + Stripe Payments Integration

Complete setup of Stripe payments in an Expo React Native application.

## Install

```bash
expo install @stripe/stripe-react-native
npx expo install expo-crypto
```

## Setup

### Environment Variables

```bash
# .env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Stripe Provider Setup

```typescript
// App.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.yourapp"
    >
      {/* Your app content */}
    </StripeProvider>
  );
}
```

## Usage

### Payment Sheet Integration

```typescript
// components/PaymentScreen.tsx
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

export function PaymentScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const initializePaymentSheet = async () => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Your App Name",
      paymentIntentClientSecret: clientSecret, // From your backend
      defaultBillingDetails: {
        name: 'Customer Name',
      }
    });

    if (error) {
      console.log('Error initializing payment sheet:', error);
    }
  };

  const openPaymentSheet = async () => {
    setLoading(true);
    
    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert('Success', 'Your payment was confirmed!');
    }
    
    setLoading(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button
        title="Pay Now"
        onPress={openPaymentSheet}
        disabled={loading}
      />
    </View>
  );
}
```

### Backend Payment Intent

```typescript
// api/create-payment-intent.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createPaymentIntent(amount: number) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
  };
}
```

## Common Issues

### iOS Configuration
- Add Stripe to your Info.plist
- Configure URL schemes properly

### Android Configuration
- Ensure proper permissions in AndroidManifest.xml
- Test on physical device for payment methods

### Network Requests
- Use proper HTTPS endpoints
- Handle network errors gracefully

## Testing

```bash
# Use Stripe test cards
# Success: 4242424242424242
# Decline: 4000000000000002
# 3D Secure: 4000000000003220
```