import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import type { cookies } from 'next/headers'

// DB操作用（service_role / RLSバイパス）サーバー専用
export function createServerClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// セッション検証用（anon key + Cookie）Route Handler から使う
export function createSessionClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です')
  }

  return createSsrClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}
