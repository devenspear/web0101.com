export const ADMIN_COOKIE_NAME = 'admin'
export const ADMIN_SESSION_TTL_MS = 60 * 60 * 1000

export const adminCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
}

export type AdminSessionState =
  | { valid: true; issuedAt: number }
  | { valid: false; expired: boolean }

export function readAdminSession(value: string | undefined): AdminSessionState {
  if (!value) {
    return { valid: false, expired: false }
  }
  const issuedAt = Number(value)
  if (!Number.isFinite(issuedAt)) {
    return { valid: false, expired: false }
  }
  const age = Date.now() - issuedAt
  if (age > ADMIN_SESSION_TTL_MS) {
    return { valid: false, expired: true }
  }
  return { valid: true, issuedAt }
}
