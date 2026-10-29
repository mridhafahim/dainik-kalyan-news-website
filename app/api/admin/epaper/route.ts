import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { epaperEditions, epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { recordAdminAudit } from '@/lib/admin-audit'

const EDITION_STATUSES = ['draft', 'published'] as const
const cleanUrl = (value: unknown) => {
  if (value == null || value === '') return null
  try {
    const url = new URL(String(value))
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch { return null }
}
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
const integerId = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0
const clamp = (value: unknown) => Math.min(1, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0))

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (body.pageNumber !== undefined) {
    const editionId = Number(body.editionId); const pageNumber = Number(body.pageNumber); const width = Number(body.width); const height = Number(body.height); const imagePath = String(body.imagePath || '')
    if (![editionId, pageNumber, width, height].every(Number.isInteger) || editionId < 1 || pageNumber < 1 || width < 1 || height < 1 || !imagePath || imagePath.length > 2000) return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    const [edition] = await db.select({ id: epaperEditions.id }).from(epaperEditions).where(eq(epaperEditions.id, editionId)).limit(1)
    if (!edition) return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
    const [page] = await db.insert(epaperPages).values({ editionId, pageNumber, imagePath, width, height }).onConflictDoUpdate({ target: [epaperPages.editionId, epaperPages.pageNumber], set: { imagePath, width, height } }).returning()
    await recordAdminAudit({ actorUserId: actor.sub, action: 'epaper_page_upsert', resourceType: 'epaper_page', resourceId: page.id, metadata: { editionId, pageNumber } })
    return NextResponse.json({ page })
  }
  const editionDate = String(body.editionDate || ''); const title = String(body.title || 'দৈনিক কল্যাণ').trim().slice(0, 240)
  if (!validDate(editionDate) || !title) return NextResponse.json({ error: 'সঠিক তারিখ ও শিরোনাম দিন' }, { status: 400 })
  const [edition] = await db.insert(epaperEditions).values({ editionDate, title, status: 'draft' }).onConflictDoUpdate({ target: epaperEditions.editionDate, set: { title, updatedAt: new Date() } }).returning()
  await recordAdminAudit({ actorUserId: actor.sub, action: 'epaper_edition_upsert', resourceType: 'epaper_edition', resourceId: edition.id, metadata: { editionDate } })
  return NextResponse.json({ edition })
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdmin(request, 'super_admin', 'epaper:publish')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null); const editionId = Number(body?.editionId); const status = String(body?.status || '')
  if (!integerId(editionId) || !EDITION_STATUSES.includes(status as typeof EDITION_STATUSES[number])) return NextResponse.json({ error: 'Invalid edition status' }, { status: 400 })
  if (status === 'published') {
    const pages = await db.select({ id: epaperPages.id, pageNumber: epaperPages.pageNumber }).from(epaperPages).where(eq(epaperPages.editionId, editionId)).orderBy(asc(epaperPages.pageNumber))
    if (!pages.length) return NextResponse.json({ error: 'Add at least one page before publishing' }, { status: 400 })
  }
  const [edition] = await db.update(epaperEditions).set({ status, pdfPath: cleanUrl(body?.pdfPath), updatedAt: new Date() }).where(eq(epaperEditions.id, editionId)).returning()
  if (!edition) return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  await recordAdminAudit({ actorUserId: actor.sub, action: status === 'published' ? 'epaper_publish' : 'epaper_unpublish', resourceType: 'epaper_edition', resourceId: editionId, metadata: { status } })
  return NextResponse.json({ edition })
}

export async function PUT(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null); const pageId = Number(body?.pageId); const regions = Array.isArray(body?.regions) ? body.regions : []
  if (!integerId(pageId) || regions.length > 100) return NextResponse.json({ error: 'Invalid page or too many regions' }, { status: 400 })
  const [page] = await db.select({ id: epaperPages.id }).from(epaperPages).where(eq(epaperPages.id, pageId)).limit(1)
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  const normalized: Array<typeof epaperRegions.$inferInsert> = []
  for (const region of regions) {
    const shapeType = ['rect', 'polygon', 'l', 't'].includes(String(region.shapeType)) ? String(region.shapeType) : 'rect'
    const points = Array.isArray(region.points) ? region.points.slice(0, 64).map((point: { x: unknown; y: unknown }) => ({ x: clamp(point.x), y: clamp(point.y) })) : []
    const values = [region?.x, region?.y, region?.width, region?.height].map(Number)
    if (values.some((value) => !Number.isFinite(value)) || values[0] < 0 || values[1] < 0 || values[2] <= 0 || values[3] <= 0 || values[0] + values[2] > 1 || values[1] + values[3] > 1) return NextResponse.json({ error: 'Region coordinates must be within page bounds' }, { status: 400 })
    const articleId = region?.articleId == null ? null : Number(region.articleId)
    const targetPageNumber = region?.targetPageNumber == null ? null : Number(region.targetPageNumber)
    if (articleId !== null && !integerId(articleId)) return NextResponse.json({ error: 'Invalid article target' }, { status: 400 })
    if (targetPageNumber !== null && (!Number.isInteger(targetPageNumber) || targetPageNumber < 1)) return NextResponse.json({ error: 'Invalid page target' }, { status: 400 })
    if (articleId !== null) { const [article] = await db.select({ id: newsArticles.id }).from(newsArticles).where(eq(newsArticles.id, articleId)).limit(1); if (!article) return NextResponse.json({ error: 'Article target not found' }, { status: 400 }) }
    const targetUrl = cleanUrl(region?.targetUrl)
    if (region?.targetUrl && !targetUrl) return NextResponse.json({ error: 'External targets must use HTTP or HTTPS' }, { status: 400 })
    if (shapeType !== 'rect' && points.length < 3) return NextResponse.json({ error: 'Custom shapes need at least three points' }, { status: 400 })
    normalized.push({ pageId, shapeType, points, x: String(values[0]), y: String(values[1]), width: String(values[2]), height: String(values[3]), articleId, targetPageNumber, targetUrl })
  }
  await db.transaction(async (tx) => { await tx.delete(epaperRegions).where(eq(epaperRegions.pageId, pageId)); if (normalized.length) await tx.insert(epaperRegions).values(normalized) })
  await recordAdminAudit({ actorUserId: actor.sub, action: 'epaper_regions_replace', resourceType: 'epaper_page', resourceId: pageId, metadata: { count: normalized.length } })
  return NextResponse.json({ ok: true })
}
