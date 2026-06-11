'use client'

import { useState, use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { AsbestosGrid } from '@/components/asbestos-grid'
import { SyncBar } from '@/components/sync-bar'
import { formatMonth, addMonths, todayYearMonth } from '@/lib/utils/date'
import type { Site } from '@/types/db'
import type { ReportRow } from '@/types/frontend'

const WORK_LEGEND = [
  { id: '①', label: '準備工事' },
  { id: '②', label: '石綿除去' },
  { id: '③', label: '環境測定' },
  { id: '④', label: '廃材処理' },
  { id: '⑤', label: '養生撤去' },
  { id: '⑥', label: '管理' },
  { id: '⑦', label: '抜き取り' },
  { id: '⑧', label: '分析' },
]

export default function AsbestosPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = use(params)
  const [month, setMonth] = useState(todayYearMonth)
  const [period, setPeriod] = useState<'first' | 'second'>('first')
  const qc = useQueryClient()

  const { data: site } = useQuery<Site>({
    queryKey: ['site', siteId],
    queryFn: () => fetch(`/api/sites/${siteId}`).then(r => r.json()),
  })

  const reportsKey = ['site', siteId, 'reports', month]
  const { data: reports = [], isLoading } = useQuery<ReportRow[]>({
    queryKey: reportsKey,
    queryFn: () =>
      fetch(`/api/sites/${siteId}/reports?month=${month}`).then(r => r.json()),
  })

  const unsyncedCount = reports.filter(
    r => r.sync_status === 'local_new' || r.sync_status === 'local_edited'
  ).length

  const [y, m] = month.split('-').map(Number)
  const periodLabel = period === 'first' ? `${y}年${m}月1日〜15日` : `${y}年${m}月16日〜月末`

  return (
    <div className="flex flex-col h-full">
      {/* 印刷時のみ表示するヘッダ */}
      <div className="hidden print:block p-4 mb-2 border-b-2 border-gray-800">
        <h1 className="text-base font-bold text-center mb-2">石綿作業従事者作業記録</h1>
        <div className="grid grid-cols-2 gap-x-8 text-xs">
          <p>工事名称: {site?.name ?? ''}</p>
          <p>管轄工事会社: {site?.client_name ?? ''}</p>
          <p>工事期間: {site?.period_start ?? ''} 〜 {site?.period_end ?? ''}</p>
          <p>現場責任者: {site?.manager_name ?? ''}</p>
          <p>対象期間: {periodLabel}</p>
        </div>
        {/* 凡例 */}
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs font-medium mb-1">作業内容:</p>
          <div className="flex flex-wrap gap-x-4 text-xs">
            {WORK_LEGEND.map(w => (
              <span key={w.id}>{w.id} {w.label}</span>
            ))}
          </div>
          <p className="text-xs mt-1">健康状態: 〇良好 ／ △やや不調 ／ ✖不調(作業禁止)</p>
        </div>
      </div>

      {/* 通常ヘッダ（印刷時は非表示） */}
      <div className="px-5 py-3 bg-white border-b border-gray-200 print:hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-blue-600">現場一覧</Link>
              <span>/</span>
              <span>{site?.name ?? '...'}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">石綿作業従事者作業記録</h1>
            <div className="text-xs text-gray-500 mt-0.5 space-x-3">
              {site?.client_name && <span>管轄: {site.client_name}</span>}
              {site?.manager_name && <span>責任者: {site.manager_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
            >
              印刷
            </button>
            <Link
              href={`/sites/${siteId}/attendance`}
              className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
            >
              ← 出面表
            </Link>
          </div>
        </div>

        {/* Month + period switcher */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(m => addMonths(m, -1))}
              className="text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-100"
            >
              ◀
            </button>
            <span className="font-semibold text-gray-800 min-w-24 text-center">
              {formatMonth(month)}
            </span>
            <button
              onClick={() => setMonth(m => addMonths(m, 1))}
              className="text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-100"
            >
              ▶
            </button>
          </div>
          <div className="flex rounded overflow-hidden border border-gray-300">
            <button
              onClick={() => setPeriod('first')}
              className={`px-3 py-1 text-xs ${
                period === 'first' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              上期（1–15日）
            </button>
            <button
              onClick={() => setPeriod('second')}
              className={`px-3 py-1 text-xs border-l border-gray-300 ${
                period === 'second' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              下期（16日〜）
            </button>
          </div>
        </div>
      </div>

      {/* Sync bar（印刷時は非表示） */}
      <div className="print:hidden">
        <SyncBar
          siteId={siteId}
          month={month}
          unsyncedCount={unsyncedCount}
          reportsQueryKey={reportsKey}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm print:hidden">
          読み込み中...
        </div>
      ) : (
        <AsbestosGrid
          siteId={siteId}
          month={month}
          period={period}
          reports={reports}
          onRefresh={() => qc.invalidateQueries({ queryKey: reportsKey })}
        />
      )}
    </div>
  )
}
