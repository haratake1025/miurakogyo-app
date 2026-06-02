import { cookies } from 'next/headers'
import { createSessionClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

// API Route Handler の冒頭で呼ぶ。未認証なら null を返す
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createSessionClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}
