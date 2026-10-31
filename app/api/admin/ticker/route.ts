// import { NextRequest, NextResponse } from 'next/server'
// import { asc, eq } from 'drizzle-orm'
// import { db } from '@/lib/db'
// import { breakingTickers } from '@/lib/db/schema'
// import { requireAdmin } from '@/lib/admin-auth'
// import { recordAdminAudit } from '@/lib/admin-audit'
// const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
// export async function GET(request: NextRequest) { if (!await requireAdmin(request, undefined, 'news:read')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ tickers: await db.select().from(breakingTickers).orderBy(asc(breakingTickers.sortOrder), asc(breakingTickers.id)) }) }
// export async function POST(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const textBn = clean(body.textBn, 240); if (!textBn) return NextResponse.json({ error: 'টিকার লিখুন' }, { status: 400 }); const [ticker] = await db.insert(breakingTickers).values({ textBn, textEn: clean(body.textEn || textBn, 240), newsUrl: clean(body.newsUrl || '#', 500), isActive: body.isActive !== false, sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0 }).returning(); await recordAdminAudit({ actorUserId: actor.sub, action: 'ticker_create', resourceType: 'breaking_ticker', resourceId: ticker.id }); return NextResponse.json({ ticker }, { status: 201 }) }
// export async function PATCH(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const id = Number(body.id); if (!Number.isInteger(id) || !clean(body.textBn, 240)) return NextResponse.json({ error: 'তথ্য সঠিক নয়' }, { status: 400 }); const [ticker] = await db.update(breakingTickers).set({ textBn: clean(body.textBn, 240), textEn: clean(body.textEn || body.textBn, 240), newsUrl: clean(body.newsUrl || '#', 500), isActive: body.isActive !== false, sortOrder: Number(body.sortOrder) || 0 }).where(eq(breakingTickers.id, id)).returning(); if (!ticker) return NextResponse.json({ error: 'Not found' }, { status: 404 }); await recordAdminAudit({ actorUserId: actor.sub, action: 'ticker_update', resourceType: 'breaking_ticker', resourceId: id }); return NextResponse.json({ ticker }) }
// export async function DELETE(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const id = Number(request.nextUrl.searchParams.get('id')); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 }); await db.delete(breakingTickers).where(eq(breakingTickers.id, id)); await recordAdminAudit({ actorUserId: actor.sub, action: 'ticker_delete', resourceType: 'breaking_ticker', resourceId: id }); return NextResponse.json({ ok: true }) }



import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { breakingTickers } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

// GET: সব টিকার লোড করা
export async function GET() {
  try {
    const tickers = await db
      .select()
      .from(breakingTickers)
      .orderBy(asc(breakingTickers.sortOrder), desc(breakingTickers.createdAt))
    return NextResponse.json({ tickers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'টিকার লোড ব্যর্থ' }, { status: 500 })
  }
}

// POST: নতুন টিকার যুক্ত করা
export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const textBn = String(body.textBn || '').trim()
    const textEn = String(body.textEn || textBn).trim()
    const newsUrl = String(body.newsUrl || '#').trim()
    const isActive = body.isActive !== false
    const sortOrder = Number(body.sortOrder) || 0

    if (!textBn) {
      return NextResponse.json({ error: 'টিকারের বাংলা লেখা আবশ্যক' }, { status: 400 })
    }

    const [ticker] = await db
      .insert(breakingTickers)
      .values({
        textBn,
        textEn,
        newsUrl,
        isActive,
        sortOrder
      })
      .returning()

    return NextResponse.json({ ticker, message: 'টিকার সফলভাবে যুক্ত হয়েছে' }, { status: 201 })
  } catch (error) {
    console.error('Ticker insert error:', error)
    return NextResponse.json({ error: 'টিকার সংরক্ষণ ব্যর্থ হয়েছে' }, { status: 500 })
  }
}

// PUT: টিকার এডিট বা সক্রিয়/নিষ্ক্রিয় টগল করা
export async function PUT(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const id = Number(body.id)

    if (!id) return NextResponse.json({ error: 'টিকার আইডি আবশ্যক' }, { status: 400 })

    const updateData: Partial<typeof breakingTickers.$inferInsert> = {}

    if (body.textBn !== undefined) updateData.textBn = String(body.textBn).trim()
    if (body.textEn !== undefined) updateData.textEn = String(body.textEn).trim()
    if (body.newsUrl !== undefined) updateData.newsUrl = String(body.newsUrl).trim()
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder)

    const [updated] = await db
      .update(breakingTickers)
      .set(updateData)
      .where(eq(breakingTickers.id, id))
      .returning()

    return NextResponse.json({ ticker: updated, message: 'টিকার সফলভাবে আপডেট হয়েছে' })
  } catch (error) {
    return NextResponse.json({ error: 'টিকার আপডেট ব্যর্থ' }, { status: 500 })
  }
}

// DELETE: টিকার মুছে ফেলা
export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))

  if (!id) return NextResponse.json({ error: 'আইডি আবশ্যক' }, { status: 400 })

  try {
    await db.delete(breakingTickers).where(eq(breakingTickers.id, id))
    return NextResponse.json({ ok: true, message: 'টিকার ডিলিট হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'টিকার মুছতে ব্যর্থ' }, { status: 500 })
  }
}