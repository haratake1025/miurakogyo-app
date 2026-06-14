import { Fragment } from 'react'
import type { Site } from '@/types/db'
import type { ReportRow, WorkerSummary } from '@/types/frontend'
import { getDaysInMonth } from '@/lib/utils/date'

const WORK_SHORT: Record<string, string> = {
  '106548': '①', '106549': '②', '106550': '③', '106551': '④',
  '106552': '⑤', '106553': '⑥', '106554': '⑦', '106555': '⑧',
}
const HEALTH_SHORT: Record<string, string> = {
  '106556': '〇', '106557': '△', '106558': '✖',
}
const WEEK_JP = ['日', '月', '火', '水', '木', '金', '土']

function toWareki(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.slice(0, 10).split('-').map(Number)
  const [y, m, d] = parts
  return `令和${y - 2018}年${m}月${d}日`
}

type Props = {
  site: Site
  reports: ReportRow[]
  month: string
  period: 'first' | 'second'
}

const MIN_ROWS = 20

const border = '1px solid black'
const cellBase: React.CSSProperties = { border, padding: '0.5mm 1mm', lineHeight: 1.3 }

function companyFontSize(name: string): string {
  if (name.length > 15) return '4.5pt'
  if (name.length > 10) return '5.5pt'
  return '6.5pt'
}

