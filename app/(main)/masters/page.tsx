'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Worker } from '@/types/db'

function WorkerTable({ workers }: { workers: Worker[] }) {
  if (!workers.length) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm border border-gray-200 rounded-lg">
        データなし
      </div>
    )
  }
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">会社名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">氏名</th>
          </tr>
        </thead>
        <tbody>
          {workers.map(w => (
            <tr key={w.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="px-3 py-2 text-xs text-gray-500">{w.company_name}</td>
              <td className="px-3 py-2 text-xs">{w.worker_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MastersPage() {
  const qc = useQueryClient()

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => fetch('/api/workers').then(r => r.json()),
  })

  const pullMasters = useMutation({
    mutationFn: () =>
      fetch('/api/sync/pull/masters', { method: 'POST' }).then(r => r.json()),
    onSuccess: data => {
      toast.success(
        `取込完了: 現場 ${data.sites?.upserted ?? 0}件、作業者 ${data.workers?.upserted ?? 0}件`
      )
      qc.invalidateQueries({ queryKey: ['workers'] })
      qc.invalidateQueries({ queryKey: ['sites'] })
    },
    onError: () => toast.error('取込に失敗しました'),
  })

  const employees = workers.filter(w => w.source_kind === 'employee')
  const partners = workers.filter(w => w.source_kind === 'partner')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">マスタ管理</h1>
        <button
          onClick={() => pullMasters.mutate()}
          disabled={pullMasters.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {pullMasters.isPending ? '取込中...' : 'CBOから取込'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-6">
        マスタの新規登録・編集は CBO 側で行ってください。このページは参照専用です。
      </p>

      {isLoading && <p className="text-gray-400 text-sm">読み込み中...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            社員（{employees.length}名）
          </h2>
          <WorkerTable workers={employees} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            協力会社スタッフ（{partners.length}名）
          </h2>
          <WorkerTable workers={partners} />
        </section>
      </div>
    </div>
  )
}
