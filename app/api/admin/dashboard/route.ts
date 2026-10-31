import { NextResponse } from 'next/server'
import { count, eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsArticles, newsCategories, newsVideos, epaperEditions } from '@/lib/db/schema'

export async function GET() {
  try {
    const [
      totalNewsRes,
      breakingNewsRes,
      draftsRes,
      categoriesRes,
      videosRes,
      epaperRes,
      totalViewsRes,
      topStories,
      recentStories
    ] = await Promise.all([
      db.select({ value: count() }).from(newsArticles).where(eq(newsArticles.status, 'published')),
      db.select({ value: count() }).from(newsArticles).where(and(eq(newsArticles.status, 'published'), eq(newsArticles.isBreaking, true))),
      db.select({ value: count() }).from(newsArticles).where(eq(newsArticles.status, 'draft')),
      db.select({ value: count() }).from(newsCategories),
      db.select({ value: count() }).from(newsVideos),
      db.select({ value: count() }).from(epaperEditions),
      // সকল সংবাদের মোট ভিউ যোগফল
      db.select({ total: sql<number>`COALESCE(SUM(${newsArticles.viewCount}), 0)` }).from(newsArticles),
      // সর্বাধিক পঠিত শীর্ষ ৫টি সংবাদ
      db.select({
        id: newsArticles.id,
        titleBn: newsArticles.titleBn,
        viewCount: newsArticles.viewCount,
        publishedAt: newsArticles.publishedAt
      })
      .from(newsArticles)
      .where(eq(newsArticles.status, 'published'))
      .orderBy(desc(newsArticles.viewCount))
      .limit(5),
      // সাম্প্রতিক ৮টি সংবাদ
      db.select({
        id: newsArticles.id,
        titleBn: newsArticles.titleBn,
        authorName: newsArticles.authorName,
        status: newsArticles.status,
        isBreaking: newsArticles.isBreaking,
        viewCount: newsArticles.viewCount,
        createdAt: newsArticles.createdAt
      })
      .from(newsArticles)
      .orderBy(desc(newsArticles.createdAt))
      .limit(8)
    ])

    return NextResponse.json({
      stats: {
        totalNews: Number(totalNewsRes[0]?.value || 0),
        breakingNews: Number(breakingNewsRes[0]?.value || 0),
        drafts: Number(draftsRes[0]?.value || 0),
        categories: Number(categoriesRes[0]?.value || 0),
        videos: Number(videosRes[0]?.value || 0),
        epaperEditions: Number(epaperRes[0]?.value || 0),
        totalViews: Number(totalViewsRes[0]?.total || 0)
      },
      topStories,
      recentStories
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'ড্যাশবোর্ড তথ্য লোড ব্যর্থ' }, { status: 500 })
  }
}