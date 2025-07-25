---
id: nextjs-stripe-checkout
title: Next.js + Stripe Checkout Integration
category: web
tags: [nextjs, stripe, payments, checkout, web]
difficulty: intermediate
last_updated: "2025-01-15"
tested_versions:
  nextjs: "14.x"
  stripe: "14.x"
  "@stripe/stripe-js": "2.x"
estimated_time: "2 hours"
prerequisites:
  - "Next.js project setup"
  - "Stripe account with API keys"
---

# Next.js + Stripe Checkout Integration

Complete integration of Stripe Checkout in a Next.js application with TypeScript.

## Install

```bash
npm install stripe @stripe/stripe-js
npm install -D @types/stripe
```

## Setup

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Configuration

```typescript
// lib/stripe.ts
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

## Usage

### Create Checkout Session

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
```

### Checkout Component

```typescript
// components/CheckoutButton.tsx
'use client';

import { useState } from 'react';
import { stripePromise } from '@/lib/stripe';

interface CheckoutButtonProps {
  priceId: string;
  children: React.ReactNode;
}

export function CheckoutButton({ priceId, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}
```

## Common Issues

### CORS Errors
- Ensure API routes are properly configured
- Check domain settings in Stripe dashboard

### Webhook Verification
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks`
- Verify webhook signatures in production

### TypeScript Errors
- Install `@types/stripe` for proper typing
- Use Stripe's TypeScript definitions

## Testing

```bash
# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks

# Use test card numbers
# Success: 4242424242424242
# Decline: 4000000000000002
```