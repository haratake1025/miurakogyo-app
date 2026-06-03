import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('daily_reports')
    .select(`
      *,
      worker:workers(id, company_name, worker_name),
      site:sites(id, name),
      day_yakan:day_yakan_options(id, label),
      work_content:work_content_options(id, label),
      health_type:health_type_options(id, label)
    `)
    .eq('sync_status', 'conflict')
    .order('work_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
