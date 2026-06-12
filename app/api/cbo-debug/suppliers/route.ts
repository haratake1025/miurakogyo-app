import { NextResponse } from 'next/server'
import { cboFetch } from '@/lib/cbo/client'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const viewId = process.env.CBO_SUPPLIER_VIEW_ID ?? '2744'

  // まず一覧を取得してsupplier IDを確認
  const listRes = await cboFetch<{ data: Array<{ id: number; values: unknown }> }>(
    `/supplier_custom_views/${viewId}/suppliers?per_page=5`
  )

  const supplierId = listRes.data?.[0]?.id

  // 直接エンドポイントで1社の詳細を取得（tree構造の有無を確認）
  let directRes: unknown = null
  if (supplierId) {
    directRes = await cboFetch<unknown>(`/suppliers/${supplierId}`).catch(e => ({ error: String(e) }))
  }

  // スタッフ一覧エンドポイントを試す
  let staffRes: unknown = null
  if (supplierId) {
    staffRes = await cboFetch<unknown>(`/suppliers/${supplierId}/supplier_staffs?per_page=5`)
      .catch(e => ({ error: String(e) }))
  }

  return NextResponse.json({
    list_first: listRes.data?.[0],
    direct_supplier: directRes,
    staff_endpoint: staffRes,
  })
}
