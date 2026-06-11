import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // セッションを更新（期限切れトークンのリフレッシュ）
  const { data: { user } } = await supabase.auth.getUser()

  // /api/* は requireAuth() でルート層が判定するためここではリダイレクトしない
  // 未認証ユーザーがページにアクセスした場合のみリダイレクト
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!isApiRoute && !isLoginPage && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
