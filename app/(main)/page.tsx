'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SiteCard } from '@/components/site-card'
import type { Site } from '@/types/db'

export default function SiteListPage() {
  const qc = useQueryClient()

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then(r => r.json()),
  })

  const pullMasters = useMutation({
    mutationFn: () =>
      fetch('/api/sync/pull/masters', { method: 'POST' }).then(r => r.json()),
    onSuccess: data => {
      toast.success(
        `マスタ取込完了: 現場 ${data.sites?.upserted ?? 0}件、作業者 ${data.workers?.upserted ?? 0}件`
      )
      qc.invalidateQueries({ queryKey: ['sites'] })
    },
    onError: () => toast.error('マスタ取込に失敗しました'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">現場一覧</h1>
        <button
          onClick={() => pullMasters.mutate()}
          disabled={pullMasters.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {pullMasters.isPending ? '取込中...' : 'CBOから取込（マスタ）'}
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">読み込み中...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sites?.map(site => (
          <SiteCard key={site.id} site={site} />
        ))}
      </div>

      {!isLoading && !sites?.length && (
        <p className="text-gray-400 text-sm mt-4">
          現場データがありません。「CBOから取込（マスタ）」を実行してください。
        </p>
      )}
    </div>
  )
}
