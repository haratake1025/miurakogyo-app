import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

// API Route Handler の冒頭で呼ぶ。未認証なら 401 を throw する
export async function requireAuth() {
  const cookieStore = await cookies()
  const supabase = createSessionClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return user
}
