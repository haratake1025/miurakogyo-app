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
const RED = '#ff0000'

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
const cellBase: React.CSSProperties = { border, padding: '0.5pt 2pt', lineHeight: 1.2 }
const thBase: React.CSSProperties = {
  border, padding: '0.5pt 1pt', lineHeight: 1.15,
  fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
  background: '#fff',
}
const INFO_ROW_H = '7mm'

export function AsbestosPrint({ site, reports, month, period }: Props) {
  const [, m] = month.split('-').map(Number)
  const periodLabel = period === 'first' ? '上' : '下'

  const allDays = getDaysInMonth(month)
  const days = allDays.filter(d => {
    const day = parseInt(d.slice(8), 10)
    return period === 'first' ? day <= 16 : day > 16
  })

  const workerMap = new Map<string, WorkerSummary>()
  for (const r of reports) {
    if (!workerMap.has(r.worker_id)) workerMap.set(r.worker_id, r.worker)
  }
  const workers = [...workerMap.values()].sort(compareWorkers)
  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))

  const totalWorkers = workers.length
  const blankRows = Math.max(0, MIN_ROWS - totalWorkers)
  const dataRowCount = totalWorkers + blankRows

  // rowSpan + writing-mode:vertical-rl は Chromium のテーブルレイアウトで
  // 正しく高さが計算されず、flexの align-items:stretch でも文字が潰れるため、
  // 行数から高さ(mm)を直接計算してテーブル外の兄弟要素に固定指定する
  const HEADER_ROW1_H = 10
  const HEADER_ROW2_H = 8
  const DATA_ROW_H = 7
  const REMARKS_H = 20
  const gridHeight = HEADER_ROW1_H + HEADER_ROW2_H + DATA_ROW_H * dataRowCount + REMARKS_H

  const verticalCellStyle: React.CSSProperties = {
    border,
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    textAlign: 'center',
    fontSize: '11pt',
    fontWeight: 'bold',
    letterSpacing: '0.15em',
    padding: '3mm 1mm',
    width: '5.5mm',
    height: `${gridHeight}mm`,
    boxSizing: 'border-box',
    flexShrink: 0,
  }

  return (
    <div className="hidden print:block">
      {/* A3横・実測余白に合わせる */}
      <style>{`@page { size: A3 landscape; margin: 12mm 20mm 12mm 11mm; }`}</style>

      <div style={{
        fontFamily: '"MS PGothic", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "IPAGothic", sans-serif',
        fontSize: '9.8pt',
        color: '#000',
        backgroundColor: '#fff',
      }}>

        {/* ===== タイトル行（作業内容・作業種別番号の見出しもこの行の高さに合わせる） ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '1mm' }}>
          <div style={{ display: 'inline-block', paddingBottom: '2px', borderBottom: '1px solid black' }}>
            <div style={{
              display: 'inline-block', paddingBottom: '2px', borderBottom: '1px solid black',
              fontSize: '16pt', fontWeight: 'bold',
            }}>
              石 綿 作 業 従 事 者 作 業 記 録
            </div>
          </div>
          <span style={{ fontSize: '16pt', fontWeight: 'bold', marginLeft: '10mm' }}>{m}月</span>
          <span style={{ fontSize: '9.8pt', fontWeight: 'bold', marginLeft: '3mm' }}>{periodLabel}</span>
          <div style={{ flex: 1 }} />
          <div style={{ width: '36%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontWeight: 'bold', fontSize: '9.8pt' }}>作業内容・作業種別番号</span>
            <span style={{ fontSize: '9.8pt' }}>平成18年11月13日改定</span>
          </div>
        </div>

        {/* ===== ヘッダ情報 ===== */}
        <div style={{ display: 'flex', width: '100%', marginBottom: '1mm', alignItems: 'stretch' }}>
          {/* 管轄工事会社 + 工事件名・期間・責任者（横罫線が両ブロックを貫通する） */}
          <div style={{ border, display: 'flex', flex: 1 }}>
            <div style={{ width: '95mm', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: INFO_ROW_H, borderBottom: border, display: 'flex', alignItems: 'center', padding: '0 2mm', fontWeight: 'bold', color: RED, fontSize: '9.8pt' }}>
                管轄工事会社:
              </div>
              <div style={{ height: INFO_ROW_H, borderBottom: border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9.8pt' }}>
                {site.client_name ?? '　'}
              </div>
              <div style={{ height: INFO_ROW_H }} />
            </div>

            {/* 工事件名・期間・責任者（ラベル左寄せ／値中央） */}
            <div style={{ borderLeft: border, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: INFO_ROW_H, borderBottom: border, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '16%', borderRight: border, height: '100%', display: 'flex', alignItems: 'center', padding: '0 2mm', fontSize: '9.8pt', whiteSpace: 'nowrap' }}>
                  <strong>工 事 件 名：</strong>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '9.8pt' }}>{site.name}</div>
              </div>
              <div style={{ height: INFO_ROW_H, borderBottom: border, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '16%', borderRight: border, height: '100%', display: 'flex', alignItems: 'center', padding: '0 2mm', fontSize: '9.8pt', whiteSpace: 'nowrap' }}>
                  <strong>工 事 期 間：</strong>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '9.8pt' }}>
                  {toWareki(site.period_start)}　～　{toWareki(site.period_end)}
                </div>
              </div>
              <div style={{ height: INFO_ROW_H, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '16%', borderRight: border, height: '100%', display: 'flex', alignItems: 'center', padding: '0 2mm', fontSize: '9.8pt', whiteSpace: 'nowrap' }}>
                  <strong>現場責任者：</strong>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '9.8pt' }}>{site.manager_name ?? '　'}</div>
              </div>
            </div>
          </div>

          <div style={{ width: '10mm', flexShrink: 0 }} />

          {/* 凡例（詳細は枠内） */}
          <div style={{ border, width: '36%', display: 'flex', fontSize: '9.4pt' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ flex: 1, padding: '0.8mm 1.5mm' }}>① 準備工事（足場・区画養生他）</div>
                <div style={{ flex: 1, borderLeft: border, padding: '0.8mm 1.5mm' }}>④ 石綿廃材処理</div>
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ flex: 1, padding: '0.8mm 1.5mm' }}>② 石綿除去作業（外装材・保温材）</div>
                <div style={{ flex: 1, borderLeft: border, padding: '0.8mm 1.5mm' }}>⑤ 養生撤去　（区画養生・足場撤去）</div>
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ flex: 1, padding: '0.8mm 1.5mm' }}>③ 作業中環境測定</div>
                <div style={{ flex: 1, borderLeft: border, padding: '0.8mm 1.5mm', color: RED }}>⑥管理（監督・安全・品証他）</div>
              </div>
              <div style={{ padding: '0.8mm 1.5mm', color: RED }}>⑦抜き取り　⑧分析</div>
            </div>
            <div style={{ width: '32%', borderLeft: border, padding: '0.8mm 1.5mm' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9.8pt', marginBottom: '0.5mm' }}>健康状態確認（自己申告）</div>
              <div>○ 体調良好</div>
              <div>△ 体調やや不調</div>
              <div>× 体調不調　⇒　作業禁止</div>
            </div>
          </div>
        </div>

        {/* ===== 注意事項 + 報告者 ===== */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3mm', marginBottom: '1mm' }}>
          <div style={{ flex: 1, fontSize: '9.8pt', lineHeight: 1.4, marginLeft: '20mm' }}>
            <div style={{ color: RED }}>＊作業内容・作業種別番号のつけ方は石綿に暴露されるか否かで判断し、その判断は石綿作業主任者が行って下さい。</div>
            <div style={{ color: RED }}>＊現場監督者、責任者の人も作業者欄に記入し記録を残して下さい（但し、石綿に暴露される業務を実施した人のみ。又、勤怠表で管理される</div>
            <div style={{ color: RED, paddingLeft: '3mm' }}>人は用紙記入期間は、勤怠表には記入しないこと）</div>
            <div>＊健康状態確認は右上の表より番号及び記号を選択記入して下さい。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', flexShrink: 0, paddingTop: '2mm' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10.5pt', whiteSpace: 'nowrap' }}>報告者</span>
            <span style={{ fontSize: '9.8pt', minWidth: '20mm', borderBottom: border, paddingBottom: '1px' }}>
              {site.manager_name ?? '　'}
            </span>
          </div>
        </div>

        {/* ===== メイングリッド（縦書き列 + 表を flex で並べ、縦書き列を備考欄まで延長） ===== */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={verticalCellStyle}>石綿作業従事者確認記録</div>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '8mm' }} />    {/* No. */}
            <col style={{ width: '24mm' }} />   {/* 所属会社 */}
            <col style={{ width: '30mm' }} />   {/* 作業者名 */}
            {days.map(d => (
              <Fragment key={d}>
                <col />
                <col />
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: `${HEADER_ROW1_H}mm` }}>
              <th colSpan={3} style={{ ...thBase, padding: '0 2mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9.8pt' }}>作業者名</span>
                  <span style={{ fontSize: '7.5pt', fontWeight: 'normal', textAlign: 'right' }}>
                    <div>月日</div>
                    <div>曜日</div>
                  </span>
                </div>
              </th>
              {days.map(day => {
                const dayNum = new Date(day + 'T00:00:00').getDate()
                const weekLabel = WEEK_JP[new Date(day + 'T00:00:00').getDay()]
                return (
                  <th key={day} colSpan={2} style={{ ...thBase, fontSize: '9pt' }}>
                    <div>{m}月{dayNum}日</div>
                    <div style={{ fontSize: '8pt' }}>{weekLabel}</div>
                  </th>
                )
              })}
            </tr>
            <tr style={{ height: `${HEADER_ROW2_H}mm` }}>
              <th style={thBase} />
              <th style={{ ...thBase, padding: 0 }}>
                {/* 対角線: background(グラデーション)は印刷設定で消えることがあるため、
                    border付きの要素を回転させて描画する（枠線は常に印刷される） */}
                <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: `${HEADER_ROW2_H}mm`, overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '25.3mm',
                    borderTop: '1px solid #000',
                    transformOrigin: 'top left',
                    transform: 'rotate(18.435deg)',
                  }} />
                  <span style={{ position: 'absolute', top: '0.5mm', right: '1mm', fontSize: '7pt' }}>確認項目</span>
                  <span style={{ position: 'absolute', bottom: '0.5mm', left: '1mm', fontSize: '8.5pt', color: RED }}>所属会社</span>
                </div>
              </th>
              <th style={{ ...thBase, fontSize: '9pt' }}>作業者名</th>
              {days.map(day => (
                <Fragment key={day}>
                  <th style={{ ...thBase, fontSize: '7.1pt' }}>作業<br />内容</th>
                  <th style={{ ...thBase, fontSize: '7.1pt' }}>健康状<br />態確認</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {workers.map((w, i) => (
              <tr key={w.id} style={{ height: '7mm' }}>
                <td style={{ ...cellBase, textAlign: 'center', fontSize: '5.4pt' }}>{i + 1}</td>
                <td style={{ ...cellBase, fontSize: '6.5pt', lineHeight: 1.05 }}>{w.company_name}</td>
                <td style={{ ...cellBase, textAlign: 'center', fontSize: '9.8pt', whiteSpace: 'nowrap' }}>{w.worker_name}</td>
                {days.map(day => {
                  const r = reportMap.get(`${w.id}_${day}`)
                  const wc = r?.work_content_id ? (WORK_SHORT[r.work_content_id] ?? '') : ''
                  const ht = r?.health_type_id ? (HEALTH_SHORT[r.health_type_id] ?? '') : ''
                  return (
                    <Fragment key={day}>
                      <td style={{ ...cellBase, textAlign: 'center', fontSize: '14.3pt' }}>{wc}</td>
                      <td style={{ ...cellBase, textAlign: 'center', fontSize: '14.3pt' }}>{ht}</td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={i} style={{ height: '7mm' }}>
                <td style={{ ...cellBase, textAlign: 'center', fontSize: '5.4pt' }}>{totalWorkers + i + 1}</td>
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
            {/* ===== 備考欄（作業者名列の延長線で区切り、縦書き列の枠をここまで延長） ===== */}
            <tr style={{ height: '20mm' }}>
              <td colSpan={3} style={{ ...cellBase, verticalAlign: 'top', fontSize: '9.8pt' }}>
                <div style={{ fontWeight: 'bold' }}>備　　考：</div>
                <div style={{ marginTop: '1mm' }}>（著しく汚染された場合の応急措置概要他）</div>
              </td>
              <td colSpan={days.length * 2} style={cellBase} />
            </tr>
          </tbody>
        </table>
        </div>

      </div>
    </div>
  )
}
