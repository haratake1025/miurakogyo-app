import Link from 'next/link'
import type { Site } from '@/types/db'

function fmt(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${y}/${m}/${day}`
}

export function SiteCard({ site }: { site: Site }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">{site.name}</h2>
        {site.is_asbestos && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shrink-0 ml-2">
            石綿
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 space-y-0.5 mb-4">
        <p>{site.client_name ?? '—'}</p>
        <p>責任者: {site.manager_name ?? '—'}</p>
        <p>
          工期: {fmt(site.period_start)} 〜 {fmt(site.period_end)}
        </p>
        {site.last_synced_at && (
          <p className="text-gray-400">
            最終同期: {new Date(site.last_synced_at).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Link
          href={`/sites/${site.id}/attendance`}
          className="flex-1 text-center text-xs py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          出面表
        </Link>
        <Link
          href={`/sites/${site.id}/asbestos`}
          className="flex-1 text-center text-xs py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          石綿記録
        </Link>
      </div>
    </div>
  )
}
