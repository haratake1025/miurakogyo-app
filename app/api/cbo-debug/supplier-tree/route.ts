import { NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'
import { getAuthenticatedUser } from '@/lib/auth'

async function tryFetch(path: string) {
  return cboFetch<unknown>(path).catch((e) => ({ error: String(e) }))
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supplierId = 319097
  const formatId = 5307

  const [r1, r2, r3, r4, r5, r6] = await Promise.all([
    tryFetch(`/suppliers/${supplierId}`),
    tryFetch(`/suppliers/${supplierId}/tree_and_value`),
    tryFetch(`/supplier_formats/${formatId}/suppliers/${supplierId}`),
    tryFetch(`/supplier_custom_views/3107/suppliers?id_in[]=${supplierId}`),
    tryFetch(`/suppliers?id_in[]=${supplierId}&supplier_format_id=${formatId}`),
    tryFetch(`/supplier_custom_views/2744/suppliers/${supplierId}`),
  ])

  return NextResponse.json({
    '/suppliers/:id': r1,
    '/suppliers/:id/tree_and_value': r2,
    '/supplier_formats/:fid/suppliers/:id': r3,
    '/supplier_custom_views/3107/suppliers?id_in[]=': r4,
    '/suppliers?id_in[]&supplier_format_id=': r5,
    '/supplier_custom_views/2744/suppliers/:id': r6,
  })
}
