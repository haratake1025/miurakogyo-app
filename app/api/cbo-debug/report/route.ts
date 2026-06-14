// CBO 出面レスポンス確認用デバッグエンドポイント（一時利用）
// GET /api/cbo-debug/report?order_id=XXXX&from=2026-06-01&to=2026-06-30

import { NextRequest, NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')
  const from = req.nextUrl.searchParams.get('from') ?? '2026-06-01'
  const to = req.nextUrl.searchParams.get('to') ?? '2026-06-30'

  if (!orderId) {
    return NextResponse.json({ error: 'order_id が必要です' }, { status: 400 })
  }

  const params = new URLSearchParams({ format_id: '4879', order_id: orderId, from, to })
  const res = await cboFetch<{ data: unknown[] }>(`/personal_daily_reports?${params}`)

  // 先頭3件の生データを返す
  return NextResponse.json({ count: res.data.length, samples: res.data.slice(0, 3) })
}
