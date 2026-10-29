import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mediaAssets } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
export async function GET(request: NextRequest) { if (!await requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ assets: await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)) }) }
