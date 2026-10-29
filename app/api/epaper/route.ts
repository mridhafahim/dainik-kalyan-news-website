import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { epaperEditions, epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const isAdmin = request.nextUrl.searchParams.get('admin') === '1'
  if (isAdmin && !await requireAdmin(request, undefined, 'epaper:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const requestedId = Number(request.nextUrl.searchParams.get('edition') || 0)
  const editions = isAdmin ? await db.select().from(epaperEditions).orderBy(desc(epaperEditions.editionDate)) : await db.select().from(epaperEditions).where(eq(epaperEditions.status, 'published')).orderBy(desc(epaperEditions.editionDate))
  const edition = requestedId ? editions.find((item) => item.id === requestedId) : editions[0]
  if (!edition) return NextResponse.json({ editions, current: null }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
  const pages = await db.select().from(epaperPages).where(eq(epaperPages.editionId, edition.id)).orderBy(asc(epaperPages.pageNumber))
  const allRegions = pages.length ? await db.select().from(epaperRegions).where(inArray(epaperRegions.pageId, pages.map((page) => page.id))) : []
  const regions = pages.length ? allRegions.filter((region) => region.pageId === pages[0].id) : []
  const articles = isAdmin ? await db.select({ id: newsArticles.id, titleBn: newsArticles.titleBn }).from(newsArticles).where(eq(newsArticles.status, 'published')).orderBy(desc(newsArticles.publishedAt)) : []
  return NextResponse.json({ editions, current: { edition, pages, regions, allRegions }, articles }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
