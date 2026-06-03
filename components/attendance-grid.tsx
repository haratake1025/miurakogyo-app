'use client'

import { useState } from 'react'
import type { ReportRow, WorkerSummary } from '@/types/frontend'
import type { Worker } from '@/types/db'
import { getDaysInMonth, getDayLabel, dayHeaderClass } from '@/lib/utils/date'
import { CellEditor } from './cell-editor'
import { AddWorkerModal } from './add-worker-modal'

type Props = {
  siteId: string
  month: string
  reports: ReportRow[]
  isAsbestos: boolean
  onRefresh: () => void
}

type EditTarget = { workerId: string; date: string; report: ReportRow | null }

function buildWorkerList(reports: ReportRow[]): WorkerSummary[] {
  const map = new Map<string, WorkerSummary>()
  for (const r of reports) {
    if (!map.has(r.worker_id)) map.set(r.worker_id, r.worker)
  }
  return Array.from(map.values()).sort((a, b) => {
    const c = a.company_name.localeCompare(b.company_name, 'ja')
    return c !== 0 ? c : a.worker_name.localeCompare(b.worker_name, 'ja')
  })
}

const STATUS_BORDER: Record<string, string> = {
  local_new: 'border-dashed border-blue-400 bg-blue-50',
  local_edited: 'border-orange-400 bg-orange-50',
  conflict: 'border-red-500 bg-red-50',
  synced: 'border-gray-200',
}

const STATUS_BADGE: Record<string, string> = {
  local_new: '!',
  local_edited: '▲',
  conflict: '✕',
  synced: '',
}

const STATUS_BADGE_COLOR: Record<string, string> = {
  local_new: 'text-blue-500',
  local_edited: 'text-orange-500',
  conflict: 'text-red-500',
  synced: '',
}

export function AttendanceGrid({ siteId, month, reports, isAsbestos, onRefresh }: Props) {
  const days = getDaysInMonth(month)
  const workersFromReports = buildWorkerList(reports)
  const [extraWorkers, setExtraWorkers] = useState<Worker[]>([])
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const reportMap = new Map(reports.map(r => [`${r.worker_id}_${r.work_date}`, r]))

  const allWorkers: WorkerSummary[] = [
    ...workersFromReports,
    ...extraWorkers.filter(w => !workersFromReports.find(ew => ew.id === w.id)),
  ]

  const excludeIds = allWorkers.map(w => w.id)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200">
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
        >
          ＋ 作業者を追加
        </button>
        <div className="flex gap-3 text-xs text-gray-400 ml-2">
          <span><span className="text-blue-500 font-bold">!</span> 新規</span>
          <span><span className="text-orange-500">▲</span> 編集済</span>
          <span><span className="text-red-500">✕</span> 競合</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 bg-gray-100 border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                style={{ minWidth: 160 }}
              >
                所属 / 作業者
              </th>
              {days.map(day => {
                const { label } = getDayLabel(day)
                const dayNum = new Date(day + 'T00:00:00').getDate()
                return (
                  <th
                    key={day}
                    className={`sticky top-0 z-20 border border-gray-200 py-1 font-medium text-center ${dayHeaderClass(day)}`}
                    style={{ minWidth: 40 }}
                  >
                    <div>{dayNum}</div>
                    <div className="text-gray-400">{label}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {allWorkers.map(worker => (
              <tr key={worker.id} className="hover:bg-gray-50/50">
                <td
                  className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1.5 whitespace-nowrap"
                >
                  <div className="text-gray-400 text-xs leading-tight">{worker.company_name}</div>
                  <div className="font-medium text-gray-900">{worker.worker_name}</div>
                </td>
                {days.map(day => {
                  const report = reportMap.get(`${worker.id}_${day}`)
                  const status = report?.sync_status
                  const isNight = report?.day_yakan_id === '105361'
                  const oh = report?.over_hour ?? 0

                  return (
                    <td
                      key={day}
                      onClick={() => setEditing({ workerId: worker.id, date: day, report: report ?? null })}
                      className={`border border-gray-200 cursor-pointer hover:bg-blue-50 text-center p-0.5 h-9 ${dayHeaderClass(day)}`}
                    >
                      {report && (
                        <div
                          className={`flex items-center justify-center gap-0.5 border rounded px-0.5 h-full mx-0.5 ${STATUS_BORDER[status!] ?? 'border-gray-200'}`}
                        >
                          <span className={status === 'conflict' ? 'text-red-600' : 'text-gray-700'}>
                            {isNight ? '●夜' : '●'}
                            {oh > 0 && <span className="text-gray-500">+{oh}</span>}
                          </span>
                          {STATUS_BADGE[status!] && (
                            <span className={`font-bold ${STATUS_BADGE_COLOR[status!]}`}>
                              {STATUS_BADGE[status!]}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {allWorkers.length === 0 && (
              <tr>
                <td
                  colSpan={days.length + 1}
                  className="text-center py-10 text-gray-400"
                >
                  作業者がいません。「＋作業者を追加」か「CBOから取込」を実行してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CellEditor
          siteId={siteId}
          workerId={editing.workerId}
          date={editing.date}
          report={editing.report}
          isAsbestos={isAsbestos}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); onRefresh() }}
        />
      )}

      {showAddModal && (
        <AddWorkerModal
          excludeWorkerIds={excludeIds}
          onAdd={workers => {
            setExtraWorkers(prev => [...prev, ...workers])
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
