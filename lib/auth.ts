type AuthUser = { id: string }

// 認証なしで常にシステムユーザーを返す
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  return { id: process.env.SYSTEM_USER_ID ?? 'system' }
}
