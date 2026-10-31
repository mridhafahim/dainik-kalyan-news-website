// import { NextRequest, NextResponse } from 'next/server'
// import { desc, eq } from 'drizzle-orm'
// import { db } from '@/lib/db'
// import { articleCategories, newsArticles } from '@/lib/db/schema'
// import { requireAdmin } from '@/lib/admin-auth'
// import { recordAdminAudit } from '@/lib/admin-audit'

// const authorized = (request: NextRequest, permission = 'news:read') => requireAdmin(request, undefined, permission)
// const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
// const slugify = (value: string) => value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 180)
// const categoryIds = (value: unknown) => Array.from(new Set(Array.isArray(value) ? value.map(Number).filter(id => Number.isInteger(id) && id > 0) : []))
// function payload(body: Record<string, unknown>) { const titleBn = clean(body.titleBn, 240); const titleEn = clean(body.titleEn, 240) || titleBn; if (!titleBn) throw new Error('Headline is required'); const status = ['draft', 'published', 'scheduled'].includes(String(body.status)) ? String(body.status) : 'draft'; const publishedAt = status === 'published' ? new Date() : body.publishedAt ? new Date(String(body.publishedAt)) : null; const scheduledAt = status === 'scheduled' && body.scheduledAt ? new Date(String(body.scheduledAt)) : null; if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid schedule time'); const ids = categoryIds(body.categoryIds); return { article: { categoryId: ids[0] || Number(body.categoryId) || null, slug: clean(body.slug || slugify(titleEn), 180) || null, titleBn, titleEn, excerptBn: clean(body.excerptBn, 600), excerptEn: clean(body.excerptEn, 600), bodyBn: clean(body.bodyBn, 50000), bodyEn: clean(body.bodyEn, 50000), imageUrl: clean(body.imageUrl, 1000), authorName: clean(body.authorName || 'নিজস্ব প্রতিবেদক', 160), status, publishedAt, scheduledAt, isBreaking: Boolean(body.isBreaking), updatedAt: new Date() }, ids } }
// async function withCategories(articles: typeof newsArticles.$inferSelect[]) { const links = articles.length ? await db.select().from(articleCategories) : []; return articles.map(article => ({ ...article, categoryIds: links.filter(link => link.articleId === article.id).map(link => link.categoryId) })) }
// export async function GET(request: NextRequest) { if (!await authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ articles: await withCategories(await db.select().from(newsArticles).orderBy(desc(newsArticles.updatedAt))) }) }
// async function saveCategories(articleId: number, ids: number[]) { await db.delete(articleCategories).where(eq(articleCategories.articleId, articleId)); if (ids.length) await db.insert(articleCategories).values(ids.map(categoryId => ({ articleId, categoryId }))).onConflictDoNothing() }
// export async function POST(request: NextRequest) { const session = await authorized(request, 'news:write'); if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); try { const data = payload(await request.json()); const [article] = await db.insert(newsArticles).values(data.article).returning(); await saveCategories(article.id, data.ids); await recordAdminAudit({ actorUserId: session.sub, action: article.status === 'published' ? 'article_publish' : 'article_create', resourceType: 'news_article', resourceId: article.id, metadata: { status: article.status, categoryIds: data.ids } }); return NextResponse.json({ article }, { status: 201 }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid article' }, { status: 400 }) } }
// export async function PATCH(request: NextRequest) { const session = await authorized(request, 'news:write'); if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); try { const body = await request.json(); const id = Number(body.id); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid article id' }, { status: 400 }); const data = payload(body); const [article] = await db.update(newsArticles).set(data.article).where(eq(newsArticles.id, id)).returning(); if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 }); await saveCategories(id, data.ids); await recordAdminAudit({ actorUserId: session.sub, action: article.status === 'published' ? 'article_publish' : 'article_update', resourceType: 'news_article', resourceId: id, metadata: { status: article.status, categoryIds: data.ids } }); return NextResponse.json({ article }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid article' }, { status: 400 }) } }
// export async function DELETE(request: NextRequest) { const session = await authorized(request, 'news:write'); if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const id = Number(request.nextUrl.searchParams.get('id')); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid article id' }, { status: 400 }); await db.delete(articleCategories).where(eq(articleCategories.articleId, id)); await db.delete(newsArticles).where(eq(newsArticles.id, id)); await recordAdminAudit({ actorUserId: session.sub, action: 'article_delete', resourceType: 'news_article', resourceId: id }); return NextResponse.json({ ok: true }) }


