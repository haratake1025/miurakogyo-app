// CBO 出面レスポンス確認用デバッグエンドポイント（一時利用）
// GET /api/cbo-debug/report?order_id=XXXX&from=2026-06-01&to=2026-06-30

import { NextRequest, NextResponse } from 'next/server'
import { listAttendanceReportsRaw } from '@/lib/cbo/masters'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site_id')
  const from = req.nextUrl.searchParams.get('from') ?? '2026-06-01'
  const to = req.nextUrl.searchParams.get('to') ?? '2026-06-30'

  if (!siteId) {
    return NextResponse.json({ error: 'site_id が必要です（SupabaseのsitesテーブルのUUID）' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: site } = await supabase.from('sites').select('cbo_order_id').eq('id', siteId).single()
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const samples = await listAttendanceReportsRaw(site.cbo_order_id, { from, to })
  return NextResponse.json({ cbo_order_id: site.cbo_order_id, samples })
}
