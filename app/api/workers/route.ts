import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = req.nextUrl.searchParams.get('company')

  const supabase = createServerClient()
  let query = supabase
    .from('workers')
    .select('*')
    .eq('is_active', true)
    .order('company_name')
    .order('worker_name')

  if (company) query = query.eq('company_name', company)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
