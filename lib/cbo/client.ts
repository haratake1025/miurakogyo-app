// CBO API 共通 HTTP クライアント（サーバー専用）
// CBO_TOKEN はサーバー側シークレット。このモジュールをクライアントバンドルに含めてはいけない

const BASE_URL = process.env.CBO_BASE_URL ?? 'https://office.craft-bank.com/api'

// GAS実装に倣い連続呼び出しは 500ms 間隔を空ける
const THROTTLE_MS = 500
let lastCallAt = 0

async function throttle() {
  const elapsed = Date.now() - lastCallAt
  if (elapsed < THROTTLE_MS) {
    await new Promise((r) => setTimeout(r, THROTTLE_MS - elapsed))
  }
  lastCallAt = Date.now()
}

export class CboApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
    path: string
  ) {
    super(`CBO API ${status}: ${path}`)
    this.name = 'CboApiError'
  }
}

export async function cboFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = process.env.CBO_TOKEN
  if (!token) throw new Error('CBO_TOKEN が未設定です')

  await throttle()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new CboApiError(res.status, body, path)
  }

  return res.json() as Promise<T>
}
