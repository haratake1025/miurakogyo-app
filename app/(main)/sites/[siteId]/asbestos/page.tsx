'use client'

import { useState, use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { AsbestosGrid } from '@/components/asbestos-grid'
import { AsbestosPrint } from '@/components/asbestos-print'
import { SyncBar } from '@/components/sync-bar'
import { formatMonth, addMonths, todayYearMonth } from '@/lib/utils/date'
import type { Site } from '@/types/db'
import type { ReportRow } from '@/types/frontend'


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

  return (
    <div className="flex flex-col h-full">
      {/* 印刷時のみ表示するフォーム */}
      {site && (
        <AsbestosPrint
          site={site}
          reports={reports}
          month={month}
          period={period}
        />
      )}

      {/* Header — 1行（印刷時は非表示） */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 print:hidden flex-wrap">
        {/* パンくず + 現場名 */}
        <div className="flex items-center gap-1 text-sm min-w-0 shrink">
          <Link href="/" className="text-gray-400 hover:text-blue-600 text-xs shrink-0">現場一覧</Link>
          <span className="text-gray-300 text-xs">/</span>
          <span className="font-semibold text-gray-900 text-sm truncate max-w-48">{site?.name ?? '...'}</span>
          {site?.manager_name && (
            <span className="text-xs text-gray-400 shrink-0">・{site.manager_name}</span>
          )}
        </div>

        <div className="flex-1" />

        {/* 月ナビ */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMonth(m => addMonths(m, -1))}
            className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 text-sm"
          >
            ◀
          </button>
          <span className="font-semibold text-gray-800 min-w-24 text-center text-sm">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 text-sm"
          >
            ▶
          </button>
        </div>

        {/* 上旬 / 下旬 */}
        <div className="flex rounded overflow-hidden border border-gray-300 shrink-0">
          <button
            onClick={() => setPeriod('first')}
            className={`px-3 py-1.5 text-xs ${
              period === 'first' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            上旬（1–15日）
          </button>
          <button
            onClick={() => setPeriod('second')}
            className={`px-3 py-1.5 text-xs border-l border-gray-300 ${
              period === 'second' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            下旬（16日〜）
          </button>
        </div>

        {/* CBO ボタン */}
        <SyncBar
          siteId={siteId}
          month={month}
          unsyncedCount={unsyncedCount}
          reportsQueryKey={reportsKey}
          inline
        />

        {/* 印刷 / 出面表に戻る */}
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 shrink-0"
        >
          印刷
        </button>
        <Link
          href={`/sites/${siteId}/attendance`}
          className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 shrink-0"
        >
          ← 出面表
        </Link>
      </div>

      {/* Grid（印刷時は非表示） */}
      <div className="flex flex-col flex-1 overflow-hidden print:hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
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
    </div>
  )
}
