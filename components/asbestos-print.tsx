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

function WorkerRow({
  no, worker, days, reportMap,
}: {
  no: number
  worker: WorkerSummary
  days: string[]
  reportMap: Map<string, ReportRow>
}) {
  return (
    <tr>
      <td style={{ ...cellBase, textAlign: 'center', fontSize: '6.5pt', width: '6mm' }}>{no}</td>
      <td style={{ ...cellBase, fontSize: '6.5pt' }}>{worker.company_name}</td>
      <td style={{ ...cellBase, fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{worker.worker_name}</td>
      {days.map(day => {
        const r = reportMap.get(`${worker.id}_${day}`)
        const wc = r?.work_content_id ? (WORK_SHORT[r.work_content_id] ?? '') : ''
        const ht = r?.health_type_id ? (HEALTH_SHORT[r.health_type_id] ?? '') : ''
        return (
          <Fragment key={day}>
            <td style={{ ...cellBase, textAlign: 'center', width: '8mm' }}>{wc}</td>
            <td style={{ ...cellBase, textAlign: 'center', width: '8mm' }}>{ht}</td>
          </Fragment>
        )
      })}
    </tr>
  )
}

function BlankRow({ no, colCount }: { no: number; colCount: number }) {
  return (
    <tr style={{ height: '6.5mm' }}>
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
  const employees = [...workerMap.values()]
    .filter(w => w.source_kind === 'employee')
    .sort((a, b) => a.worker_name.localeCompare(b.worker_name, 'ja'))
  const partners = [...workerMap.values()]
    .filter(w => w.source_kind === 'partner')
    .sort((a, b) => {
      const c = a.company_name.localeCompare(b.company_name, 'ja')
      return c !== 0 ? c : a.worker_name.localeCompare(b.worker_name, 'ja')
    })

  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))
  const totalWorkers = employees.length + partners.length
  const blankRows = Math.max(0, MIN_ROWS - totalWorkers)
  // No. + 所属会社名 + 作業者名 + (作業内容 + 健康状態) × days
  const colCount = 3 + days.length * 2

  const sectionHeaderStyle: React.CSSProperties = {
    ...cellBase,
    backgroundColor: '#e8e8e8',
    fontWeight: 'bold',
    fontSize: '6.5pt',
  }

  return (
    <div className="hidden print:block">
      <div style={{
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
        fontSize: '7pt',
        color: '#000',
        backgroundColor: '#fff',
      }}>

        {/* ===== タイトル行 ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2mm' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8mm' }}>
            <span style={{ fontSize: '13pt', fontWeight: 'bold' }}>石綿作業従事者作業記録</span>
            <span style={{ fontSize: '11pt', fontWeight: 'bold' }}>{m}月　{periodLabel}</span>
          </div>
          {/* 凡例 */}
          <div style={{ fontSize: '6pt', textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', fontSize: '7pt', marginBottom: '1mm' }}>作業内容・作業種別番号</div>
            <table style={{ borderCollapse: 'collapse', fontSize: '6pt' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '4mm' }}>① 準備工事（足場・仮設構造物等）</td>
                  <td>石綿板材処理</td>
                </tr>
                <tr>
                  <td>② 石綿除去作業（外壁材・保温材）</td>
                  <td>〇 健康状態確認：自己確認</td>
                </tr>
                <tr>
                  <td>③ 作業の環境測定</td>
                  <td>△ 養生・安全・品質管理</td>
                </tr>
                <tr>
                  <td colSpan={2}>⑦ 抜き取り　⑧ 分析</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ paddingTop: '0.5mm' }}>
                    〇 体調良好　△ 体調やや不調　✖ 体調不調 → 作業禁止
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== ヘッダ情報 ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '1mm' }}>
          <tbody>
            <tr>
              <td style={{ ...cellBase, width: '35%', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', fontSize: '6pt' }}>管轄工事会社:</div>
                <div style={{ fontSize: '8pt', marginTop: '1mm' }}>{site.client_name ?? '　'}</div>
              </td>
              <td style={{ ...cellBase, verticalAlign: 'top' }}>
                <div><strong>工事 名称:</strong> {site.name}</div>
                <div style={{ marginTop: '0.5mm' }}>
                  <strong>工事 期間:</strong> {toWareki(site.period_start)} ～ {toWareki(site.period_end)}
                </div>
                <div style={{ marginTop: '0.5mm' }}>
                  <strong>現場責任者:</strong> {site.manager_name ?? '　'}
                </div>
              </td>
              <td style={{ ...cellBase, width: '18mm', textAlign: 'center', verticalAlign: 'top' }}>
                <div style={{ fontSize: '6pt', marginBottom: '1mm' }}>報告者</div>
                <div style={{ border, height: '12mm', width: '14mm', margin: '0 auto' }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== 注意事項 ===== */}
        <div style={{ fontSize: '5.5pt', lineHeight: 1.5, marginBottom: '1mm' }}>
          <div>※作業内容・作業種別番号のつけ方は石綿に暴露されるかの判断になるため、その判断は石綿作業主任者が行ってください。</div>
          <div>※現場監督者、責任者の人も作業者名欄に記入し作業記録を残して下さい（但し、石綿に暴露される業務を実施した人のみ）</div>
          <div>※健康状態確認はおよそ作業開始30分前以降、記号及び氏名を選択記入で行ってください。</div>
        </div>

        {/* ===== メイングリッド ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '6mm' }} />
            <col style={{ width: '34mm' }} />
            <col style={{ width: '22mm' }} />
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
            {/* 石綿作業主任者（自社員）セクション */}
            <tr>
              <td colSpan={colCount} style={sectionHeaderStyle}>石綿作業主任者</td>
            </tr>
            {employees.map((w, i) => (
              <WorkerRow key={w.id} no={i + 1} worker={w} days={days} reportMap={reportMap} />
            ))}

            {/* 石綿作業従事者（協力会社）セクション */}
            <tr>
              <td colSpan={colCount} style={sectionHeaderStyle}>石綿作業従事者</td>
            </tr>
            {partners.map((w, i) => (
              <WorkerRow key={w.id} no={employees.length + i + 1} worker={w} days={days} reportMap={reportMap} />
            ))}

            {/* 空白行 */}
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
