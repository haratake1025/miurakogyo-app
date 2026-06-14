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
  const viewId = process.env.CBO_ORDER_VIEW_ID ?? '8440'
  const res = await cboFetch<{ data: Array<{ id: number; values: CboValue[] }> }>(
    `/order_custom_views/${viewId}/orders`
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
// 実レスポンス: { data: [{ id, full_name, full_name_kana, tel, withdrawn_at, ... }] }

export async function listEmployees(): Promise<CboEmployee[]> {
  const res = await cboFetch<{ data: Array<Record<string, unknown>> }>('/users')

  return res.data
    .filter((u) => !u['is_withdrawed'] && !u['withdrawn_at'] && !u['deleted_at'])
    .map((u) => ({
      cboCompanyUserId: String(u['id']),
      workerName: String(u['full_name'] ?? ''),
      nameKana: str(u['full_name_kana']),
      tel: str(u['tel']),
    }))
}

// ===== 協力会社＋担当者一覧 =====
// 一覧: GET /supplier_custom_views/{viewId}/suppliers → format_id=5307 の ID を収集
// 詳細: GET /supplier_trees/{id}?evaluate_expression=0 → tree 構造でスタッフ個別 ID 取得
// tree.children: general_information > name (社名)
//                staff_information > staff (repeatable box) > staff_name > staff_last_name / staff_first_name
// cbo_supplier_id = 一覧の supplier.id (319097)
// cbo_supplier_staff_id = staff.value[i].id (7994989, 7994992...)

// ---- 内部型 ----

type TreeVal = {
  id: number
  parent_id: number | null
  key: string
  value: unknown
}

type TreeNode = {
  id: number
  key: string
  value: TreeVal[]
  children?: TreeNode[]
}

function findTreeNode(node: TreeNode, key: string): TreeNode | null {
  if (node.key === key) return node
  for (const child of node.children ?? []) {
    const found = findTreeNode(child, key)
    if (found) return found
  }
  return null
}

export async function listPartnerWorkers(): Promise<CboPartnerWorker[]> {
  const viewId = process.env.CBO_SUPPLIER_VIEW_ID ?? '3107'

  // 1. 一覧から format_id=5307 の supplier ID を収集
  type SupplierListItem = { format_id: number; id: number }
  const supplierIds: number[] = []
  let page = 1
  let lastPage = 1

  do {
    const res = await cboFetch<{
      data: SupplierListItem[]
      meta: { last_page: number }
    }>(`/supplier_custom_views/${viewId}/suppliers?per_page=100&page=${page}`)
    for (const s of res.data ?? []) {
      if (s.format_id === 5307) supplierIds.push(s.id)
    }
    lastPage = res.meta?.last_page ?? 1
    page++
  } while (page <= lastPage)

  // 2. 各社の詳細 (tree) を取得してスタッフを展開
  const workers: CboPartnerWorker[] = []

  for (const supplierId of supplierIds) {
    let detail: { data: { id: number; tree: TreeNode } }
    try {
      detail = await cboFetch<{ data: { id: number; tree: TreeNode } }>(
        `/supplier_trees/${supplierId}?evaluate_expression=0`
      )
    } catch {
      // CBO が 500 などを返した場合はこの会社をスキップして続行
      continue
    }

    const tree = detail.data?.tree
    if (!tree) continue

    // 社名
    const nameNode = findTreeNode(tree, 'name')
    const companyName = str(nameNode?.value?.[0]?.value)
    if (!companyName) continue

    // スタッフ instances
    const staffNode = findTreeNode(tree, 'staff')
    if (!staffNode?.value?.length) continue

    const staffNameNode = findTreeNode(staffNode, 'staff_name')
    const staffLastNode = findTreeNode(staffNode, 'staff_last_name')
    const staffFirstNode = findTreeNode(staffNode, 'staff_first_name')

    for (const staffInst of staffNode.value) {
      const staffId = staffInst.id
      // staff_name value に parent_id = staffId のものを探す
      const snVal = staffNameNode?.value?.find((v) => v.parent_id === staffId)
      if (!snVal) continue

      const lastName = str(staffLastNode?.value?.find((v) => v.parent_id === snVal.id)?.value) ?? ''
      const firstName = str(staffFirstNode?.value?.find((v) => v.parent_id === snVal.id)?.value) ?? ''
      const workerName = `${lastName}${firstName}`.trim()
      if (!workerName) continue

      workers.push({
        cboSupplierId: String(supplierId),
        cboSupplierStaffId: String(staffId),
        companyName,
        workerName,
      })
    }
  }

  return workers
}

// ===== 出面一覧 =====
// 実レスポンス: { data: [{ id, company_user_id, values: [{key, value, label}] }] }

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

// デバッグ用: CBO 出面の生レスポンスをそのまま返す（診断後に削除）
export async function listAttendanceReportsRaw(
  orderId: string,
  period: { from: string; to: string }
): Promise<{ listSample: unknown; detailSample: unknown }> {
  const params = new URLSearchParams({
    format_id: '4879',
    order_id: orderId,
    from: period.from,
    to: period.to,
  })
  // リスト: 先頭1件の全フィールドを返す
  const res = await cboFetch<{ data: Array<Record<string, unknown>> }>(
    `/personal_daily_reports?${params}`
  )
  const firstId = res.data[0]?.id as number | undefined

  // 詳細: 同じ1件を detail エンドポイントで取得して比較
  let detail: unknown = null
  if (firstId) {
    detail = await cboFetch(`/personal_daily_reports/${firstId}`)
  }

  return {
    listSample: res.data[0] ?? null,
    detailSample: detail,
  }
}

// ===== 出面単体 =====

export async function getAttendanceReport(reportId: string): Promise<CboReport> {
  const res = await cboFetch<{ id: number; company_user_id: number; values: CboValue[] }>(
    `/personal_daily_reports/${reportId}`
  )
  return normalizeReport(res)
}

// ===== 内部: 出面レスポンス正規化 =====

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
