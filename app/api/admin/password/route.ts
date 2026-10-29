import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { hashPassword, requireAdmin } from '@/lib/admin-auth'
export async function POST(request: NextRequest) { const session = await requireAdmin(request); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const body = await request.json().catch(() => ({})); const password = typeof body.password === 'string' ? body.password : ''; if (password.length < 12) return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 }); if (session.role === 'moderator') await db.update(adminUsers).set({ passwordHash: await hashPassword(password), mustChangePassword: false, updatedAt: new Date() }).where(eq(adminUsers.userId, session.sub)); return NextResponse.json({ ok: true }) }
