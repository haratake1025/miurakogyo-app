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

export type BulkCell = {
  workerId: string
  workerName: string
  date: string
  report: ReportRow | null
}

type Props = {
  siteId: string
  cells: BulkCell[]
  isAsbestos: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BulkEditModal({ siteId, cells, isAsbestos, onClose, onSuccess }: Props) {
  const firstExisting = cells.find(c => c.report)?.report

  const [dayYakanId, setDayYakanId] = useState(firstExisting?.day_yakan_id ?? '105360')
  const [overHour, setOverHour] = useState(firstExisting?.over_hour ?? 0)
  const [workContentId, setWorkContentId] = useState(firstExisting?.work_content_id ?? '')
  const [healthTypeId, setHealthTypeId] = useState(firstExisting?.health_type_id ?? '106556')

  const [keepDayYakan, setKeepDayYakan] = useState(false)
  const [keepOverHour, setKeepOverHour] = useState(false)
  const [keepWorkContent, setKeepWorkContent] = useState(false)
  const [keepHealthType, setKeepHealthType] = useState(false)

  const save = useMutation({
    mutationFn: async () => {
      const payload = cells.map(cell => ({
        worker_id: cell.workerId,
        work_date: cell.date,
        day_yakan_id: keepDayYakan ? (cell.report?.day_yakan_id ?? '105360') : dayYakanId,
        over_hour: keepOverHour ? (cell.report?.over_hour ?? 0) : overHour,
        work_content_id: keepWorkContent
          ? (cell.report?.work_content_id ?? null)
          : (workContentId || null),
        health_type_id: keepHealthType
          ? (cell.report?.health_type_id ?? '106556')
          : (healthTypeId || null),
        existing_id: cell.report?.id,
      }))

      const res = await fetch('/api/reports/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, cells: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラー')
      return data as { created: number; updated: number; errors: { index: number; message: string }[] }
    },
    onSuccess: (data) => {
      const parts = [
        data.created > 0 && `${data.created}件作成`,
        data.updated > 0 && `${data.updated}件更新`,
      ].filter(Boolean).join('・')
      if (data.errors.length > 0) {
        toast.warning(`${parts || '完了'}（${data.errors.length}件エラー）`)
      } else {
        toast.success(`${parts}しました`)
      }
      onSuccess()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const newCount = cells.filter(c => !c.report).length
  const existingCount = cells.length - newCount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-96 mx-4 p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-gray-900">一括入力</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {cells.length}セル選択中
          {existingCount > 0 && `（既存 ${existingCount}件・新規 ${newCount}件）`}
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">勤務区分</label>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepDayYakan}
                  onChange={e => setKeepDayYakan(e.target.checked)}
                  className="w-3 h-3"
                />
                変更しない
              </label>
            </div>
            <div className="flex gap-2">
              {DAY_YAKAN.map(opt => (
                <button
                  key={opt.id}
                  disabled={keepDayYakan}
                  onClick={() => setDayYakanId(opt.id)}
                  className={`flex-1 py-1.5 text-sm rounded border transition-colors disabled:opacity-40 ${
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">残業時間</label>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepOverHour}
                  onChange={e => setKeepOverHour(e.target.checked)}
                  className="w-3 h-3"
                />
                変更しない
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={overHour}
                disabled={keepOverHour}
                onChange={e => setOverHour(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
              <span className="text-sm text-gray-500">時間</span>
            </div>
          </div>

          {isAsbestos && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">作業内容</label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepWorkContent}
                    onChange={e => setKeepWorkContent(e.target.checked)}
                    className="w-3 h-3"
                  />
                  変更しない
                </label>
              </div>
              <select
                value={workContentId}
                disabled={keepWorkContent}
                onChange={e => setWorkContentId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                <option value="">—</option>
                {WORK_CONTENT.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {isAsbestos && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">健康状態</label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepHealthType}
                    onChange={e => setKeepHealthType(e.target.checked)}
                    className="w-3 h-3"
                  />
                  変更しない
                </label>
              </div>
              <select
                value={healthTypeId}
                disabled={keepHealthType}
                onChange={e => setHealthTypeId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                {HEALTH_TYPE.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50"
          >
            閉じる
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? '保存中...' : '一括保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
