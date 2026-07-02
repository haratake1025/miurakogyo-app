import { Fragment } from 'react'
import type { Site } from '@/types/db'
import type { ReportRow, WorkerSummary } from '@/types/frontend'
import { getDaysInMonth } from '@/lib/utils/date'
import { compareWorkers } from '@/lib/utils/sort'

const WORK_SHORT: Record<string, string> = {
  '106548': '①', '106549': '②', '106550': '③', '106551': '④',
  '106552': '⑤', '106553': '⑥', '106554': '⑦', '106555': '⑧',
}
const HEALTH_SHORT: Record<string, string> = {
  '106556': '○', '106557': '△', '106558': '×',
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
const cellBase: React.CSSProperties = { border, padding: '0.3mm 0.8mm', lineHeight: 1.3 }
const thBase: React.CSSProperties = {
  border, padding: '0.3mm 0.5mm', lineHeight: 1.2,
  fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
  background: '#fff',
}

function companyFontSize(name: string): string {
  if (name.length > 15) return '5.5pt'
  if (name.length > 10) return '6.5pt'
  return '8pt'
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
  const workers = [...workerMap.values()].sort(compareWorkers)
  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))

  const totalWorkers = workers.length
  const blankRows = Math.max(0, MIN_ROWS - totalWorkers)
  const totalDataRows = totalWorkers + blankRows

  const verticalCellStyle: React.CSSProperties = {
    ...cellBase,
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    textAlign: 'center',
    fontSize: '7pt',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    padding: '2mm 1mm',
    whiteSpace: 'nowrap',
  }

  return (
    <div className="hidden print:block">
      {/* A4横・余白8mm */}
      <style>{`@page { size: A4 landscape; margin: 8mm 10mm; }`}</style>

      <div style={{
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
        fontSize: '8pt',
        color: '#000',
        backgroundColor: '#fff',
      }}>

        {/* ===== タイトル行 ===== */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2mm' }}>
          <span style={{ fontSize: '17pt', fontWeight: 'bold', letterSpacing: '0.18em' }}>
            石 綿 作 業 従 事 者 作 業 記 録
          </span>
          <span style={{ fontSize: '14pt', fontWeight: 'bold', marginLeft: '8mm' }}>{m}月</span>
          <span style={{ fontSize: '14pt', fontWeight: 'bold', marginLeft: '6mm' }}>{periodLabel}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '7.5pt' }}>平成18年11月13日改定</span>
        </div>

        {/* ===== ヘッダ情報 ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '1mm' }}>
          <tbody>
            <tr>
              {/* 管轄工事会社 */}
              <td style={{ border, verticalAlign: 'top', width: '20%' }}>
                <div style={{
                  background: '#c00000', color: '#fff',
                  fontWeight: 'bold', fontSize: '8.5pt',
                  padding: '0.5mm 2mm',
                }}>
                  管轄工事会社:
                </div>
                <div style={{ padding: '0.5mm 2mm', fontSize: '9pt', fontWeight: 'bold' }}>
                  {site.client_name ?? '　'}
                </div>
              </td>

              {/* 工事件名・期間・責任者 */}
              <td style={{ border, verticalAlign: 'top', padding: '0.8mm 2mm' }}>
                <div style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                  <strong>工 事 件 名：</strong>{site.name}
                </div>
                <div style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                  <strong>工 事 期 間：</strong>{toWareki(site.period_start)}　～　{toWareki(site.period_end)}
                </div>
                <div style={{ fontSize: '9pt' }}>
                  <strong>現場責任者：</strong>{site.manager_name ?? '　'}
                </div>
              </td>

              {/* 凡例 */}
              <td style={{ border, verticalAlign: 'top', width: '42%', padding: '0.5mm 1.5mm', fontSize: '7pt' }}>
                <div style={{ fontWeight: 'bold', fontSize: '8pt', marginBottom: '0.5mm' }}>作業内容・作業種別番号</div>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '7pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '36%', verticalAlign: 'top', paddingRight: '1mm' }}>① 準備工事（足場・区画養生他）</td>
                      <td style={{ width: '32%', verticalAlign: 'top' }}>④ 石綿廃材処理</td>
                      <td rowSpan={4} style={{ verticalAlign: 'top', paddingLeft: '1.5mm', borderLeft: '1px solid #999', width: '32%' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5mm' }}>健康状態確認（自己申告）</div>
                        <div>○ 体調良好</div>
                        <div>△ 体調やや不調</div>
                        <div>× 体調不調 ⇒ 作業禁止</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>② 石綿除去作業（外装材・保温材）</td>
                      <td style={{ verticalAlign: 'top' }}>⑤ 養生撤去　（区画養生・足場撤去）</td>
                    </tr>
                    <tr>
                      <td>③ 作業中環境測定</td>
                      <td>⑥管理（監督・安全・品証他）</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>⑦抜き取り　⑧分析</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== 注意事項 + 報告者 ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3mm', marginBottom: '1mm' }}>
          <div style={{ flex: 1, fontSize: '7pt', lineHeight: 1.5 }}>
            <div>＊作業内容・作業種別番号のつけ方は石綿に暴露されるか否かで判断し、その判断は石綿作業主任者が行って下さい。</div>
            <div>＊現場監督者、責任者の人も作業者欄に記入し記録を残して下さい（但し、石綿に暴露される業務を実施した人のみ。又、勤怠表で管理される</div>
            <div style={{ paddingLeft: '3mm' }}>人は用紙記入期間は、勤怠表には記入しないこと）</div>
            <div>＊健康状態確認は右上の表より番号及び記号を選択記入して下さい。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', flexShrink: 0, paddingTop: '2mm' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8.5pt', whiteSpace: 'nowrap' }}>報告者</span>
            <span style={{ fontSize: '9pt', minWidth: '16mm' }}>{site.manager_name ?? '　'}</span>
            <div style={{
              width: '14mm', height: '14mm',
              border: '1px solid black',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '7pt', color: '#bbb',
            }}>印</div>
          </div>
        </div>

        {/* ===== メイングリッド ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '5mm' }} />   {/* 石綿作業従事者確認記録 縦書き */}
            <col style={{ width: '5mm' }} />   {/* No. */}
            <col style={{ width: '18mm' }} />  {/* 所属会社 */}
            <col style={{ width: '16mm' }} />  {/* 作業者名 */}
            {days.map(d => (
              <Fragment key={d}>
                <col />
                <col />
              </Fragment>
            ))}
          </colgroup>
          <thead>
            {/* 月日行 */}
            <tr>
              <th rowSpan={3} style={{ border, background: '#fff' }} />
              <th colSpan={3} style={{ ...thBase, fontSize: '7pt' }}>月日</th>
              {days.map(day => {
                const dayNum = new Date(day + 'T00:00:00').getDate()
                return (
                  <th key={day} colSpan={2} style={{ ...thBase, fontSize: '7.5pt' }}>
                    {m}月{dayNum}日
                  </th>
                )
              })}
            </tr>
            {/* 曜日行 */}
            <tr>
              <th colSpan={3} style={{ ...thBase, fontSize: '7pt' }}>曜日</th>
              {days.map(day => {
                const weekLabel = WEEK_JP[new Date(day + 'T00:00:00').getDay()]
                return (
                  <th key={day} colSpan={2} style={{ ...thBase, fontSize: '8pt' }}>
                    {weekLabel}
                  </th>
                )
              })}
            </tr>
            {/* 確認項目行 */}
            <tr>
              <th style={{ ...thBase, fontSize: '6.5pt' }}>No.</th>
              <th style={{ ...thBase, fontSize: '6pt' }}>所属会社</th>
              <th style={{ ...thBase, fontSize: '6pt' }}>作業者名</th>
              {days.map(day => (
                <Fragment key={day}>
                  <th style={{ ...thBase, fontSize: '5.5pt' }}>作業<br />内容</th>
                  <th style={{ ...thBase, fontSize: '5.5pt' }}>健康状<br />態確認</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {workers.map((w, i) => (
              <tr key={w.id} style={{ height: '8.5mm' }}>
                {i === 0 && (
                  <td rowSpan={totalDataRows} style={verticalCellStyle}>
                    石綿作業従事者確認記録
                  </td>
                )}
                <td style={{ ...cellBase, textAlign: 'center', fontSize: '7pt' }}>{i + 1}</td>
                <td style={{ ...cellBase, fontSize: companyFontSize(w.company_name) }}>{w.company_name}</td>
                <td style={{ ...cellBase, fontSize: '8pt', whiteSpace: 'nowrap' }}>{w.worker_name}</td>
                {days.map(day => {
                  const r = reportMap.get(`${w.id}_${day}`)
                  const wc = r?.work_content_id ? (WORK_SHORT[r.work_content_id] ?? '') : ''
                  const ht = r?.health_type_id ? (HEALTH_SHORT[r.health_type_id] ?? '') : ''
                  return (
                    <Fragment key={day}>
                      <td style={{ ...cellBase, textAlign: 'center', fontSize: '11pt' }}>{wc}</td>
                      <td style={{ ...cellBase, textAlign: 'center', fontSize: '11pt' }}>{ht}</td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={i} style={{ height: '8.5mm' }}>
                {i === 0 && workers.length === 0 && (
                  <td rowSpan={totalDataRows} style={verticalCellStyle}>
                    石綿作業従事者確認記録
                  </td>
                )}
                <td style={{ ...cellBase, textAlign: 'center', fontSize: '7pt' }}>{totalWorkers + i + 1}</td>
                <td style={cellBase} />
                <td style={cellBase} />
                {days.map(day => (
                  <Fragment key={day}>
                    <td style={cellBase} />
                    <td style={cellBase} />
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== 備考欄 ===== */}
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '1mm' }}>
          <tbody>
            <tr>
              <td style={{ ...cellBase, verticalAlign: 'top', height: '20mm' }}>
                <div style={{ fontWeight: 'bold' }}>備 考：</div>
                <div style={{ fontSize: '7pt', color: '#555', marginTop: '1mm' }}>（著しく汚染された場合の応急措置概要他）</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  )
}
