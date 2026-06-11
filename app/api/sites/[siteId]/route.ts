import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteId } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
