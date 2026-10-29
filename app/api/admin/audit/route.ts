import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminAuditLogs } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
export async function GET(request: NextRequest) { if (!await requireAdmin(request, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50)); return NextResponse.json({ logs: await db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit) }) }
