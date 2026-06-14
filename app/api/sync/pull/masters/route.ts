import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { listSites, listEmployees, listPartnerWorkers } from '@/lib/cbo/masters'
import { toSiteRow, toEmployeeRow, toPartnerWorkerRow } from '@/lib/cbo/normalize'
import type { WorkerRow } from '@/lib/cbo/normalize'

// CBO のスロットル（500ms/件）× 会社数分の時間が必要なため上限を延ばす
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // target=employee | partner | (omit = all)
  const target = req.nextUrl.searchParams.get('target')

  const supabase = createServerClient()
  const now = new Date().toISOString()
  const result = {
    sites: { inserted: 0, updated: 0 },
    workers: 0,
    errors: [] as string[],
  }

  // ===== 現場 ===== (target指定なしのみ)
  if (!target) {
    try {
      const cboSites = await listSites()
      const siteRows = cboSites.map(toSiteRow)

      // 既存 cbo_order_id を照合して新規 / 更新件数を計算
      const cboIds = siteRows.map(r => r.cbo_order_id)
      const { data: existing } = await supabase
        .from('sites')
        .select('cbo_order_id')
        .in('cbo_order_id', cboIds)
      const existingIds = new Set((existing ?? []).map(s => s.cbo_order_id))
      const insertCount = siteRows.filter(r => !existingIds.has(r.cbo_order_id)).length
      const updateCount = siteRows.filter(r => existingIds.has(r.cbo_order_id)).length

      const { error } = await supabase
        .from('sites')
        .upsert(siteRows, { onConflict: 'cbo_order_id' })

      if (error) throw new Error(error.message)
      result.sites = { inserted: insertCount, updated: updateCount }

      await supabase.from('sync_logs').insert({
        direction: 'pull', target: 'site',
        status: 'success',
        message: `新規${insertCount}件・更新${updateCount}件`,
        performed_by: user.id, performed_at: now,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`sites: ${msg}`)
      await supabase.from('sync_logs').insert({
        direction: 'pull', target: 'site',
        status: 'error', message: msg,
        performed_by: user.id, performed_at: now,
      })
    }
  }

  // ===== 作業者 =====
  try {
    const [employees, partners] = await Promise.all([
      target !== 'partner' ? listEmployees() : Promise.resolve([]),
      target !== 'employee' ? listPartnerWorkers() : Promise.resolve([]),
    ])
    const workerRows: WorkerRow[] = [
      ...employees.map(toEmployeeRow),
      ...partners.map(toPartnerWorkerRow),
    ]

    // CBO レスポンスに同一キーの重複エントリが含まれる場合があるため除去
    // （重複があると ON CONFLICT DO UPDATE が同一行を2回更新しようとしてエラーになる）
    const seenEmployees = new Set<string>()
    const employeeRows = workerRows
      .filter((r): r is WorkerRow => r.source_kind === 'employee')
      .filter(r => {
        if (seenEmployees.has(r.cbo_company_user_id!)) return false
        seenEmployees.add(r.cbo_company_user_id!)
        return true
      })

    const seenPartners = new Set<string>()
    const partnerRows = workerRows
      .filter((r): r is WorkerRow => r.source_kind === 'partner')
      .filter(r => {
        const k = `${r.cbo_supplier_id}:${r.cbo_supplier_staff_id}`
        if (seenPartners.has(k)) return false
        seenPartners.add(k)
        return true
      })

    if (employeeRows.length) {
      const { error } = await supabase
        .from('workers')
        .upsert(employeeRows, { onConflict: 'cbo_company_user_id' })
      if (error) throw new Error(error.message)
    }
    if (partnerRows.length) {
      const { error } = await supabase
        .from('workers')
        .upsert(partnerRows, { onConflict: 'cbo_supplier_id,cbo_supplier_staff_id' })
      if (error) throw new Error(error.message)
    }

    // CBO に存在しなくなった作業者を非活性化（削除ではなく is_active = false）
    // target 指定がある場合はその種別のみ対象
    if (target !== 'partner' && employeeRows.length) {
      const activeIds = employeeRows.map(r => r.cbo_company_user_id!)
      const { error } = await supabase
        .from('workers')
        .update({ is_active: false })
        .eq('source_kind', 'employee')
        .eq('is_active', true)
        .not('cbo_company_user_id', 'in', `(${activeIds.join(',')})`)
      if (error) throw new Error(error.message)
    }
    if (target !== 'employee' && partnerRows.length) {
      const activeStaffIds = partnerRows.map(r => r.cbo_supplier_staff_id!)
      const { error } = await supabase
        .from('workers')
        .update({ is_active: false })
        .eq('source_kind', 'partner')
        .eq('is_active', true)
        .not('cbo_supplier_staff_id', 'in', `(${activeStaffIds.join(',')})`)
      if (error) throw new Error(error.message)
    }

    result.workers = workerRows.length

    await supabase.from('sync_logs').insert({
      direction: 'pull', target: 'worker',
      status: 'success', message: `${workerRows.length}件取込`,
      performed_by: user.id, performed_at: now,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.errors.push(`workers: ${msg}`)
    await supabase.from('sync_logs').insert({
      direction: 'pull', target: 'worker',
      status: 'error', message: msg,
      performed_by: user.id, performed_at: now,
    })
  }

  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 })
}
