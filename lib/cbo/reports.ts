// CBO 書き込みアダプタ（サーバー専用）
// 参照: CBO_API連携仕様 §2〜6

import { cboFetch } from './client'

// ===== 型定義 =====

type WorkerInput =
  | { kind: 'employee'; companyUserId: number }
  | { kind: 'partner'; supplierId: number; supplierStaffId: number }

export type BuildPayloadInput = {
  reporterId: number      // company_user_id（報告者）
  date: string            // 'YYYY-MM-DD'
  orderId: number         // onsite
  worker: WorkerInput
  dayYakanId: number      // 105360=昼勤 / 105361=夜勤
  overHour: number
  workContentId: number   // 106548〜106555
  healthTypeId: number    // 106556〜106558
}

type CboReportPayload = {
  data: { root: [{ report_section: [Record<string, unknown[]>] }] }
  formatted: false
  personal_daily_report_format_id: 4879
  company_user_id: number
}

// ===== ペイロード組み立て =====

export function buildAttendancePayload(input: BuildPayloadInput): CboReportPayload {
  const root: Record<string, unknown[]> = {
    start_date: [input.date],
    onsite: [input.orderId],
    day_yakan: [input.dayYakanId],
    over_hour: [input.overHour],
    work_content: [input.workContentId],
    health_type: [input.healthTypeId],
  }

  if (input.worker.kind === 'employee') {
    root.work_user = [input.worker.companyUserId]
  } else {
    root.sup_name = [input.worker.supplierId]
    root.sup_staff = [input.worker.supplierStaffId]
  }

  return {
    data: { root: [{ report_section: [root] }] },
    formatted: false,
    personal_daily_report_format_id: 4879,
    company_user_id: input.reporterId,
  }
}

// ===== HTTP 操作 =====

// TODO(T2.0): レスポンスの report_id フィールド名を実APIで確認後に修正
type CreateResponse = Record<string, unknown>

export async function createAttendanceReport(
  payload: CboReportPayload
): Promise<{ cboReportId: string; rawResponse: Record<string, unknown> }> {
  const res = await cboFetch<CreateResponse>('/personal_daily_report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  // CBO returns { "data": { "id": 123, ... } }
  const inner = (res['data'] ?? res) as Record<string, unknown>
  const id = inner['id'] ?? inner['report_id'] ?? inner['personal_daily_report_id']
  if (!id) {
    throw new Error(`CBO create response に report_id が見つかりません: ${JSON.stringify(res)}`)
  }

  return { cboReportId: String(id), rawResponse: res }
}

export async function updateAttendanceReport(
  cboReportId: string,
  payload: CboReportPayload
): Promise<void> {
  await cboFetch<unknown>(`/personal_daily_reports/${cboReportId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteAttendanceReport(cboReportId: string): Promise<void> {
  await cboFetch<unknown>(`/personal_daily_reports/${cboReportId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}
