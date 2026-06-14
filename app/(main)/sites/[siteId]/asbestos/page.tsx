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

      {/* Grid（印刷時は非表示） */}
      <div className="flex-1 overflow-hidden print:hidden">
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
