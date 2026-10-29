export const ADMIN_SESSION_COOKIE = '__Host-admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 2 * 60 * 60

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be configured with at least 32 characters')
  return secret
}

function encode(value: string) {
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function decode(value: string) {
  return atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4))
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(getSessionSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return encode(String.fromCharCode(...new Uint8Array(signature)))
}

export type AdminRole = 'super_admin' | 'moderator'
export type AdminSession = { sub: string; role: AdminRole; mustChangePassword: boolean; exp: number }

export async function createAdminSession(adminId: string, role: AdminRole = 'super_admin', mustChangePassword = false) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS
  const payload = encode(JSON.stringify({ sub: adminId, role, mustChangePassword, exp: expiresAt }))
  return `${payload}.${await sign(payload)}`
}

export async function validateAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  try {
    const expected = await sign(payload)
    if (signature.length !== expected.length || !crypto.subtle) return null
    const session = JSON.parse(decode(payload)) as Partial<AdminSession>
    if (!session.sub || !session.exp || (session.role !== 'super_admin' && session.role !== 'moderator') || session.exp <= Math.floor(Date.now() / 1000) || !(await safeEqual(signature, expected))) return null
    return { sub: session.sub, role: session.role, mustChangePassword: Boolean(session.mustChangePassword), exp: session.exp }
  } catch {
    return null
  }
}

export function getAdminCredentials() {
  const adminId = process.env.ADMIN_ID
  const password = process.env.ADMIN_PASSWORD
  if (!adminId || !password) throw new Error('ADMIN_ID and ADMIN_PASSWORD must be configured')
  return { adminId, password }
}

export async function safeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  if (leftBytes.length !== rightBytes.length) return false
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index]
  return difference === 0
}
