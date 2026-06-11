import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { site_id, worker_id, work_date, day_yakan_id, over_hour, work_content_id, health_type_id, reporter_cbo_user_id } = body

  if (!site_id || !worker_id || !work_date) {
    return NextResponse.json({ error: 'site_id / worker_id / work_date は必須です' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('daily_reports')
    .insert({
      site_id,
      worker_id,
      work_date,
      day_yakan_id: day_yakan_id ?? null,
      over_hour: over_hour ?? 0,
      work_content_id: work_content_id ?? null,
      health_type_id: health_type_id ?? '106556',
      reporter_cbo_user_id: reporter_cbo_user_id ?? null,
      sync_status: 'local_new',
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'この作業者・日付の記録はすでに存在します' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