import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsArticles } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const stories = await db.select().from(newsArticles).orderBy(desc(newsArticles.createdAt))
    return NextResponse.json({ stories }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'সংবাদ তালিকা লোড ব্যর্থ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const titleBn = String(body.titleBn || '').trim()
    const titleEn = String(body.titleEn || titleBn).trim()
    const excerptBn = String(body.excerptBn || '').trim()
    const bodyBn = String(body.bodyBn || '').trim()
    const categoryId = body.categoryId ? Number(body.categoryId) : null
    const imageUrl = String(body.imageUrl || '').trim()
    const authorName = String(body.authorName || 'নিজস্ব প্রতিবেদক').trim()
    const status = body.status === 'draft' ? 'draft' : 'published'
    const isBreaking = Boolean(body.isBreaking)

    if (!titleBn) {
      return NextResponse.json({ error: 'সংবাদের শিরোনাম আবশ্যক' }, { status: 400 })
    }

    const baseSlug = (body.slug || titleEn || `news-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100)
    const slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`

    // CRITICAL: স্ট্যাটাস published হলে সাথে সাথে বর্তমান টাইমস্ট্যাম্প দেওয়া
    const publishedAt = status === 'published' ? new Date() : null

    const [story] = await db
      .insert(newsArticles)
      .values({
        categoryId,
        slug,
        titleBn,
        titleEn,
        excerptBn: excerptBn || bodyBn.slice(0, 200),
        excerptEn: excerptBn || bodyBn.slice(0, 200),
        bodyBn,
        bodyEn: bodyBn,
        imageUrl,
        authorName,
        status,
        isBreaking,
        publishedAt,
        updatedAt: new Date()
      })
      .returning()

    return NextResponse.json({ story, message: 'সংবাদ সফলভাবে সংরক্ষিত ও প্রকাশিত হয়েছে' }, { status: 201 })
  } catch (error) {
    console.error('News creation error:', error)
    return NextResponse.json({ error: 'সংবাদ সংরক্ষণ ব্যর্থ হয়েছে' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ error: 'সংবাদ আইডি আবশ্যক' }, { status: 400 })

    const updateData: Partial<typeof newsArticles.$inferInsert> = {
      updatedAt: new Date()
    }

    if (body.titleBn !== undefined) updateData.titleBn = String(body.titleBn).trim()
    if (body.titleEn !== undefined) updateData.titleEn = String(body.titleEn).trim()
    if (body.excerptBn !== undefined) updateData.excerptBn = String(body.excerptBn).trim()
    if (body.bodyBn !== undefined) updateData.bodyBn = String(body.bodyBn).trim()
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId ? Number(body.categoryId) : null
    if (body.imageUrl !== undefined) updateData.imageUrl = String(body.imageUrl).trim()
    if (body.authorName !== undefined) updateData.authorName = String(body.authorName).trim()
    if (body.isBreaking !== undefined) updateData.isBreaking = Boolean(body.isBreaking)

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'published') {
        updateData.publishedAt = new Date()
      }
    }

    const [story] = await db
      .update(newsArticles)
      .set(updateData)
      .where(eq(newsArticles.id, id))
      .returning()

    return NextResponse.json({ story, message: 'সংবাদ আপডেট হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'সংবাদ আপডেট ব্যর্থ' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'আইডি আবশ্যক' }, { status: 400 })

  try {
    await db.delete(newsArticles).where(eq(newsArticles.id, id))
    return NextResponse.json({ ok: true, message: 'সংবাদ মুছে ফেলা হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'সংবাদ মুছতে ব্যর্থ' }, { status: 500 })
  }
}