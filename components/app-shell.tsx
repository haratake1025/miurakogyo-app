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
  const [open, setOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden">
      {open ? (
        <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">三浦興業</p>
              <p className="text-white font-semibold text-sm mt-0.5">出面・石綿記録</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white p-1 -mr-1 leading-none text-base"
              title="メニューを閉じる"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            <NavItem href="/" label="現場一覧" />
            <NavItem href="/masters" label="マスタ管理" />
          </nav>
          <div className="p-2 border-t border-gray-700">
            <NavItem href="/sync" label="同期・ログ" />
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-8 shrink-0 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center"
          title="メニューを開く"
        >
          ☰
        </button>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  )
}
