import path from 'node:path'
import fs from 'node:fs'
import ExcelJS from 'exceljs'
import type { Site } from '@/types/db'
import type { ReportRow, WorkerSummary } from '@/types/frontend'
import { getDaysInMonth, getDayLabel } from '@/lib/utils/date'
import { compareWorkers } from '@/lib/utils/sort'
import { WORK_SHORT, HEALTH_SHORT } from '@/lib/asbestos/marks'

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/asbestos/asbestos-template.xlsx')
const LOGO_PATH = path.join(process.cwd(), 'lib/asbestos/nichias-logo.png')
const SHEET_NAME = { first: '石綿作業従事者記録_上', second: '石綿作業従事者記録_下' } as const

const WORKER_ROW_START = 15
const MAX_WORKER_ROWS = 20
const DAY_COL_START = 5 // E列（作業内容）。健康状態確認は+1列（F列）
const LOGO_ROW = 38
const NICHIAS_CLIENT_NAME = '株式会社 ニチアスセムクリート'

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

type Params = {
  site: Site
  reports: ReportRow[]
  month: string
  period: 'first' | 'second'
}

export async function buildAsbestosWorkbook({ site, reports, month, period }: Params): Promise<Buffer> {
  const [, m] = month.split('-').map(Number)

  const allDays = getDaysInMonth(month)
  const days = allDays.filter(d => {
    const day = parseInt(d.slice(8), 10)
    return period === 'first' ? day <= 16 : day > 16
  })

  const workerMap = new Map<string, WorkerSummary>()
  for (const r of reports) {
    if (!workerMap.has(r.worker_id)) workerMap.set(r.worker_id, r.worker)
  }
  const workers = [...workerMap.values()].sort(compareWorkers).slice(0, MAX_WORKER_ROWS)
  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(TEMPLATE_PATH)
  const ws = workbook.getWorksheet(SHEET_NAME[period])
  if (!ws) throw new Error(`テンプレートにシート ${SHEET_NAME[period]} が見つかりません`)

  ws.getCell('C5').value = site.client_name ?? ''
  ws.getCell('L4').value = site.name ?? ''
  ws.getCell('L6').value = site.manager_name ?? ''
  ws.getCell('AE8').value = site.manager_name ?? ''
  ws.getCell('L2').value = m
  if (site.period_start) ws.getCell('L5').value = toUtcDate(site.period_start)
  if (site.period_end) ws.getCell('R5').value = toUtcDate(site.period_end)

  days.forEach((day, i) => {
    const col = DAY_COL_START + i * 2
    ws.getCell(11, col).value = toUtcDate(day)
    ws.getCell(12, col).value = getDayLabel(day).label
  })

  workers.forEach((w, i) => {
    const row = WORKER_ROW_START + i
    ws.getCell(row, 3).value = w.company_name
    ws.getCell(row, 4).value = w.worker_name
    days.forEach((day, di) => {
      const col = DAY_COL_START + di * 2
      const r = reportMap.get(`${w.id}_${day}`)
      ws.getCell(row, col).value = r?.work_content_id ? (WORK_SHORT[r.work_content_id] ?? '') : ''
      ws.getCell(row, col + 1).value = r?.health_type_id ? (HEALTH_SHORT[r.health_type_id] ?? '') : ''
    })
  })

  if (site.client_name === NICHIAS_CLIENT_NAME) {
    // exceljs のバンドル依存(@fast-csv)が古い@types/nodeを持ち込み、Bufferの型が二重定義され衝突するため無効化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageId = workbook.addImage({ buffer: fs.readFileSync(LOGO_PATH) as any, extension: 'png' })
    ws.getRow(LOGO_ROW).height = 12
    ws.addImage(imageId, {
      tl: { col: 16.4, row: LOGO_ROW - 1 + 0.1 },
      ext: { width: 14, height: 14 },
    })
    const labelCell = ws.getCell(LOGO_ROW, 18)
    labelCell.value = 'ニチアス株式会社'
    labelCell.font = { bold: true, size: 10, name: 'MS Pゴシック' }
    labelCell.alignment = { vertical: 'middle' }
    ws.pageSetup.printArea = `A1:AJ${LOGO_ROW}`
  }

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
