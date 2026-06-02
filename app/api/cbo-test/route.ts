// T2.0 疎通確認用（確認後に削除）
// GET /api/cbo-test?target=orders|company_users|reports&orderId=xxx
import { NextRequest, NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('target') ?? 'orders'
  const orderId = req.nextUrl.searchParams.get('orderId')

  try {
    let path = ''
    if (target === 'orders') {
      path = '/orders?order_format_id=2556'
    } else if (target === 'company_users') {
      path = '/company_users'
    } else if (target === 'suppliers') {
      path = '/suppliers?supplier_format_id=5307'
    } else if (target === 'reports' && orderId) {
      path = `/personal_daily_reports?personal_daily_report_format_id=4879&order_id=${orderId}`
    } else {
      return NextResponse.json({ error: 'target パラメータが不正です' }, { status: 400 })
    }

    const data = await cboFetch(path)
    return NextResponse.json({ path, data })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
