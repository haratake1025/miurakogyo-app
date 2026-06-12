import { NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const viewId = process.env.CBO_SUPPLIER_VIEW_ID ?? '3107'
  const supplierId = 319097

  const result = await cboFetch<unknown>(
    `/supplier_custom_views/${viewId}/suppliers/${supplierId}`
  ).catch((e) => ({ error: String(e) }))

  return NextResponse.json({ endpoint: `/supplier_custom_views/${viewId}/suppliers/${supplierId}`, result })
}
