// CBO レスポンス → DB upsert 用モデルへの正規化
// 参照: CBO_API連携仕様 §8.3 / バックエンド設計 §2

import type { CboSite, CboEmployee, CboPartnerWorker, CboReport } from './masters'

// ===== DB upsert 用型（スキーマに対応） =====

export type SiteRow = {
  cbo_order_id: string
  name: string
  client_name: string | null
  manager_name: string | null
  is_asbestos: true
  period_start: string | null
  period_end: string | null
  last_synced_at: string  // ISO timestamp
}

export type WorkerRow =
  | {
      source_kind: 'employee'
      cbo_company_user_id: string
      cbo_supplier_id: null
      cbo_supplier_staff_id: null
      company_name: string
      worker_name: string
      name_kana: string | null
      tel: string | null
      is_active: true
      last_synced_at: string
    }
  | {
      source_kind: 'partner'
      cbo_company_user_id: null
      cbo_supplier_id: string
      cbo_supplier_staff_id: string
      company_name: string
      worker_name: string
      name_kana: null
      tel: null
      is_active: true
      last_synced_at: string
    }

// daily_reports の upsert には site_id / worker_id（UUID）が必要なため呼び出し側で解決する
export type ReportRow = {
  site_id: string           // UUID（呼び出し側でDBから解決）
  worker_id: string         // UUID（呼び出し側でDBから解決）
  work_date: string         // 'YYYY-MM-DD'
  reporter_cbo_user_id: string | null
  day_yakan_id: string | null
  over_hour: number
  work_content_id: string | null
  health_type_id: string | null
  cbo_report_id: string
  sync_status: 'synced'
  cbo_synced_at: string     // pull実行時刻（競合検知の基準）
}

// ===== 変換関数 =====

const now = () => new Date().toISOString()

export function toSiteRow(site: CboSite): SiteRow {
  return {
    cbo_order_id: site.cboOrderId,
    name: site.name,
    client_name: site.clientName,
    manager_name: site.managerName,
    is_asbestos: true,
    period_start: site.periodStart,
    period_end: site.periodEnd,
    last_synced_at: now(),
  }
}

export function toEmployeeRow(emp: CboEmployee): WorkerRow {
  return {
    source_kind: 'employee',
    cbo_company_user_id: emp.cboCompanyUserId,
    cbo_supplier_id: null,
    cbo_supplier_staff_id: null,
    company_name: '三浦興業',
    worker_name: emp.workerName,
    name_kana: emp.nameKana,
    tel: emp.tel,
    is_active: true,
    last_synced_at: now(),
  }
}

export function toPartnerWorkerRow(partner: CboPartnerWorker): WorkerRow {
  return {
    source_kind: 'partner',
    cbo_company_user_id: null,
    cbo_supplier_id: partner.cboSupplierId,
    cbo_supplier_staff_id: partner.cboSupplierStaffId,
    company_name: partner.companyName,
    worker_name: partner.workerName,
    name_kana: null,
    tel: null,
    is_active: true,
    last_synced_at: now(),
  }
}

export function toReportRow(
  report: CboReport,
  siteId: string,
  workerId: string,
  pulledAt: string
): ReportRow {
  return {
    site_id: siteId,
    worker_id: workerId,
    work_date: report.date,
    reporter_cbo_user_id: report.companyUserId,
    day_yakan_id: report.dayYakanId,
    over_hour: report.overHour,
    work_content_id: report.workContentId,
    health_type_id: report.healthTypeId,
    cbo_report_id: report.cboReportId,
    sync_status: 'synced',
    cbo_synced_at: pulledAt,
  }
}
