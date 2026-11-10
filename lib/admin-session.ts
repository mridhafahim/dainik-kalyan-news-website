export const ADMIN_SESSION_COOKIE = '__Host-admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 24 * 60 * 60 // ২৪ ঘণ্টা

const DEFAULT_SECRET = '12341234123412340987098709870987'

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET
}

function encode(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function decode(value: string) {
  const b64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return decodeURIComponent(escape(atob(b64)))
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export type AdminRole = 'super_admin' | 'moderator'
export type AdminSession = { sub: string; role: AdminRole; mustChangePassword: boolean; exp: number }

export async function createAdminSession(adminId: string, role: AdminRole = 'super_admin', mustChangePassword = false) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS
  const payload = encode(JSON.stringify({ sub: adminId, role, mustChangePassword, exp: expiresAt }))
  const signature = await sign(payload)
  return `${payload}.${signature}`
}

export async function validateAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  if (!payload || !signature) return null

  try {
    const expected = await sign(payload)
    if (signature !== expected) return null
    const session = JSON.parse(decode(payload)) as Partial<AdminSession>
    if (!session.sub || !session.exp || session.exp <= Math.floor(Date.now() / 1000)) return null
    return {
      sub: session.sub,
      role: (session.role as AdminRole) || 'super_admin',
      mustChangePassword: Boolean(session.mustChangePassword),
      exp: session.exp
    }
  } catch {
    return null
  }
}

export function getAdminCredentials() {
  const adminId = process.env.ADMIN_ID || 'admin001'
  const password = process.env.ADMIN_PASSWORD || 'adminadmin'
  return { adminId, password }
}