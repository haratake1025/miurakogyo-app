import type { WorkerSummary } from '@/types/frontend'

export function compareWorkers(a: WorkerSummary, b: WorkerSummary): number {
  const aMiura = (a.company_name ?? '') === '三浦興業'
  const bMiura = (b.company_name ?? '') === '三浦興業'
  if (aMiura !== bMiura) return aMiura ? -1 : 1
  const co = (a.company_name ?? '').localeCompare(b.company_name ?? '', 'ja')
  if (co !== 0) return co
  return a.worker_name.localeCompare(b.worker_name, 'ja')
}
