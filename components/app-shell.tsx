'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded text-sm transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="w-8 bg-gray-900 flex flex-col items-center pt-3 shrink-0">
          <button
            onClick={() => setIsOpen(true)}
            className="text-gray-400 hover:text-white"
            aria-label="メニューを開く"
          >
            »
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-700 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">三浦興業</p>
            <p className="text-white font-semibold text-sm mt-0.5">出面・石綿記録</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white px-1"
            aria-label="メニューを閉じる"
          >
            «
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavItem href="/" label="現場一覧" />
          <NavItem href="/masters" label="マスタ管理" />
          <a
            href="https://office.craft-bank.com/orders?custom_view_id=8440&per_page=100&sort_asc_desc=desc&sort_key=latest_updated_at"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 rounded text-sm transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            ホーム
          </a>
        </nav>
        <div className="p-2 border-t border-gray-700">
          <NavItem href="/sync" label="同期・ログ" />
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
