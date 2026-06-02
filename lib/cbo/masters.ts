// CBO 読み取りアダプタ（サーバー専用）
// 参照: CBO_API連携仕様 §8
// T2.0疎通確認で判明した実際のレスポンス構造に基づく実装

import { cboFetch } from './client'

// ===== 正規化後の型 =====

export type CboSite = {
  cboOrderId: string
  name: string
  clientName: string | null
  managerName: string | null
  periodStart: string | null
  periodEnd: string | null
}

export type CboEmployee = {
  cboCompanyUserId: string
  workerName: string
  nameKana: string | null
  tel: string | null
}

export type CboPartnerWorker = {
  cboSupplierId: string
  cboSupplierStaffId: string
  companyName: string
  workerName: string
}

export type CboReport = {
  cboReportId: string
  cboOrderId: string
  date: string
  dayYakanId: string | null
  overHour: number
  workContentId: string | null
  healthTypeId: string | null
  companyUserId: string | null    // 自社員ワーカーID（top-level company_user_id）
  supplierId: string | null       // 外注: sup_name (supplier id)
  supplierStaffId: string | null  // 外注: sup_staff (staff id)
}

// ===== 内部ユーティリティ =====

type CboValue = { key: string; value: unknown; label: string }

function extractVal(values: CboValue[], key: string): unknown {
  return values.find((v) => v.key === key)?.value ?? null
}

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0
}

// ===== 現場一覧 =====
// 実レスポンス: { data: [{ id, order_format_id, values: [{key, value, label}] }] }
// asbests は values 内の key。null = 石綿でない → アプリ側でフィルタ

export async function listSites(): Promise<CboSite[]> {
  // TODO(T2.0): order_format_id クエリが効くか要確認。カスタムビュー経由が必要な場合は別途対応
  const res = await cboFetch<{ data: Array<{ id: number; values: CboValue[] }> }>(
    '/orders?order_format_id=2556'
  )

  return res.data
    .filter((o) => {
      const asbests = extractVal(o.values, 'asbests')
      return asbests !== null && asbests !== undefined && asbests !== ''
    })
    .map((o) => ({
      cboOrderId: String(o.id),
      name: String(extractVal(o.values, 'contract_name') ?? ''),
      clientName: str(extractVal(o.values, 'suppliers_name')),
      managerName: str(extractVal(o.values, 'order_staff')),
      periodStart: str(extractVal(o.values, 'start_date_man')),
      periodEnd: str(extractVal(o.values, 'end_date_man')),
    }))
}

// ===== 社員一覧 =====
// TODO(T2.0): レスポンス構造を疎通確認で確定

export async function listEmployees(): Promise<CboEmployee[]> {
  const res = await cboFetch<{ data: Array<Record<string, unknown>> }>('/company_users')

  return res.data
    .filter((u) => !u['is_withdrawed'] && !u['withdrawn_at'] && !u['deleted_at'])
    .map((u) => ({
      cboCompanyUserId: String(u['id']),
      workerName:
        [u['last_name'], u['first_name']].filter(Boolean).join('') || String(u['name'] ?? ''),
      nameKana: str(u['last_name_kana'] ?? u['name_kana']),
      tel: str(u['tel']),
    }))
}

// ===== 協力会社＋スタッフ一覧 =====
// TODO(T2.0): レスポンス構造を疎通確認で確定

export async function listPartnerWorkers(): Promise<CboPartnerWorker[]> {
  const res = await cboFetch<{
    data: Array<{ id: number; name: string; staffs?: Array<Record<string, unknown>> }>
  }>('/suppliers?supplier_format_id=5307')

  const workers: CboPartnerWorker[] = []
  for (const supplier of res.data) {
    const staffList = supplier.staffs ?? []
    for (const staff of staffList) {
      workers.push({
        cboSupplierId: String(supplier.id),
        cboSupplierStaffId: String(staff['id']),
        companyName: supplier.name,
        workerName: String(staff['last_name'] ?? staff['name'] ?? ''),
      })
    }
  }
  return workers
}

// ===== 出面一覧 =====
// 実レスポンス: { data: [{ id, company_user_id, values: [{key, value, label}] }] }
// TODO(T2.0): 直接エンドポイント vs カスタムビューエンドポイント要確認
// TODO(T2.0): order_id クエリ名・日付範囲パラメータ名を確認

export async function listAttendanceReports(
  orderId: string,
  period: { from: string; to: string }
): Promise<CboReport[]> {
  const params = new URLSearchParams({
    format_id: '4879',
    order_id: orderId,
    from: period.from,
    to: period.to,
  })
  const res = await cboFetch<{
    data: Array<{ id: number; company_user_id: number; values: CboValue[] }>
  }>(`/personal_daily_reports?${params}`)

  return res.data.map(normalizeReport)
}

// ===== 出面単体 =====

export async function getAttendanceReport(reportId: string): Promise<CboReport> {
  const res = await cboFetch<{ id: number; company_user_id: number; values: CboValue[] }>(
    `/personal_daily_reports/${reportId}`
  )
  return normalizeReport(res)
}

// ===== 内部: 出面レスポンス正規化 =====
// company_user_id (top-level) = 自社員ワーカーID
// sup_name / sup_staff (values 内) = 外注ワーカーID

function normalizeReport(r: {
  id: number
  company_user_id: number
  values: CboValue[]
}): CboReport {
  const vals = r.values ?? []
  return {
    cboReportId: String(r.id),
    cboOrderId: String(extractVal(vals, 'onsite') ?? ''),
    date: String(extractVal(vals, 'start_date') ?? ''),
    dayYakanId: str(extractVal(vals, 'day_yakan')),
    overHour: num(extractVal(vals, 'over_hour')),
    workContentId: str(extractVal(vals, 'work_content')),
    healthTypeId: str(extractVal(vals, 'health_type')),
    companyUserId: str(r.company_user_id),
    supplierId: str(extractVal(vals, 'sup_name')),
    supplierStaffId: str(extractVal(vals, 'sup_staff')),
  }
}
