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

    // 社員・協力会社スタッフをそれぞれの unique index で一括 upsert
    const employeeRows = workerRows.filter((r): r is WorkerRow => r.source_kind === 'employee')
    const partnerRows = workerRows.filter((r): r is WorkerRow => r.source_kind === 'partner')

    if (employeeRows.length) {
      const { error } = await supabase
        .from('workers')
        .upsert(employeeRows, { onConflict: 'cbo_company_user_id' })
      if (error) throw error
    }
    if (partnerRows.length) {
      const { error } = await supabase
        .from('workers')
        .upsert(partnerRows, { onConflict: 'cbo_supplier_id,cbo_supplier_staff_id' })
      if (error) throw error
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
