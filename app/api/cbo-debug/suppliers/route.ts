import { NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'
import { getAuthenticatedUser } from '@/lib/auth'

async function tryFetch(path: string) {
  return cboFetch<unknown>(path).catch(e => ({ error: String(e) }))
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supplierId = 319097

  const results = await Promise.all([
    // スタッフ一覧系
    tryFetch(`/supplier_staffs?per_page=5`),
    tryFetch(`/supplier_staffs?supplier_id=${supplierId}&per_page=5`),
    tryFetch(`/supplier_staff_informations?supplier_id=${supplierId}&per_page=5`),
    // サプライヤー詳細系
    tryFetch(`/supplier_custom_views/2744/suppliers/${supplierId}`),
    tryFetch(`/suppliers?supplier_format_id=5307&per_page=3`),
  ])

  return NextResponse.json({
    'GET /supplier_staffs': results[0],
    'GET /supplier_staffs?supplier_id': results[1],
    'GET /supplier_staff_informations?supplier_id': results[2],
    'GET /supplier_custom_views/2744/suppliers/:id': results[3],
    'GET /suppliers?supplier_format_id=5307': results[4],
  })
}