function WorkerRow({
  no, worker, days, reportMap,
}: {
  no: number
  worker: WorkerSummary
  days: string[]
  reportMap: Map<string, ReportRow>
}) {
  return (
    <tr style={{ height: '10mm' }}>
      <td style={{ ...cellBase, textAlign: 'center', fontSize: '6.5pt', width: '6mm' }}>{no}</td>
      <td style={{ ...cellBase, fontSize: companyFontSize(worker.company_name) }}>{worker.company_name}</td>
      <td style={{ ...cellBase, fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{worker.worker_name}</td>
      {days.map(day => {
        const r = reportMap.get(`${worker.id}_${day}`)
        const wc = r?.work_content_id ? (WORK_SHORT[r.work_content_id] ?? '') : ''
        const ht = r?.health_type_id ? (HEALTH_SHORT[r.health_type_id] ?? '') : ''
        return (
          <Fragment key={day}>
            <td style={{ ...cellBase, textAlign: 'center', width: '8mm', fontSize: '10pt' }}>{wc}</td>
            <td style={{ ...cellBase, textAlign: 'center', width: '8mm', fontSize: '10pt' }}>{ht}</td>
          </Fragment>
        )
      })}
    </tr>
  )
}

function BlankRow({ no, colCount }: { no: number; colCount: number }) {
  return (
    <tr style={{ height: '10mm' }}>
      <td style={{ ...cellBase, textAlign: 'center', fontSize: '6.5pt' }}>{no}</td>
      {Array.from({ length: colCount - 1 }).map((_, i) => (
        <td key={i} style={cellBase} />
      ))}
    </tr>
  )
}

export function AsbestosPrint({ site, reports, month, period }: Props) {
  const [, m] = month.split('-').map(Number)
  const periodLabel = period === 'first' ? '上' : '下'

  const allDays = getDaysInMonth(month)
  const days = allDays.filter(d => {
    const day = parseInt(d.slice(8), 10)
    return period === 'first' ? day <= 15 : day > 15
  })

  const workerMap = new Map<string, WorkerSummary>()
  for (const r of reports) {
    if (!workerMap.has(r.worker_id)) workerMap.set(r.worker_id, r.worker)
  }
  const workers = [...workerMap.values()]

  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))
  const totalWorkers = workers.length
  const blankRows = Math.max(0, MIN_ROWS - totalWorkers)
  const colCount = 3 + days.length * 2

  return (
    <div className="hidden print:block">
      <div style={{
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
        fontSize: '7pt',
        color: '#000',
        backgroundColor: '#fff',
      }}>

        {/* ===== タイトル行 ===== */}
        <div style={{ marginBottom: '2mm' }}>
          <span style={{ fontSize: '13pt', fontWeight: 'bold' }}>石綿作業従事者作業記録</span>
          <span style={{ fontSize: '11pt', fontWeight: 'bold', marginLeft: '8mm' }}>{m}月　{periodLabel}</span>
        </div>

        {/* ===== ヘッダ情報（凡例を右端セルに配置） ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '1mm' }}>
          <tbody>
            <tr>
              <td style={{ ...cellBase, width: '22%', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>管轄工事会社:</div>
                <div style={{ fontSize: '14pt', marginTop: '1mm' }}>{site.client_name ?? '　'}</div>
              </td>
              <td style={{ ...cellBase, verticalAlign: 'top', fontSize: '14pt' }}>
                <div><strong>工事名称:</strong> {site.name}</div>
                <div style={{ marginTop: '0.5mm' }}>
                  <strong>工事期間:</strong> {toWareki(site.period_start)} ～ {toWareki(site.period_end)}
                </div>
                <div style={{ marginTop: '0.5mm' }}>
                  <strong>現場責任者:</strong> {site.manager_name ?? '　'}
                </div>
              </td>
              <td style={{ ...cellBase, width: '42%', verticalAlign: 'top', fontSize: '6pt' }}>
                <div style={{ fontWeight: 'bold', fontSize: '7pt', marginBottom: '1mm' }}>作業内容・作業種別番号</div>
                <table style={{ borderCollapse: 'collapse', fontSize: '6pt', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '35%', paddingRight: '1mm', verticalAlign: 'top' }}>① 準備工事（足場・仮設構造物等）</td>
                      <td style={{ color: 'red', verticalAlign: 'top', width: '35%' }}>⑤ 石綿板材処理</td>
                      <td rowSpan={4} style={{ verticalAlign: 'top', paddingLeft: '2mm', borderLeft: '1px solid #aaa', width: '30%' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5mm' }}>健康状態確認（自己申告）</div>
                        <div>〇 体調良好</div>
                        <div>△ 体調やや不調</div>
                        <div>✖ 体調不調 → 作業禁止</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>② 石綿除去作業（外壁材・保温材）</td>
                      <td style={{ color: 'red', verticalAlign: 'top' }}>⑥ 養生・安全・品質管理</td>
                    </tr>
                    <tr>
                      <td>③ 作業の環境測定</td>
                      <td>⑦ 抜き取り</td>
                    </tr>
                    <tr>
                      <td>④ 自己確認（立会等）</td>
                      <td>⑧ 分析</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== 注意事項 + 報告者 ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3mm', marginBottom: '1mm' }}>
          <div style={{ flex: 1, fontSize: '5.5pt', lineHeight: 1.5 }}>
            <div>※作業内容・作業種別番号のつけ方は石綿に暴露されるか否かで判断し、その判断は石綿作業主任者が行って下さい。</div>
            <div>※現場監督者・責任者の人も作業者欄に記入し記録を残して下さい（但し、石綿に暴露される業務を実施した人のみ。又、勤務表で管理される人は用紙記入期間は勤怠表には記入しないこと）</div>
            <div>※健康状態確認は右上の表より番号及び記号を選択記入して下さい。</div>
          </div>
          <div style={{ padding: '1mm 2mm', display: 'flex', alignItems: 'center', gap: '2mm', minWidth: '48mm' }}>
            <span style={{ fontSize: '6pt', whiteSpace: 'nowrap' }}>報告者:</span>
            <div style={{ flex: 1, borderBottom: '1px solid black', height: '4mm' }} />
          </div>
        </div>

        {/* ===== メイングリッド ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '6mm' }} />
            <col style={{ width: '17mm' }} />
            <col style={{ width: '17mm' }} />
            {days.map(d => (
              <Fragment key={d}>
                <col style={{ width: '8mm' }} />
                <col style={{ width: '8mm' }} />
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '6pt', verticalAlign: 'middle' }}>
                No.
              </th>
              <th rowSpan={2} style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '6pt', verticalAlign: 'middle' }}>
                所属会社名
              </th>
              <th rowSpan={2} style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '6pt', verticalAlign: 'middle' }}>
                作業者名
              </th>
              {days.map(day => {
                const d = new Date(day + 'T00:00:00')
                const dayNum = d.getDate()
                const weekLabel = WEEK_JP[d.getDay()]
                return (
                  <th key={day} colSpan={2} style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '6pt' }}>
                    {m}月{dayNum}日<br />{weekLabel}
                  </th>
                )
              })}
            </tr>
            <tr>
              {days.map(day => (
                <Fragment key={day}>
                  <th style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '5.5pt' }}>
                    作業<br />内容
                  </th>
                  <th style={{ ...cellBase, textAlign: 'center', fontWeight: 'bold', fontSize: '5.5pt' }}>
                    健康<br />状態
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {workers.map((w, i) => (
              <WorkerRow key={w.id} no={i + 1} worker={w} days={days} reportMap={reportMap} />
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <BlankRow key={i} no={totalWorkers + i + 1} colCount={colCount} />
            ))}
          </tbody>
        </table>

        {/* ===== 備考欄 ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '2mm' }}>
          <tbody>
            <tr>
              <td style={{ ...cellBase, verticalAlign: 'top', height: '22mm' }}>
                <div style={{ fontWeight: 'bold' }}>備　考:</div>
                <div style={{ fontSize: '6pt', color: '#555', marginTop: '1mm' }}>（新しく汚染された場合の応急措置概要等）</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  )
}
