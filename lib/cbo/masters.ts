// CBO 読み取りアダプタ（サーバー専用）
// 参照: CBO_API連携仕様 §8
// ★ = T2.0疎通確認で確定が必要な項目

import { cboFetch } from './client'

// ===== 正規化後の型（DBスキーマに合わせた出力） =====

export type CboSite = {
  cboOrderId: string
  name: string
  clientName: string | null
  managerName: string | null
  periodStart: string | null  // 'YYYY-MM-DD'
  periodEnd: string | null
}

export type CboEmployee = {
  cboCompanyUserId: string
  workerName: string
  nameKana: string | null
  tel: string | null
}

export type CboPartnerWorker = {
  cboSupplierId: string       // sup_name 用（会社ID）
  cboSupplierStaffId: string  // sup_staff 用（staffID）
  companyName: string
  workerName: string
}

export type CboReport = {
  cboReportId: string
  cboOrderId: string
  date: string              // 'YYYY-MM-DD'
  dayYakanId: string | null
  overHour: number
  workContentId: string | null
  healthTypeId: string | null
  // TODO(T2.0): worker側フィールド名（work_user / sup_name / sup_staff）を疎通確認で確定
  companyUserId: string | null
  supplierId: string | null
  supplierStaffId: string | null
}

// ===== 内部: CBOレスポンス生型（★疎通確認で確定） =====

// TODO(T2.0): 実レスポンスのフィールド名・構造を確認後に修正
type RawOrder = Record<string, unknown>
type RawCompanyUser = Record<string, unknown>
type RawSupplier = Record<string, unknown>
type RawSupplierStaff = Record<string, unknown>
type RawReport = Record<string, unknown>

// TODO(T2.0): ページング方式（page/per_page/cursor等）を確認後に対応
type ListResponse<T> = { data: T[] } | T[]

function extractList<T>(res: ListResponse<T>): T[] {
  return Array.isArray(res) ? res : res.data
}

function str(v: unknown): string | null {
  return v != null ? String(v) : null
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0
}

// ===== 現場一覧 =====

export async function listSites(): Promise<CboSite[]> {
  // TODO(T2.0): クエリ名・レスポンス構造を疎通確認で確定
  const res = await cboFetch<ListResponse<RawOrder>>('/orders?order_format_id=2556')
  const orders = extractList(res)

  // asbests=true をアプリ側でフィルタ（カスタム項目のためクエリ非対応の可能性）
  return orders
    .filter((o) => o['asbests'] === true || o['asbests'] === 'true')
    .map((o) => ({
      cboOrderId: String(o['id']),
      name: String(o['contract_name'] ?? o['name'] ?? ''),
      clientName: str(o['suppliers_name'] ?? o['client_name']),
      managerName: str(o['order_staff'] ?? o['manager_name']),
      periodStart: str(o['start_date_man'] ?? o['start_date']),
      periodEnd: str(o['end_date_man'] ?? o['end_date']),
    }))
}

// ===== 社員一覧 =====

export async function listEmployees(): Promise<CboEmployee[]> {
  // TODO(T2.0): クエリ名・退職者除外フィールド名を疎通確認で確定
  const res = await cboFetch<ListResponse<RawCompanyUser>>('/company_users')
  const users = extractList(res)

  return users
    .filter(
      (u) =>
        !u['is_withdrawed'] &&
        !u['withdrawn_at'] &&
        !u['deleted_at']
    )
    .map((u) => ({
      cboCompanyUserId: String(u['id']),
      workerName: [u['last_name'], u['first_name']].filter(Boolean).join('') || String(u['name'] ?? ''),
      nameKana: str(u['last_name_kana'] ?? u['name_kana']),
      tel: str(u['tel']),
    }))
}

// ===== 協力会社＋スタッフ一覧 =====

export async function listPartnerWorkers(): Promise<CboPartnerWorker[]> {
  // TODO(T2.0): クエリ名・staffネスト構造を疎通確認で確定
  const res = await cboFetch<ListResponse<RawSupplier>>('/suppliers?supplier_format_id=5307')
  const suppliers = extractList(res)

  const workers: CboPartnerWorker[] = []
  for (const supplier of suppliers) {
    const companyName = String(supplier['name'] ?? '')
    const supplierId = String(supplier['id'])
    const staffList = (supplier['staffs'] ?? supplier['staff'] ?? []) as RawSupplierStaff[]

    for (const staff of staffList) {
      workers.push({
        cboSupplierId: supplierId,
        cboSupplierStaffId: String(staff['id']),
        companyName,
        workerName: String(staff['last_name'] ?? staff['name'] ?? ''),
      })
    }
  }

  return workers
}

// ===== 出面一覧 =====

export async function listAttendanceReports(
  orderId: string,
  period: { from: string; to: string }
): Promise<CboReport[]> {
  // TODO(T2.0): クエリ名（order_id? onsite_id? 日付範囲パラメータ名）を疎通確認で確定
  const params = new URLSearchParams({
    personal_daily_report_format_id: '4879',
    order_id: orderId,
    from: period.from,
    to: period.to,
  })
  const res = await cboFetch<ListResponse<RawReport>>(`/personal_daily_reports?${params}`)
  return extractList(res).map(normalizeReport)
}

// ===== 出面単体 =====

export async function getAttendanceReport(reportId: string): Promise<CboReport> {
  const res = await cboFetch<RawReport>(`/personal_daily_reports/${reportId}`)
  return normalizeReport(res)
}

// ===== 内部: 出面レスポンス正規化 =====

function normalizeReport(r: RawReport): CboReport {
  // TODO(T2.0): formatted:false 時のフィールド名を疎通確認で確定
  return {
    cboReportId: String(r['id']),
    cboOrderId: String(r['onsite'] ?? r['order_id'] ?? ''),
    date: String(r['start_date'] ?? ''),
    dayYakanId: str(r['day_yakan']),
    overHour: num(r['over_hour']),
    workContentId: str(r['work_content']),
    healthTypeId: str(r['health_type']),
    companyUserId: str(r['work_user']),
    supplierId: str(r['sup_name']),
    supplierStaffId: str(r['sup_staff']),
  }
}
