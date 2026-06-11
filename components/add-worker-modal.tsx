'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Worker } from '@/types/db'

type Props = {
  excludeWorkerIds: string[]
  onAdd: (workers: Worker[]) => void
  onClose: () => void
}

export function AddWorkerModal({ excludeWorkerIds, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: workers, isLoading } = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => fetch('/api/workers').then(r => r.json()),
  })

  const filtered = useMemo(() => {
    if (!workers) return []
    return workers
      .filter(w => !excludeWorkerIds.includes(w.id))
      .filter(w => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          w.worker_name.toLowerCase().includes(q) ||
          w.company_name.toLowerCase().includes(q)
        )
      })
  }, [workers, excludeWorkerIds, search])

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    const selected = (workers ?? []).filter(w => selectedIds.has(w.id))
    onAdd(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">作業者を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <input
          type="text"
          placeholder="氏名・会社名で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="overflow-y-auto max-h-72 border border-gray-200 rounded">
          {isLoading && (
            <p className="p-4 text-center text-gray-400 text-sm">読み込み中...</p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="p-4 text-center text-gray-400 text-sm">
              {workers?.length === 0
                ? 'マスタ取込が必要です'
                : '該当する作業者がいません'}
            </p>
          )}
          {filtered.map(w => (
            <label
              key={w.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(w.id)}
                onChange={() => toggle(w.id)}
                className="rounded"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{w.worker_name}</div>
                <div className="text-xs text-gray-400">{w.company_name}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">{selectedIds.size}名選択中</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              追加 ({selectedIds.size}名)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
