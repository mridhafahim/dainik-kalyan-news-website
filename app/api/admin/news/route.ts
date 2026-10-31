import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsArticles, articleCategories } from '@/lib/db/schema'
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

    // একাধিক ক্যাটাগরি প্রসেসিং
    const rawCategoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : (body.categoryId ? [body.categoryId] : [])
    const categoryIds: number[] = Array.from(new Set(rawCategoryIds.map(Number).filter((n: number) => !isNaN(n) && n > 0)))
    const primaryCategoryId = categoryIds[0] || null

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

    const publishedAt = status === 'published' ? new Date() : null

    // ১. মূল আর্টিকেলে সেভ করা
    const [story] = await db
      .insert(newsArticles)
      .values({
        categoryId: primaryCategoryId,
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

    // ২. নির্বাচিত সকল ক্যাটাগরি articleCategories টেবিলে যুক্ত করা
    if (categoryIds.length > 0) {
      await db
        .insert(articleCategories)
        .values(categoryIds.map((cId: number) => ({ articleId: story.id, categoryId: cId })))
        .catch(() => {})
    }

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

    const rawCategoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : (body.categoryId ? [body.categoryId] : [])
    const categoryIds: number[] = Array.from(new Set(rawCategoryIds.map(Number).filter((n: number) => !isNaN(n) && n > 0)))

    const updateData: Partial<typeof newsArticles.$inferInsert> = {
      updatedAt: new Date()
    }

    if (body.titleBn !== undefined) updateData.titleBn = String(body.titleBn).trim()
    if (body.titleEn !== undefined) updateData.titleEn = String(body.titleEn).trim()
    if (body.excerptBn !== undefined) updateData.excerptBn = String(body.excerptBn).trim()
    if (body.bodyBn !== undefined) updateData.bodyBn = String(body.bodyBn).trim()
    if (categoryIds.length > 0) updateData.categoryId = categoryIds[0]
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

    // ক্যাটাগরিগুলো আপডেট করা
    if (body.categoryIds !== undefined) {
      await db.delete(articleCategories).where(eq(articleCategories.articleId, id)).catch(() => {})
      if (categoryIds.length > 0) {
        await db
          .insert(articleCategories)
          .values(categoryIds.map((cId: number) => ({ articleId: id, categoryId: cId })))
          .catch(() => {})
      }
    }

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
    await db.delete(articleCategories).where(eq(articleCategories.articleId, id)).catch(() => {})
    await db.delete(newsArticles).where(eq(newsArticles.id, id))
    return NextResponse.json({ ok: true, message: 'সংবাদ মুছে ফেলা হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'সংবাদ মুছতে ব্যর্থ' }, { status: 500 })
  }
}