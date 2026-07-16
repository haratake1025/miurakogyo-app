import type { WorkerSummary } from '@/types/frontend'

// 会社の並び順: ニチアスセムクリート → 三浦興業 → それ以外（五十音順）
function companyPriority(companyName: string | null | undefined): number {
  const name = companyName ?? ''
  if (name.includes('ニチアス')) return 0
  if (name.includes('三浦興業')) return 1
  return 2
}

export function compareWorkers(a: WorkerSummary, b: WorkerSummary): number {
  const pa = companyPriority(a.company_name)
  const pb = companyPriority(b.company_name)
  if (pa !== pb) return pa - pb
  const co = (a.company_name ?? '').localeCompare(b.company_name ?? '', 'ja')
  if (co !== 0) return co
  return a.worker_name.localeCompare(b.worker_name, 'ja')
}
