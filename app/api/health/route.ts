import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/health — Supabase 疎通確認（T0.3 検証用）
export async function GET() {
  const supabase = createServerClient()
  const { error } = await supabase.from('sites').select('id').limit(1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
