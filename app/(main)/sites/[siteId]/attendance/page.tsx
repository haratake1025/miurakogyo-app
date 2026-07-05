'use client'

import { useState, use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { AttendanceGrid } from '@/components/attendance-grid'
import { AsbestosGrid } from '@/components/asbestos-grid'
import { SyncBar } from '@/components/sync-bar'
import { formatMonth, addMonths, todayYearMonth } from '@/lib/utils/date'
import type { Site } from '@/types/db'
import type { ReportRow } from '@/types/frontend'

type View = 'attendance' | 'asbestos'

export default function AttendancePage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = use(params)
  const [month, setMonth] = useState(todayYearMonth)
  const [view, setView] = useState<View>('attendance')
  const [period, setPeriod] = useState<'first' | 'second'>('first')
  const qc = useQueryClient()

  const { data: site } = useQuery<Site>({
    queryKey: ['site', siteId],
    queryFn: () => fetch(`/api/sites/${siteId}`).then(r => r.json()),
  })

  const reportsKey = ['site', siteId, 'reports', month]
  const { data: reports = [], isLoading, isError } = useQuery<ReportRow[]>({
    queryKey: reportsKey,
    queryFn: async () => {
      const r = await fetch(`/api/sites/${siteId}/reports?month=${month}`)
      if (!r.ok) throw new Error(await r.text())
      return r.json()
    },
  })

  const unsyncedCount = reports.filter(
    r => r.sync_status === 'local_new' || r.sync_status === 'local_edited'
  ).length

  const isAsbestos = view === 'asbestos'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-gray-200 print:hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-blue-600">現場一覧</Link>
              <span>/</span>
              <span>{site?.name ?? '...'}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {isAsbestos ? '石綿作業従事者作業記録' : '出面表'}
            </h1>
            {site?.manager_name && (
              <p className="text-xs text-gray-500">現場責任者: {site.manager_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isAsbestos && (
              <a
                href={`/api/sites/${siteId}/export?month=${month}`}
                download
                className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded hover:bg-green-50"
              >
                Excel出力
              </a>
            )}
            {isAsbestos && (
              <a
                href={`/api/sites/${siteId}/asbestos-export?month=${month}`}
                download
                className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded hover:bg-green-50"
              >
                Excel出力
              </a>
            )}
            {/* 出面 / 石綿 切替タブ */}
            <div className="flex rounded overflow-hidden border border-gray-300">
              <button
                onClick={() => setView('attendance')}
                className={`px-3 py-1.5 text-xs ${
                  !isAsbestos ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                出面表
              </button>
              <button
                onClick={() => setView('asbestos')}
                className={`px-3 py-1.5 text-xs border-l border-gray-300 ${
                  isAsbestos ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                石綿記録
              </button>
            </div>
          </div>
        </div>

        {/* 月 + 期間コントロール */}
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

          {/* 上旬 / 下旬（石綿ビューのみ） */}
          {isAsbestos && (
            <div className="flex rounded overflow-hidden border border-gray-300">
              <button
                onClick={() => setPeriod('first')}
                className={`px-3 py-1 text-xs ${
                  period === 'first' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                上旬（1–15日）
              </button>
              <button
                onClick={() => setPeriod('second')}
                className={`px-3 py-1 text-xs border-l border-gray-300 ${
                  period === 'second' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                下旬（16日〜）
              </button>
            </div>
          )}

          <div className="flex-1" />

          <SyncBar
            siteId={siteId}
            month={month}
            unsyncedCount={unsyncedCount}
            reportsQueryKey={reportsKey}
            inline
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm print:hidden">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm print:hidden">
          データの取得に失敗しました
        </div>
      ) : isAsbestos ? (
        <div className="flex flex-col flex-1 overflow-hidden print:hidden">
          <AsbestosGrid
            siteId={siteId}
            month={month}
            period={period}
            reports={reports}
            onRefresh={() => qc.invalidateQueries({ queryKey: reportsKey })}
          />
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
