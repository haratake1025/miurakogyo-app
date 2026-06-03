import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteId } = await params
  const month = req.nextUrl.searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータが必要です (YYYY-MM)' }, { status: 400 })
  }

  const supabase = createServerClient()

  const [{ data: site }, { data: reports }] = await Promise.all([
    supabase.from('sites').select('name, client_name, manager_name').eq('id', siteId).single(),
    supabase
      .from('daily_reports')
      .select(`
        work_date, over_hour,
        worker:workers(company_name, worker_name),
        day_yakan:day_yakan_options(label),
        work_content:work_content_options(label),
        health_type:health_type_options(label)
      `)
      .eq('site_id', siteId)
      .gte('work_date', `${month}-01`)
      .lte('work_date', `${month}-31`)
      .order('work_date'),
  ])

  if (!site || !reports) {
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }

  // 日付リスト（1日〜月末）
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, '0')
    return `${month}-${d}`
  })

  // 作業者×日付マップ
  type ReportEntry = {
    work_date: string
    over_hour: number
    day_yakan: { label: string } | null
    work_content: { label: string } | null
    health_type: { label: string } | null
    worker: { company_name: string; worker_name: string } | null
  }
  const typed = reports as unknown as ReportEntry[]

  const reportMap = new Map<string, ReportEntry>()
  for (const r of typed) {
    const key = `${r.worker?.worker_name ?? ''}_${r.work_date}`
    reportMap.set(key, r)
  }

  // ユニーク作業者リスト（会社名→氏名順）
  const workerSet = new Map<string, { company: string; name: string }>()
  for (const r of typed) {
    const w = r.worker
    if (w && !workerSet.has(w.worker_name)) {
      workerSet.set(w.worker_name, { company: w.company_name, name: w.worker_name })
    }
  }
  const workers = Array.from(workerSet.values()).sort((a, b) => {
    const c = a.company.localeCompare(b.company, 'ja')
    return c !== 0 ? c : a.name.localeCompare(b.name, 'ja')
  })

  // ヘッダ行
  const header = ['会社', '氏名', ...dates.map(d => `${new Date(d + 'T00:00:00').getDate()}日`)]

  // データ行
  const rows = workers.map(w => {
    const cells = dates.map(date => {
      const r = reportMap.get(`${w.name}_${date}`)
      if (!r) return ''
      const isNight = r.day_yakan?.label === '夜勤'
      const oh = r.over_hour ?? 0
      let cell = isNight ? '●夜' : '●'
      if (oh > 0) cell += `+${oh}h`
      return cell
    })
    return [w.company, w.name, ...cells]
  })

  // タイトル行（メタ情報）
  const titleRows = [
    [`出面集計 ${y}年${m}月`, '', `現場: ${site.name ?? ''}`],
    [`管轄: ${site.client_name ?? ''}`, '', `責任者: ${site.manager_name ?? ''}`],
    [],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, header, ...rows])

  // 列幅設定
  ws['!cols'] = [
    { wch: 20 }, // 会社
    { wch: 12 }, // 氏名
    ...dates.map(() => ({ wch: 5 })),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${y}年${m}月`)

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const fileName = `出面集計_${site.name ?? siteId}_${month}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
