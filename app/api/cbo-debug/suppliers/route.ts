import { NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const viewId = process.env.CBO_SUPPLIER_VIEW_ID ?? '2744'
  const res = await cboFetch<unknown>(`/supplier_custom_views/${viewId}/suppliers?per_page=3`)

  return NextResponse.json(res)
}
