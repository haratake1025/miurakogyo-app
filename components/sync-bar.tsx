'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type Props = {
  siteId: string
  month: string
  unsyncedCount: number
  reportsQueryKey: unknown[]
}

export function SyncBar({ siteId, month, unsyncedCount, reportsQueryKey }: Props) {
  const qc = useQueryClient()

  const from = `${month}-01`
  // last day of month
  const to = (() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m, 0).toISOString().slice(0, 10)
  })()

  const pull = useMutation({
    mutationFn: () =>
      fetch('/api/sync/pull/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, from, to }),
      }).then(r => r.json()),
    onSuccess: data => {
      toast.success(
        `取込完了: ${data.upserted}件${data.conflicts ? `（競合${data.conflicts}件）` : ''}`
      )
      qc.invalidateQueries({ queryKey: reportsQueryKey })
    },
    onError: () => toast.error('取込に失敗しました'),
  })

  const push = useMutation({
    mutationFn: () =>
      fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      }).then(r => r.json()),
    onSuccess: data => {
      if (data.errors > 0) {
        toast.warning(`反映完了: ${data.pushed}件（エラー${data.errors}件）`)
      } else {
        toast.success(`CBOへ反映完了: ${data.pushed}件`)
      }
      qc.invalidateQueries({ queryKey: reportsQueryKey })
    },
    onError: () => toast.error('CBOへの反映に失敗しました'),
  })

  const busy = pull.isPending || push.isPending

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => pull.mutate()}
        disabled={busy}
        className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {pull.isPending ? '取込中...' : 'CBOから取込'}
      </button>

      <button
        onClick={() => push.mutate()}
        disabled={busy || unsyncedCount === 0}
        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
      >
        {push.isPending ? '反映中...' : 'CBOへ反映'}
        {unsyncedCount > 0 && (
          <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
            {unsyncedCount}
          </span>
        )}
      </button>

      {busy && (
        <span className="text-xs text-gray-500 animate-pulse">処理中...</span>
      )}
    </div>
  )
}
