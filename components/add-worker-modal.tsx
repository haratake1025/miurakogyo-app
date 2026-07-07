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
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [companyQuery, setCompanyQuery] = useState('')

  const { data: workers, isLoading } = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => fetch('/api/workers').then(r => r.json()),
  })

  // 追加可能な作業者（すでにグリッドにいる人を除外）
  const available = useMemo(
    () => (workers ?? []).filter(w => !excludeWorkerIds.includes(w.id)),
    [workers, excludeWorkerIds]
  )

  // 会社名リスト（50音順）
  const companies = useMemo(
    () =>
      Array.from(new Set(available.map(w => w.company_name))).sort((a, b) =>
        a.localeCompare(b, 'ja')
      ),
    [available]
  )

  const filteredCompanies = useMemo(() => {
    const q = companyQuery.trim()
    return q ? companies.filter(c => c.includes(q)) : companies
  }, [companies, companyQuery])

  // 選択中の会社の作業者
  const workersInCompany = useMemo(
    () =>
      selectedCompany
        ? available
            .filter(w => w.company_name === selectedCompany)
            .sort((a, b) => a.worker_name.localeCompare(b.worker_name, 'ja'))
        : [],
    [available, selectedCompany]
  )

  function toggleWorker(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const inCompany = new Set(workersInCompany.map(w => w.id))
    const allSelected = workersInCompany.every(w => selectedIds.has(w.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        inCompany.forEach(id => next.delete(id))
      } else {
        inCompany.forEach(id => next.add(id))
      }
      return next
    })
  }

  function handleAdd() {
    const selected = (workers ?? []).filter(w => selectedIds.has(w.id))
    onAdd(selected)
  }

  function handleBack() {
    setSelectedCompany(null)
    setCompanyQuery('')
  }

  const allInCompanySelected =
    workersInCompany.length > 0 && workersInCompany.every(w => selectedIds.has(w.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {selectedCompany && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ←
              </button>
            )}
            <h2 className="font-semibold text-gray-900">
              {selectedCompany ?? '会社を選択'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {isLoading && (
          <p className="py-8 text-center text-gray-400 text-sm">読み込み中...</p>
        )}

        {!isLoading && !selectedCompany && (
          <>
            {companies.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">
                {(workers?.length ?? 0) === 0 ? 'マスタ取込が必要です' : '追加できる作業者がいません'}
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={companyQuery}
                  onChange={e => setCompanyQuery(e.target.value)}
                  placeholder="会社名で検索..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
                <div className="overflow-y-auto max-h-64 border border-gray-200 rounded">
                  {filteredCompanies.length === 0 ? (
                    <p className="py-6 text-center text-gray-400 text-sm">該当する会社がありません</p>
                  ) : (
                    filteredCompanies.map(company => {
                      const count = available.filter(w => w.company_name === company).length
                      return (
                        <button
                          key={company}
                          onClick={() => setSelectedCompany(company)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
                        >
                          <span className="text-sm text-gray-900">{company}</span>
                          <span className="text-xs text-gray-400">{count}名 ›</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </>
        )}

        {!isLoading && selectedCompany && (
          <>
            <div className="overflow-y-auto max-h-72 border border-gray-200 rounded">
              {workersInCompany.length === 0 ? (
                <p className="p-4 text-center text-gray-400 text-sm">追加できる作業者がいません</p>
              ) : (
                <>
                  {/* 全選択行 */}
                  <label className="flex items-center gap-3 px-3 py-2 bg-gray-50 cursor-pointer border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={allInCompanySelected}
                      onChange={toggleAll}
                      className="rounded"
                    />
                    <span className="text-xs font-medium text-gray-600">全員選択</span>
                  </label>
                  {workersInCompany.map(w => (
                    <label
                      key={w.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(w.id)}
                        onChange={() => toggleWorker(w.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-900">{w.worker_name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </>
        )}

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
