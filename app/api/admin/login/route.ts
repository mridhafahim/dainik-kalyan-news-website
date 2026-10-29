import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminSession, getAdminCredentials, safeEqual } from '@/lib/admin-session'
import { verifyPassword } from '@/lib/admin-auth'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
function getClientKey(request: Request) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown' }

export async function POST(request: Request) {
  const ip = getClientKey(request); const now = Date.now()
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key)
  const record = attempts.get(ip)
  if (record && record.count >= MAX_ATTEMPTS) { const response = NextResponse.json({ error: 'অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।' }, { status: 429 }); response.headers.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000))); return response }
  const body = await request.json().catch(() => ({})) as { adminId?: unknown; password?: unknown; role?: unknown }
  const adminId = typeof body.adminId === 'string' ? body.adminId.trim() : ''; const password = typeof body.password === 'string' ? body.password : ''; const requestedRole = body.role === 'moderator' ? 'moderator' : 'super_admin'
  let valid = false; let role: 'super_admin' | 'moderator' = 'super_admin'; let mustChangePassword = false
  const [user] = adminId ? await db.select().from(adminUsers).where(eq(adminUsers.userId, adminId)).limit(1) : []
  if (user) { valid = requestedRole === user.role && user.status === 'active' && await verifyPassword(password, user.passwordHash); role = user.role as 'moderator'; mustChangePassword = user.mustChangePassword }
  else { try { const credentials = getAdminCredentials(); valid = requestedRole === 'super_admin' && await safeEqual(adminId, credentials.adminId) && await safeEqual(password, credentials.password) } catch { return NextResponse.json({ error: 'অ্যাডমিন লগইন বর্তমানে কনফিগার করা নেই।' }, { status: 503 }) } }
  if (!valid) { const next = attempts.get(ip); if (next && next.resetAt > now) next.count += 1; else attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return NextResponse.json({ error: 'অ্যাডমিন আইডি, পাসওয়ার্ড বা ভূমিকা সঠিক নয়।' }, { status: 401 }) }
  attempts.delete(ip)
  if (user) await db.update(adminUsers).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(adminUsers.id, user.id))
  try { const session = await createAdminSession(adminId, role, mustChangePassword); const response = NextResponse.json({ ok: true, mustChangePassword }); response.cookies.set(ADMIN_SESSION_COOKIE, session, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: ADMIN_SESSION_TTL_SECONDS }); return response } catch { return NextResponse.json({ error: 'অ্যাডমিন লগইন বর্তমানে কনফিগার করা নেই।' }, { status: 503 }) }
}

export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', expires: new Date(0), maxAge: 0, path: '/' }); return response }
