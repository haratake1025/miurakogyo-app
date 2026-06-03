'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SyncLog, DailyReport, Worker, Site } from '@/types/db'

// ===== 型 =====

type ConflictRow = DailyReport & {
  worker: Pick<Worker, 'id' | 'company_name' | 'worker_name'>
  site: Pick<Site, 'id' | 'name'>
  day_yakan: { id: string; label: string } | null
  work_content: { id: string; label: string } | null
  health_type: { id: string; label: string } | null
}

// ===== 競合解決パネル =====

function ConflictPanel() {
  const qc = useQueryClient()

  const { data: conflicts = [], isLoading } = useQuery<ConflictRow[]>({
    queryKey: ['conflicts'],
    queryFn: () => fetch('/api/conflicts').then(r => r.json()),
  })

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept_cbo' | 'mark_local' }) =>
      fetch(`/api/conflicts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'エラー')
        return data
      }),
    onSuccess: (_, { action }) => {
      toast.success(
        action === 'accept_cbo'
          ? 'CBO版を採用しました'
          : '再push対象に設定しました。CBOへ反映ボタンで送信してください。'
      )
      qc.invalidateQueries({ queryKey: ['conflicts'] })
      qc.invalidateQueries({ queryKey: ['sync-logs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <p className="text-gray-400 text-sm py-4">読み込み中...</p>
  if (!conflicts.length) {
    return (
      <p className="text-gray-400 text-sm py-4">
        競合はありません
      </p>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-red-50 border-b border-red-200">
          <tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">現場</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">日付</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">作業者</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">昼/夜</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">作業内容</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-red-700">健康状態</th>
            <th className="px-4 py-2 text-xs font-medium text-red-700 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map(c => (
            <tr key={c.id} className="border-b border-gray-100 last:border-0 bg-red-50/30">
              <td className="px-4 py-2 text-xs text-gray-700">{c.site?.name ?? '—'}</td>
              <td className="px-4 py-2 text-xs whitespace-nowrap">
                {c.work_date}
              </td>
              <td className="px-4 py-2 text-xs">
                <div className="text-gray-400 text-xs">{c.worker?.company_name}</div>
                <div className="font-medium">{c.worker?.worker_name}</div>
              </td>
              <td className="px-4 py-2 text-xs">{c.day_yakan?.label ?? '—'}</td>
              <td className="px-4 py-2 text-xs text-gray-600">{c.work_content?.label ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{c.health_type?.label ?? '—'}</td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button
                  onClick={() => resolve.mutate({ id: c.id, action: 'accept_cbo' })}
                  disabled={resolve.isPending}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-1"
                  title="CBO版（上記の値）をそのまま使用する"
                >
                  CBO版を採用
                </button>
                <button
                  onClick={() => resolve.mutate({ id: c.id, action: 'mark_local' })}
                  disabled={resolve.isPending}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  title="この記録を再pushする（出面表で内容を確認後にCBOへ反映）"
                >
                  再push
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== 同期ログ =====

function SyncLogTable() {
  const { data: logs = [], isLoading } = useQuery<SyncLog[]>({
    queryKey: ['sync-logs'],
    queryFn: () => fetch('/api/sync/logs').then(r => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">日時</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">方向</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">対象</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">状態</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">メッセージ</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-sm">読み込み中...</td>
            </tr>
          )}
          {logs.map(log => (
            <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.performed_at).toLocaleString('ja-JP', {
                  month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  log.direction === 'pull'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {log.direction === 'pull' ? '↓ 取込' : '↑ 反映'}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-600">{log.target}</td>
              <td className="px-4 py-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  log.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {log.status === 'success' ? '成功' : 'エラー'}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">{log.message}</td>
            </tr>
          ))}
          {!isLoading && !logs.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">ログがありません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ===== ページ =====

export default function SyncPage() {
  const { data: conflicts = [] } = useQuery<ConflictRow[]>({
    queryKey: ['conflicts'],
    queryFn: () => fetch('/api/conflicts').then(r => r.json()),
  })

  return (
    <div className="p-6 space-y-8">
      {/* 競合解決 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-gray-900">競合レコード</h2>
          {conflicts.length > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
              {conflicts.length}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          取込時に CBO 側とアプリ側の両方で変更があったレコードです。
          「CBO版を採用」で取込済みの値を確定、「再push」でアプリ版として CBOへ反映します。
        </p>
        <ConflictPanel />
      </section>

      {/* 同期ログ */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">同期ログ</h2>
        <SyncLogTable />
      </section>
    </div>
  )
}
