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
    // 担当者(staff)取得の試み
    tryFetch(`/suppliers?supplier_format_id=5307&id=${supplierId}`),
    tryFetch(`/supplier_custom_views/2744/suppliers?id_in[]=${supplierId}`),
    tryFetch(`/supplier_custom_views?supplier_format_id=5307&per_page=5`),
    tryFetch(`/supplier_informations?supplier_id=${supplierId}&per_page=5`),
    tryFetch(`/supplier_contacts?supplier_id=${supplierId}&per_page=5`),
    tryFetch(`/supplier_representative_informations?supplier_id=${supplierId}&per_page=5`),
  ])

  return NextResponse.json({
    'GET /suppliers?id=319097': results[0],
    'GET /supplier_custom_views/2744/suppliers?id_in[]=319097': results[1],
    'GET /supplier_custom_views?supplier_format_id=5307': results[2],
    'GET /supplier_informations?supplier_id': results[3],
    'GET /supplier_contacts?supplier_id': results[4],
    'GET /supplier_representative_informations?supplier_id': results[5],
  })
}
