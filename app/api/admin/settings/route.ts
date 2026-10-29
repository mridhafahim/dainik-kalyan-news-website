import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteSettings } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
const allowed = ['siteName', 'slogan', 'footerText', 'contactEmail']
export async function GET(request: NextRequest) { if (!await requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const rows = await db.select().from(siteSettings); return NextResponse.json({ settings: Object.fromEntries(rows.map(row => [row.key, row.value])) }) }
export async function PUT(request: NextRequest) { const session = await requireAdmin(request, 'super_admin'); if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const entries = Object.entries(body).filter(([key]) => allowed.includes(key)); for (const [key, value] of entries) await db.insert(siteSettings).values({ key, value: String(value ?? '').trim().slice(0, 500), updatedBy: session.sub, updatedAt: new Date() }).onConflictDoUpdate({ target: siteSettings.key, set: { value: String(value ?? '').trim().slice(0, 500), updatedBy: session.sub, updatedAt: new Date() } }); return NextResponse.json({ ok: true }) }
