import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { listSites, listEmployees, listPartnerWorkers } from '@/lib/cbo/masters'
import { toSiteRow, toEmployeeRow, toPartnerWorkerRow } from '@/lib/cbo/normalize'
import type { WorkerRow } from '@/lib/cbo/normalize'

export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const now = new Date().toISOString()
  const result = { sites: 0, workers: 0, errors: [] as string[] }

  // ===== 現場 =====
  try {
    const cboSites = await listSites()
    const siteRows = cboSites.map(toSiteRow)

    const { error } = await supabase
      .from('sites')
      .upsert(siteRows, { onConflict: 'cbo_order_id' })

    if (error) throw error
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

  // ===== 作業者 =====
  try {
    const [employees, partners] = await Promise.all([listEmployees(), listPartnerWorkers()])
    const workerRows: WorkerRow[] = [
      ...employees.map(toEmployeeRow),
      ...partners.map(toPartnerWorkerRow),
    ]

    // 部分uniqueインデックスのため application-level upsert
    const { data: existingWorkers } = await supabase
      .from('workers')
      .select('id, source_kind, cbo_company_user_id, cbo_supplier_id, cbo_supplier_staff_id')

    const employeeMap = new Map(
      (existingWorkers ?? [])
        .filter((w) => w.source_kind === 'employee')
        .map((w) => [w.cbo_company_user_id as string, w.id as string])
    )
    const partnerMap = new Map(
      (existingWorkers ?? [])
        .filter((w) => w.source_kind === 'partner')
        .map((w) => [`${w.cbo_supplier_id}:${w.cbo_supplier_staff_id}`, w.id as string])
    )

    const toInsert: WorkerRow[] = []
    const toUpdate: Array<WorkerRow & { _id: string }> = []

    for (const row of workerRows) {
      if (row.source_kind === 'employee') {
        const existingId = employeeMap.get(row.cbo_company_user_id!)
        if (existingId) toUpdate.push({ ...row, _id: existingId })
        else toInsert.push(row)
      } else {
        const key = `${row.cbo_supplier_id}:${row.cbo_supplier_staff_id}`
        const existingId = partnerMap.get(key)
        if (existingId) toUpdate.push({ ...row, _id: existingId })
        else toInsert.push(row)
      }
    }

    if (toInsert.length) {
      const { error } = await supabase.from('workers').insert(toInsert)
      if (error) throw error
    }
    for (const { _id, ...row } of toUpdate) {
      const { error } = await supabase.from('workers').update(row).eq('id', _id)
      if (error) throw error
    }

    result.workers = workerRows.length

    await supabase.from('sync_logs').insert({
      direction: 'pull', target: 'worker',
      status: 'success', message: `${workerRows.length}件取込（新規${toInsert.length}件）`,
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
