'use client'

import { useQuery } from '@tanstack/react-query'
import type { SyncLog } from '@/types/db'

function DirectionBadge({ direction }: { direction: SyncLog['direction'] }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${
        direction === 'pull' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
      }`}
    >
      {direction === 'pull' ? '↓ 取込' : '↑ 反映'}
    </span>
  )
}

function StatusBadge({ status }: { status: SyncLog['status'] }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${
        status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {status === 'success' ? '成功' : 'エラー'}
    </span>
  )
}

export default function SyncPage() {
  const { data: logs = [], isLoading } = useQuery<SyncLog[]>({
    queryKey: ['sync-logs'],
    queryFn: () => fetch('/api/sync/logs').then(r => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">同期・ログ</h1>

      {isLoading && <p className="text-gray-400 text-sm">読み込み中...</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                日時
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">方向</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">対象</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">状態</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">メッセージ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.performed_at).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-2">
                  <DirectionBadge direction={log.direction} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">{log.target}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={log.status} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">
                  {log.message}
                </td>
              </tr>
            ))}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                  ログがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
