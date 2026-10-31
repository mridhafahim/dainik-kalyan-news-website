// import { NextRequest, NextResponse } from 'next/server'
// import { asc, eq } from 'drizzle-orm'
// import { db } from '@/lib/db'
// import { newsArticles, newsCategories } from '@/lib/db/schema'
// import { requireAdmin } from '@/lib/admin-auth'
// const authorized = (request: NextRequest, permission = 'news:read') => requireAdmin(request, undefined, permission)
// const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
// export async function GET(request: NextRequest) { if (!await authorized(request, request.method === 'GET' ? 'news:read' : 'news:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ categories: await db.select().from(newsCategories).orderBy(asc(newsCategories.sortOrder), asc(newsCategories.nameBn)) }) }
// export async function POST(request: NextRequest) { if (!await authorized(request, request.method === 'GET' ? 'news:read' : 'news:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const nameBn = clean(body.nameBn, 100); const slug = clean(body.slug || nameBn.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, ''), 100).toLowerCase(); if (!nameBn || !slug || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'নাম ও বৈধ slug প্রয়োজন' }, { status: 400 }); try { const [category] = await db.insert(newsCategories).values({ nameBn, nameEn: clean(body.nameEn || nameBn, 100), slug, sortOrder: Number(body.sortOrder) || 0 }).returning(); return NextResponse.json({ category }, { status: 201 }) } catch { return NextResponse.json({ error: 'এই slug ইতিমধ্যে ব্যবহৃত হয়েছে' }, { status: 409 }) } }
// export async function PATCH(request: NextRequest) { if (!await authorized(request, request.method === 'GET' ? 'news:read' : 'news:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const id = Number(body.id); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 }); const [category] = await db.update(newsCategories).set({ nameBn: clean(body.nameBn, 100), nameEn: clean(body.nameEn, 100), slug: clean(body.slug, 100).toLowerCase(), sortOrder: Number(body.sortOrder) || 0 }).where(eq(newsCategories.id, id)).returning(); return category ? NextResponse.json({ category }) : NextResponse.json({ error: 'Not found' }, { status: 404 }) }
// export async function DELETE(request: NextRequest) { if (!await authorized(request, request.method === 'GET' ? 'news:read' : 'news:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const id = Number(request.nextUrl.searchParams.get('id')); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 }); await db.update(newsArticles).set({ categoryId: null }).where(eq(newsArticles.categoryId, id)); await db.delete(newsCategories).where(eq(newsCategories.id, id)); return NextResponse.json({ ok: true }) }

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsCategories } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

// GET: সব ক্যাটাগরি লোড করা
export async function GET() {
  try {
    const categories = await db
      .select()
      .from(newsCategories)
      .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.nameBn))
    return NextResponse.json({ categories }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'ক্যাটাগরি লোড ব্যর্থ' }, { status: 500 })
  }
}

// POST: নতুন ক্যাটাগরি তৈরি করা
export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const nameBn = String(body.nameBn || '').trim()
    const nameEn = String(body.nameEn || '').trim()
    let slug = String(body.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')

    const sortOrder = Number(body.sortOrder) || 0

    if (!nameBn) {
      return NextResponse.json({ error: 'বাংলা নাম আবশ্যক' }, { status: 400 })
    }

    // ইংরেজি নাম না দিলে বা স্লাগ না দিলে স্বয়ংক্রিয় স্লাগ তৈরি
    if (!slug) {
      slug = nameEn
        ? nameEn.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        : `cat-${Date.now()}`
    }

    // স্লাগ ডুপ্লিকেট কি না চেক করা
    const existing = await db
      .select({ id: newsCategories.id })
      .from(newsCategories)
      .where(eq(newsCategories.slug, slug))
      .limit(1)

    if (existing.length > 0) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`
    }

    const [category] = await db
      .insert(newsCategories)
      .values({
        nameBn,
        nameEn: nameEn || nameBn,
        slug,
        sortOrder
      })
      .returning()

    return NextResponse.json({ category, message: 'ক্যাটাগরি সফলভাবে যুক্ত হয়েছে' }, { status: 201 })
  } catch (error) {
    console.error('Category insert error:', error)
    return NextResponse.json({ error: 'ডেটাবেসে ক্যাটাগরি সংরক্ষণ ব্যর্থ হয়েছে' }, { status: 500 })
  }
}

// DELETE: ক্যাটাগরি ডিলিট করা
export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, 'super_admin', 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))

  if (!id) return NextResponse.json({ error: 'আইডি আবশ্যক' }, { status: 400 })

  try {
    await db.delete(newsCategories).where(eq(newsCategories.id, id))
    return NextResponse.json({ ok: true, message: 'ক্যাটাগরি ডিলিট করা হয়েছে' })
  } catch (error) {
    return NextResponse.json({ error: 'ক্যাটাগরি মুছতে ব্যর্থ' }, { status: 500 })
  }
}