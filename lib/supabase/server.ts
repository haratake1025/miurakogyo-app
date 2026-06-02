import { createClient } from '@supabase/supabase-js'

// サーバー専用クライアント（Route Handler / Server Action から使う）
// service_role は RLS をバイパスするため、クライアントバンドルに含めてはいけない
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
