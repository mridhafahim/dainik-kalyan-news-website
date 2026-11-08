import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { epaperEditions, epaperPages, epaperRegions } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

const EDITION_STATUSES = ['draft', 'published'] as const
const integerId = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0
const clamp = (value: unknown) => Math.min(1, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0))

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // পেজ যোগ করা
  if (body.pageNumber !== undefined) {
    const editionId = Number(body.editionId)
    const pageNumber = Number(body.pageNumber)
    const width = Number(body.width)
    const height = Number(body.height)
    const imagePath = String(body.imagePath || '')

    const [page] = await db
      .insert(epaperPages)
      .values({ editionId, pageNumber, imagePath, width, height })
      .onConflictDoUpdate({ target: [epaperPages.editionId, epaperPages.pageNumber], set: { imagePath, width, height } })
      .returning()

    return NextResponse.json({ page })
  }

  // সংস্করণ তৈরি
  const editionDate = String(body.editionDate || '')
  const title = String(body.title || 'দৈনিক কল্যাণ').trim()

  const [edition] = await db
    .insert(epaperEditions)
    .values({ editionDate, title, status: 'draft' })
    .onConflictDoUpdate({ target: epaperEditions.editionDate, set: { title, updatedAt: new Date() } })
    .returning()

  return NextResponse.json({ edition })
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)

  if (body?.pageId) {
    const pageId = Number(body.pageId)
    const specialName = body.specialName ? String(body.specialName).trim() : null
    await db.update(epaperPages).set({ specialName } as any).where(eq(epaperPages.id, pageId))
    return NextResponse.json({ ok: true })
  }

  const editionId = Number(body?.editionId)
  const status = String(body?.status || '')
  if (!integerId(editionId) || !EDITION_STATUSES.includes(status as any)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const [edition] = await db.update(epaperEditions).set({ status, updatedAt: new Date() }).where(eq(epaperEditions.id, editionId)).returning()
  return NextResponse.json({ edition })
}

// ইউনিক সংবাদ গ্রুপসহ লিংক ম্যাপিং সেভ
export async function PUT(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const pageId = Number(body?.pageId)
  const regions = Array.isArray(body?.regions) ? body.regions : []

  if (!integerId(pageId)) return NextResponse.json({ error: 'Invalid page' }, { status: 400 })

  const normalized: Array<typeof epaperRegions.$inferInsert> = []
  for (const region of regions) {
    const shapeType = ['rect', 'polygon', 'l', 't'].includes(String(region.shapeType)) ? String(region.shapeType) : 'rect'
    const points = Array.isArray(region.points) ? region.points : []
    const values = [region?.x, region?.y, region?.width, region?.height].map(Number)
    const articleId = region?.articleId ? Number(region.articleId) : null
    const targetPageNumber = region?.targetPageNumber ? Number(region.targetPageNumber) : null
    
    // targetUrl-এ ইউনিক সংবাদ গ্রুপ (Story Group) স্টোর করা
    const targetUrl = region?.targetUrl ? String(region.targetUrl).trim() : null

    normalized.push({
      pageId,
      shapeType,
      points,
      x: String(values[0]),
      y: String(values[1]),
      width: String(values[2]),
      height: String(values[3]),
      articleId,
      targetPageNumber,
      targetUrl
    })
  }

  await db.transaction(async (tx) => {
    await tx.delete(epaperRegions).where(eq(epaperRegions.pageId, pageId))
    if (normalized.length) await tx.insert(epaperRegions).values(normalized)
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const editionId = Number(searchParams.get('editionId'))
  const pageId = Number(searchParams.get('pageId'))

  if (pageId) {
    await db.delete(epaperRegions).where(eq(epaperRegions.pageId, pageId))
    await db.delete(epaperPages).where(eq(epaperPages.id, pageId))
    return NextResponse.json({ ok: true, message: 'পৃষ্ঠা মুছে ফেলা হয়েছে' })
  }

  if (editionId) {
    const pages = await db.select({ id: epaperPages.id }).from(epaperPages).where(eq(epaperPages.editionId, editionId))
    for (const p of pages) {
      await db.delete(epaperRegions).where(eq(epaperRegions.pageId, p.id))
    }
    await db.delete(epaperPages).where(eq(epaperPages.editionId, editionId))
    await db.delete(epaperEditions).where(eq(epaperEditions.id, editionId))
    return NextResponse.json({ ok: true, message: 'সংস্করণ মুছে ফেলা হয়েছে' })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}