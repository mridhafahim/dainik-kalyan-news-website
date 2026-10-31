// import { randomBytes } from 'node:crypto'
// import { NextRequest, NextResponse } from 'next/server'
// import { desc, eq } from 'drizzle-orm'
// import { db } from '@/lib/db'
// import { adminUsers } from '@/lib/db/schema'
// import { hashPassword } from '@/lib/admin-auth'
// import { requireAdmin } from '@/lib/admin-auth'
// import { recordAdminAudit } from '@/lib/admin-audit'

// const generatedId = () => `mod_${randomBytes(5).toString('hex')}`
// const generatedPassword = () => randomBytes(12).toString('base64url')
// export async function GET(request: NextRequest) { if (!await requireAdmin(request, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ users: await db.select({ id: adminUsers.id, userId: adminUsers.userId, role: adminUsers.role, status: adminUsers.status, mustChangePassword: adminUsers.mustChangePassword, permissions: adminUsers.permissions, lastLoginAt: adminUsers.lastLoginAt }).from(adminUsers).orderBy(desc(adminUsers.createdAt)) }) }
// export async function POST(request: NextRequest) { if (!await requireAdmin(request, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json().catch(() => ({})); const userId = String(body.userId || generatedId()).trim(); const temporaryPassword = generatedPassword(); const permissions = Array.isArray(body.permissions) ? body.permissions.filter((value: unknown): value is string => typeof value === 'string' && ['news:read','news:write','news:publish'].includes(value)) : ['news:read']; if (!/^[a-zA-Z0-9._-]{4,64}$/.test(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 }); try { const [user] = await db.insert(adminUsers).values({ userId, passwordHash: await hashPassword(temporaryPassword), role: 'moderator', status: 'active', mustChangePassword: true, permissions }).returning({ id: adminUsers.id, userId: adminUsers.userId, role: adminUsers.role, permissions: adminUsers.permissions }); await recordAdminAudit({ actorUserId: (await requireAdmin(request, 'super_admin'))!.sub, action: 'moderator_create', resourceType: 'admin_user', resourceId: user.id, metadata: { userId: user.userId, permissions: user.permissions } }); return NextResponse.json({ user, temporaryPassword }, { status: 201 }) } catch { return NextResponse.json({ error: 'User ID already exists' }, { status: 409 }) } }
// export async function PATCH(request: NextRequest) { if (!await requireAdmin(request, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json().catch(() => ({})); const id = Number(body.id); const status = body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'active' : null; if (!Number.isInteger(id) || !status) return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); const [user] = await db.update(adminUsers).set({ status, updatedAt: new Date() }).where(eq(adminUsers.id, id)).returning({ id: adminUsers.id, status: adminUsers.status }); if (user) await recordAdminAudit({ actorUserId: (await requireAdmin(request, 'super_admin'))!.sub, action: status === 'suspended' ? 'moderator_suspend' : 'moderator_reactivate', resourceType: 'admin_user', resourceId: user.id, metadata: { status } }); return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'Not found' }, { status: 404 }) }



import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

// Password Hash Helper using Web Crypto
async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET: সকল অ্যাডমিন ও মডারেটরের তালিকা
export async function GET(request: NextRequest) {
  const actor = await requireAdmin(request, 'super_admin')
  if (!actor) return NextResponse.json({ error: 'শুধুমাত্র সুপার অ্যাডমিন এটি দেখতে পারবেন' }, { status: 403 })

  try {
    const users = await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        role: adminUsers.role,
        status: adminUsers.status,
        permissions: adminUsers.permissions,
        createdAt: adminUsers.createdAt,
        lastLoginAt: adminUsers.lastLoginAt
      })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt))

    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'ইউজার তালিকা লোড ব্যর্থ' }, { status: 500 })
  }
}

// POST: নতুন মডারেটর বা অ্যাডমিন তৈরি
export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, 'super_admin')
  if (!actor) return NextResponse.json({ error: 'শুধুমাত্র সুপার অ্যাডমিন নতুন একাউন্ট তৈরি করতে পারবেন' }, { status: 403 })

  try {
    const body = await request.json()
    const userId = String(body.userId || '').trim().toLowerCase()
    const password = String(body.password || '').trim()
    const role = body.role === 'super_admin' ? 'super_admin' : 'moderator'
    const permissions = Array.isArray(body.permissions) && body.permissions.length > 0
      ? body.permissions
      : ['news:read', 'news:write', 'epaper:read', 'epaper:write']

    if (!userId || userId.length < 3) {
      return NextResponse.json({ error: 'ইউজার আইডি কমপক্ষে ৩ অক্ষরের হতে হবে' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }, { status: 400 })
    }

    // Check duplicate userId
    const [existing] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.userId, userId))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: 'এই ইউজার আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const [newUser] = await db
      .insert(adminUsers)
      .values({
        userId,
        passwordHash,
        role,
        status: 'active',
        mustChangePassword: false,
        permissions
      })
      .returning({
        id: adminUsers.id,
        userId: adminUsers.userId,
        role: adminUsers.role,
        status: adminUsers.status,
        permissions: adminUsers.permissions
      })

    return NextResponse.json({ user: newUser, message: 'মডারেটর সফলভাবে তৈরি হয়েছে' }, { status: 201 })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json({ error: 'মডারেটর তৈরি ব্যর্থ হয়েছে' }, { status: 500 })
  }
}

// DELETE: মডারেটর ডিলিট
export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, 'super_admin')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))

  if (!id) return NextResponse.json({ error: 'আইডি আবশ্যক' }, { status: 400 })

  try {
    await db.delete(adminUsers).where(eq(adminUsers.id, id))
    return NextResponse.json({ ok: true, message: 'ইউজার মুছে ফেলা হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'ইউজার মুছতে ব্যর্থ' }, { status: 500 })
  }
}