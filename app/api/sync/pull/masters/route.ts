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
  const result = { sites: 0, workers: 0, errors: [] as string[] }

  // ===== 現場 ===== (target指定なしのみ)
  if (!target) {
    try {
      const cboSites = await listSites()
      const siteRows = cboSites.map(toSiteRow)

      const { error } = await supabase
        .from('sites')
        .upsert(siteRows, { onConflict: 'cbo_order_id' })

      if (error) throw new Error(error.message)
      result.sites = siteRows.length

      await supabase.from('sync_logs').insert({
        direction: 'pull', target: 'site',
        status: 'success', message: `${siteRows.length}件取込`,
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
  // NOTE: workers テーブルの unique index は partial index（WHERE 句付き）のため
  // PostgREST の onConflict では使用不可。fetch→分離→INSERT/UPDATE の手順で処理する。
  try {
    const [employees, partners] = await Promise.all([
      target !== 'partner' ? listEmployees() : Promise.resolve([]),
      target !== 'employee' ? listPartnerWorkers() : Promise.resolve([]),
    ])
    const workerRows: WorkerRow[] = [
      ...employees.map(toEmployeeRow),
      ...partners.map(toPartnerWorkerRow),
    ]

    const employeeRows = workerRows.filter((r): r is WorkerRow => r.source_kind === 'employee')
    const partnerRows = workerRows.filter((r): r is WorkerRow => r.source_kind === 'partner')

    // ---- 社員 ----
    if (employeeRows.length) {
      const cboUserIds = employeeRows.map(r => r.cbo_company_user_id!)
      const { data: existing, error: fetchErr } = await supabase
        .from('workers')
        .select('id, cbo_company_user_id')
        .in('cbo_company_user_id', cboUserIds)
        .eq('source_kind', 'employee')
      if (fetchErr) throw new Error(fetchErr.message)

      const existingMap = new Map(existing?.map(e => [e.cbo_company_user_id as string, e.id as string]) ?? [])
      const toInsert = employeeRows.filter(r => !existingMap.has(r.cbo_company_user_id!))
      const toUpdate = employeeRows
        .filter(r => existingMap.has(r.cbo_company_user_id!))
        .map(r => ({ ...r, id: existingMap.get(r.cbo_company_user_id!)! }))

      if (toInsert.length) {
        // ignoreDuplicates: ON CONFLICT DO NOTHING（partial index でも機能）
        const { error } = await supabase.from('workers').upsert(toInsert, { ignoreDuplicates: true })
        if (error) throw new Error(error.message)
      }
      if (toUpdate.length) {
        const { error } = await supabase.from('workers').upsert(toUpdate, { onConflict: 'id' })
        if (error) throw new Error(error.message)
      }
    }

    // ---- 協力会社スタッフ ----
    if (partnerRows.length) {
      const supplierIds = [...new Set(partnerRows.map(r => r.cbo_supplier_id!))]
      const { data: existing, error: fetchErr } = await supabase
        .from('workers')
        .select('id, cbo_supplier_id, cbo_supplier_staff_id')
        .in('cbo_supplier_id', supplierIds)
        .eq('source_kind', 'partner')
      if (fetchErr) throw new Error(fetchErr.message)

      const existingMap = new Map(
        existing?.map(e => [
          `${e.cbo_supplier_id}:${e.cbo_supplier_staff_id}`,
          e.id as string,
        ]) ?? []
      )
      const key = (r: WorkerRow) => `${r.cbo_supplier_id}:${r.cbo_supplier_staff_id}`
      const toInsert = partnerRows.filter(r => !existingMap.has(key(r)))
      const toUpdate = partnerRows
        .filter(r => existingMap.has(key(r)))
        .map(r => ({ ...r, id: existingMap.get(key(r))! }))

      if (toInsert.length) {
        // ignoreDuplicates: ON CONFLICT DO NOTHING（partial index でも機能）
        const { error } = await supabase.from('workers').upsert(toInsert, { ignoreDuplicates: true })
        if (error) throw new Error(error.message)
      }
      if (toUpdate.length) {
        const { error } = await supabase.from('workers').upsert(toUpdate, { onConflict: 'id' })
        if (error) throw new Error(error.message)
      }
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
