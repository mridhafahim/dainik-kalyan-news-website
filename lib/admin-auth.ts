import { scrypt as nodeScrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { ADMIN_SESSION_COOKIE, getAdminCredentials, safeEqual, validateAdminSession, type AdminRole, type AdminSession } from '@/lib/admin-session'

const scrypt = promisify(nodeScrypt)
export const SUPER_ADMIN = 'super_admin'
export const MODERATOR = 'moderator'

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split(':')
  if (!salt || !expected) return false
  const derived = await scrypt(password, salt, 64) as Buffer
  return await safeEqual(derived.toString('hex'), expected)
}

export async function getAdminContext(request: Request): Promise<AdminSession | null> {
  const session = await validateAdminSession(request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1])
  if (!session) return null
  if (session.role === SUPER_ADMIN) return session
  const [user] = await db.select({ status: adminUsers.status, role: adminUsers.role, mustChangePassword: adminUsers.mustChangePassword, permissions: adminUsers.permissions }).from(adminUsers).where(eq(adminUsers.userId, session.sub)).limit(1)
  if (!user || user.status !== 'active' || user.role !== session.role) return null
  return { ...session, mustChangePassword: user.mustChangePassword }
}

export async function requireAdmin(request: Request, role?: AdminRole, permission?: string) {
  const context = await getAdminContext(request)
  if (!context || (role && context.role !== role) || (permission && context.role !== SUPER_ADMIN && !(context.sub && (await getPermissions(context.sub)).includes(permission)))) return null
  return context
}

async function getPermissions(userId: string) {
  const [user] = await db.select({ permissions: adminUsers.permissions }).from(adminUsers).where(eq(adminUsers.userId, userId)).limit(1)
  return user?.permissions ?? []
}

export function cookieSession(request: Request) { return request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1] }
