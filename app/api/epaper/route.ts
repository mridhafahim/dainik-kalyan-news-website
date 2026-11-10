import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { epaperEditions, epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = request.nextUrl.searchParams.get('admin') === '1'
    if (isAdmin && !await requireAdmin(request, undefined, 'epaper:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestedId = Number(request.nextUrl.searchParams.get('edition') || 0)
    const requestedDate = request.nextUrl.searchParams.get('date')

    const editions = isAdmin
      ? await db.select().from(epaperEditions).orderBy(desc(epaperEditions.editionDate))
      : await db.select().from(epaperEditions).where(eq(epaperEditions.status, 'published')).orderBy(desc(epaperEditions.editionDate))

    let edition = requestedId
      ? editions.find((item) => item.id === requestedId)
      : requestedDate
      ? editions.find((item) => item.editionDate === requestedDate)
      : editions[0]

    if (!edition && editions.length) edition = editions[0]

    if (!edition) {
      return NextResponse.json({ editions, current: null }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const pages = await db.select().from(epaperPages).where(eq(epaperPages.editionId, edition.id)).orderBy(asc(epaperPages.pageNumber))
    const allRegions = pages.length ? await db.select().from(epaperRegions).where(inArray(epaperRegions.pageId, pages.map((page) => page.id))) : []
    const regions = pages.length ? allRegions.filter((region) => region.pageId === pages[0].id) : []

    const articleIds = Array.from(new Set(allRegions.map((r) => r.articleId).filter((id): id is number => typeof id === 'number' && id > 0)))
    const linkedArticles = articleIds.length
      ? await db.select({
          id: newsArticles.id,
          titleBn: newsArticles.titleBn,
          excerptBn: newsArticles.excerptBn,
          authorName: newsArticles.authorName,
          imageUrl: newsArticles.imageUrl,
          publishedAt: newsArticles.publishedAt
        }).from(newsArticles).where(inArray(newsArticles.id, articleIds))
      : []

    const articles = isAdmin
      ? await db.select({ id: newsArticles.id, titleBn: newsArticles.titleBn }).from(newsArticles).orderBy(desc(newsArticles.createdAt))
      : []

    return NextResponse.json(
      {
        editions,
        current: { edition, pages, regions, allRegions, linkedArticles },
        articles
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('Epaper GET error:', error)
    return NextResponse.json({ error: error?.message || 'Error loading epaper' }, { status: 500 })
  }
}