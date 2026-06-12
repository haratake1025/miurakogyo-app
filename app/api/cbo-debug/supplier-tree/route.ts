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
  const viewId = process.env.CBO_SUPPLIER_VIEW_ID ?? '3107'

  const [r1, r2, r3, r4] = await Promise.all([
    tryFetch(`/supplier_custom_views/${viewId}/suppliers/${supplierId}/tree_and_value`),
    tryFetch(`/supplier_custom_views/${viewId}/suppliers?id=${supplierId}`),
    tryFetch(`/suppliers/${supplierId}?with_tree=true`),
    // id_in[] with tree flag
    tryFetch(`/supplier_custom_views/${viewId}/suppliers?id_in[]=${supplierId}&tree=true`),
  ])

  return NextResponse.json({
    '/supplier_custom_views/viewId/suppliers/:id/tree_and_value': r1,
    '/supplier_custom_views/viewId/suppliers?id=': r2,
    '/suppliers/:id?with_tree=true': r3,
    '/supplier_custom_views/viewId/suppliers?id_in[]&tree=true': r4,
  })
}
