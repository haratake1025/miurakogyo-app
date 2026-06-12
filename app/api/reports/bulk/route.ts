import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

type BulkCell = {
  worker_id: string
  work_date: string
  day_yakan_id: string | null
  over_hour: number
  work_content_id: string | null
  health_type_id: string | null
  existing_id?: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { site_id, cells } = body as { site_id: string; cells: BulkCell[] }

  if (!site_id || !Array.isArray(cells) || cells.length === 0) {
    return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Batch fetch sync_status to avoid N+1 per UPDATE
  const existingIds = cells.filter(c => c.existing_id).map(c => c.existing_id!)
  const syncStatusMap = new Map<string, string>()
  if (existingIds.length > 0) {
    const { data } = await supabase
      .from('daily_reports')
      .select('id, sync_status')
      .in('id', existingIds)
    for (const r of data ?? []) {
      syncStatusMap.set(r.id, r.sync_status)
    }
  }

  let created = 0
  let updated = 0
  const errors: { index: number; message: string }[] = []

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    try {
      if (cell.existing_id) {
        const currentStatus = syncStatusMap.get(cell.existing_id)
        const nextStatus = currentStatus === 'synced' ? 'local_edited' : (currentStatus ?? 'local_edited')

        const { error } = await supabase
          .from('daily_reports')
          .update({
            day_yakan_id: cell.day_yakan_id,
            over_hour: cell.over_hour,
            work_content_id: cell.work_content_id,
            health_type_id: cell.health_type_id,
            sync_status: nextStatus,
            updated_by: user.id,
          })
          .eq('id', cell.existing_id)

        if (error) throw new Error(error.message)
        updated++
      } else {
        const { error } = await supabase
          .from('daily_reports')
          .insert({
            site_id,
            worker_id: cell.worker_id,
            work_date: cell.work_date,
            day_yakan_id: cell.day_yakan_id,
            over_hour: cell.over_hour,
            work_content_id: cell.work_content_id,
            health_type_id: cell.health_type_id,
            sync_status: 'local_new',
            created_by: user.id,
            updated_by: user.id,
          })

        if (error) {
          if (error.code === '23505') throw new Error('すでに記録が存在します')
          throw new Error(error.message)
        }
        created++
      }
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ created, updated, errors })
}
