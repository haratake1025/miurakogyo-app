'use client'

import { useState, use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { AttendanceGrid } from '@/components/attendance-grid'
import { SyncBar } from '@/components/sync-bar'
import { formatMonth, addMonths, todayYearMonth } from '@/lib/utils/date'
import type { Site } from '@/types/db'
import type { ReportRow } from '@/types/frontend'

export default function AttendancePage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = use(params)
  const [month, setMonth] = useState(todayYearMonth)
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
      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-blue-600">現場一覧</Link>
              <span>/</span>
              <span>{site?.name ?? '...'}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">出面表</h1>
            {site?.manager_name && (
              <p className="text-xs text-gray-500">現場責任者: {site.manager_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/sites/${siteId}/export?month=${month}`}
              download
              className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded hover:bg-green-50"
            >
              Excel出力
            </a>
            <Link
              href={`/sites/${siteId}/asbestos`}
              className="text-xs px-3 py-1.5 border border-orange-300 text-orange-600 rounded hover:bg-orange-50"
            >
              石綿記録へ →
            </Link>
          </div>
        </div>

        {/* Month switcher */}
        <div className="flex items-center gap-3 mt-3">
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
      </div>

      {/* Sync bar */}
      <SyncBar
        siteId={siteId}
        month={month}
        unsyncedCount={unsyncedCount}
        reportsQueryKey={reportsKey}
      />

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : (
        <AttendanceGrid
          siteId={siteId}
          month={month}
          reports={reports}
          isAsbestos={site?.is_asbestos ?? false}
          onRefresh={() => qc.invalidateQueries({ queryKey: reportsKey })}
        />
      )}
    </div>
  )
}
