'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SiteCard } from '@/components/site-card'
import type { Site } from '@/types/db'

export default function SiteListPage() {
  const qc = useQueryClient()
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then(r => r.json()),
  })

  const pullMasters = useMutation({
    mutationFn: () =>
      fetch('/api/sync/pull/masters', { method: 'POST' }).then(r => r.json()),
    onSuccess: (data) => {
      const s = data.sites
      const sitePart = s
        ? `現場 新規${s.inserted}件・更新${s.updated}件`
        : '現場取込完了'
      toast.success(`マスタ取込完了: ${sitePart}`)
      qc.invalidateQueries({ queryKey: ['sites'] })
    },
    onError: () => toast.error('マスタ取込に失敗しました'),
  })

  // 選択肢（取込済みデータから動的生成）
  const nameOptions = useMemo(() => {
    return Array.from(new Set(sites.map(s => s.name))).sort()
  }, [sites])

  const statusOptions = useMemo(() => {
    const set = new Set(sites.map(s => s.cbo_status).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [sites])

  // フィルタ適用
  const filtered = useMemo(() => {
    return sites.filter(site => {
      if (nameFilter && site.name !== nameFilter) return false
      if (statusFilter && site.cbo_status !== statusFilter) return false
      return true
    })
  }, [sites, nameFilter, statusFilter])

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダ */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">現場一覧</h1>
          <button
            onClick={() => pullMasters.mutate()}
            disabled={pullMasters.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {pullMasters.isPending ? '取込中...' : 'CBOから取込（マスタ）'}
          </button>
        </div>

        {/* 検索・フィルタ */}
        <div className="flex items-center gap-3">
          <select
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          >
            <option value="">全現場</option>
            {nameOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white min-w-28"
          >
            <option value="">全ステータス</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(nameFilter || statusFilter) && (
            <button
              onClick={() => { setNameFilter(''); setStatusFilter('') }}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 whitespace-nowrap"
            >
              クリア
            </button>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length}件</span>
        </div>
      </div>

      {/* 一覧 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && <p className="text-gray-400 text-sm">読み込み中...</p>}

        {!isLoading && sites.length === 0 && (
          <p className="text-gray-400 text-sm">
            現場データがありません。「CBOから取込（マスタ）」を実行してください。
          </p>
        )}

        {!isLoading && sites.length > 0 && filtered.length === 0 && (
          <p className="text-gray-400 text-sm">条件に一致する現場がありません。</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(site => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      </div>
    </div>
  )
}
