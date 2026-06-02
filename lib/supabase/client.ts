import { createClient } from '@supabase/supabase-js'

// ブラウザ用クライアント（Supabase Auth / anon key）
// NEXT_PUBLIC_ 変数のみ使用する
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です')
  }

  return createClient(url, key)
}
