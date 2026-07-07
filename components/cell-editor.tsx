'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ReportRow } from '@/types/frontend'

const DAY_YAKAN = [
  { id: '105360', label: '昼勤' },
  { id: '105361', label: '夜勤' },
]

const WORK_CONTENT = [
  { id: '106548', label: '① 準備工事（足場・区画養生他）' },
  { id: '106549', label: '② 石綿除去作業（外装材・保温材）' },
  { id: '106550', label: '③ 作業中環境測定' },
  { id: '106551', label: '④ 石綿廃材処理' },
  { id: '106552', label: '⑤ 養生撤去（区画養生・足場撤去含）' },
  { id: '106553', label: '⑥ 管理（監督・安全・品証他）' },
  { id: '106554', label: '⑦ 抜き取り' },
  { id: '106555', label: '⑧ 分析' },
]

const HEALTH_TYPE = [
  { id: '106556', label: '〇良好' },
  { id: '106557', label: '△やや不調' },
  { id: '106558', label: '✖不調(作業禁止)' },
]

type Props = {
  siteId: string
  workerId: string
  date: string
  report: ReportRow | null
  isAsbestos: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CellEditor({ siteId, workerId, date, report, isAsbestos, onClose, onSuccess }: Props) {
  const [dayYakanId, setDayYakanId] = useState(report?.day_yakan_id ?? '105360')
  const [overHour, setOverHour] = useState(report?.over_hour ?? 0)
  const [workContentId, setWorkContentId] = useState(report?.work_content_id ?? '')
  const [healthTypeId, setHealthTypeId] = useState(report?.health_type_id ?? '106556')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [y, m, d] = date.split('-').map(Number)
  const dateLabel = `${y}年${m}月${d}日`

  const create = useMutation({
    mutationFn: () =>
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          worker_id: workerId,
          work_date: date,
          day_yakan_id: dayYakanId || null,
          over_hour: overHour,
          work_content_id: workContentId || null,
          health_type_id: healthTypeId || null,
        }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'エラー')
        return data
      }),
    onSuccess: () => { toast.success('記録を作成しました'); onSuccess() },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = useMutation({
    mutationFn: () =>
      fetch(`/api/reports/${report!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_yakan_id: dayYakanId || null,
          over_hour: overHour,
          work_content_id: workContentId || null,
          health_type_id: healthTypeId || null,
        }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'エラー')
        return data
      }),
    onSuccess: () => { toast.success('記録を更新しました'); onSuccess() },
    onError: (e: Error) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: () =>
      fetch(`/api/reports/${report!.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'エラー')
        return data
      }),
    onSuccess: () => { toast.success('記録を削除しました'); onSuccess() },
    onError: (e: Error) => toast.error(e.message),
  })

  const busy = create.isPending || update.isPending || del.isPending

  function handleSave() {
    if (report) update.mutate()
    else create.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-80 mx-4 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-gray-900">{dateLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          {/* 昼勤/夜勤 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">勤務区分</label>
            <div className="flex gap-2">
              {DAY_YAKAN.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDayYakanId(opt.id)}
                  className={`flex-1 py-1.5 text-sm rounded border transition-colors ${
                    dayYakanId === opt.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 残業時間 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">残業時間</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={overHour}
                onChange={e => setOverHour(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">時間</span>
            </div>
          </div>

          {/* 作業内容（石綿現場のみ） */}
          {isAsbestos && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">作業内容</label>
              <select
                value={workContentId}
                onChange={e => setWorkContentId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {WORK_CONTENT.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 健康状態（石綿現場のみ） */}
          {isAsbestos && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">健康状態</label>
              <select
                value={healthTypeId}
                onChange={e => setHealthTypeId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HEALTH_TYPE.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-5">
          {report && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              削除
            </button>
          )}
          {report && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">本当に削除しますか？</span>
              <button
                onClick={() => del.mutate()}
                disabled={busy}
                className="text-xs text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
              >
                削除する
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500"
              >
                キャンセル
              </button>
            </div>
          )}
          {!confirmDelete && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50"
              >
                閉じる
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? '保存中...' : report ? '更新' : '登録'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
