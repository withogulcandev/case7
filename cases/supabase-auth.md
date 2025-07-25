---
id: supabase-auth-nextjs
title: Supabase Authentication with Next.js
category: web
tags: [supabase, auth, nextjs, authentication, web]
difficulty: beginner
last_updated: "2025-01-15"
tested_versions:
  "@supabase/supabase-js": "2.x"
  "@supabase/auth-helpers-nextjs": "0.10.x"
  nextjs: "14.x"
estimated_time: "1.5 hours"
prerequisites:
  - "Next.js project setup"
  - "Supabase project created"
---

# Supabase Authentication with Next.js

Complete authentication setup using Supabase in a Next.js application.

## Install

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## Setup

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Client

```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()
```

## Usage

### Auth Provider

```typescript
// components/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext<{
  user: User | null
  loading: boolean
}>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### Login Component

```typescript
// components/Login.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }

    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Check your email for the confirmation link!')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <div className="space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Sign Up
        </button>
      </div>
    </form>
  )
}
```

### Protected Route

```typescript
// components/ProtectedRoute.tsx
'use client'

import { useAuth } from './AuthProvider'
import { Login } from './Login'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Login />
  }

  return <>{children}</>
}
```

## Common Issues

### Email Confirmation
- Configure email templates in Supabase dashboard
- Set up proper redirect URLs

### RLS Policies
- Enable Row Level Security on tables
- Create proper policies for authenticated users

### Session Management
- Handle session refresh automatically
- Implement proper logout functionality

## Testing

```typescript
// Test authentication flow
const testAuth = async () => {
  // Sign up
  await supabase.auth.signUp({ email: 'test@example.com', password: 'password' })
  
  // Sign in
  await supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'password' })
  
  // Sign out
  await supabase.auth.signOut()
}
```