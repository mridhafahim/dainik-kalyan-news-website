// import { NextRequest, NextResponse } from 'next/server'
// import { desc, eq } from 'drizzle-orm'
// import { db } from '@/lib/db'
// import { newsVideos } from '@/lib/db/schema'
// import { requireAdmin } from '@/lib/admin-auth'
// import { recordAdminAudit } from '@/lib/admin-audit'
// const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
// function videoId(url: string) { const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/); return match?.[1] || null }
// export async function GET(request: NextRequest) { if (!await requireAdmin(request, undefined, 'news:read')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ videos: await db.select().from(newsVideos).orderBy(desc(newsVideos.createdAt)) }) }
// export async function POST(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const youtubeUrl = clean(body.youtubeUrl, 300); const id = videoId(youtubeUrl); if (!id || !clean(body.titleBn, 160)) return NextResponse.json({ error: 'বৈধ YouTube URL ও শিরোনাম প্রয়োজন' }, { status: 400 }); const [video] = await db.insert(newsVideos).values({ titleBn: clean(body.titleBn, 160), titleEn: clean(body.titleEn || body.titleBn, 160), youtubeUrl, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, status: body.status === 'draft' ? 'draft' : 'published' }).returning(); await recordAdminAudit({ actorUserId: actor.sub, action: 'video_create', resourceType: 'news_video', resourceId: video.id }); return NextResponse.json({ video }, { status: 201 }) }
// export async function PATCH(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const body = await request.json(); const id = Number(body.id); const youtubeUrl = clean(body.youtubeUrl, 300); const youtubeId = videoId(youtubeUrl); if (!Number.isInteger(id) || !youtubeId || !clean(body.titleBn, 160)) return NextResponse.json({ error: 'তথ্য সঠিক নয়' }, { status: 400 }); const [video] = await db.update(newsVideos).set({ titleBn: clean(body.titleBn, 160), titleEn: clean(body.titleEn || body.titleBn, 160), youtubeUrl, thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, status: body.status === 'draft' ? 'draft' : 'published' }).where(eq(newsVideos.id, id)).returning(); if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 }); await recordAdminAudit({ actorUserId: actor.sub, action: 'video_update', resourceType: 'news_video', resourceId: id }); return NextResponse.json({ video }) }
// export async function DELETE(request: NextRequest) { const actor = await requireAdmin(request, undefined, 'news:write'); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const id = Number(request.nextUrl.searchParams.get('id')); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 }); await db.delete(newsVideos).where(eq(newsVideos.id, id)); await recordAdminAudit({ actorUserId: actor.sub, action: 'video_delete', resourceType: 'news_video', resourceId: id }); return NextResponse.json({ ok: true }) }


import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsVideos } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

// Helper: YouTube URL থেকে ভিডিও আইডি বের করা
function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

export async function GET() {
  try {
    const videos = await db.select().from(newsVideos).orderBy(desc(newsVideos.createdAt))
    return NextResponse.json({ videos }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'ভিডিও লোড ব্যর্থ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const body = await request.json()
    const titleBn = String(body.titleBn || '').trim()
    const titleEn = String(body.titleEn || titleBn).trim()
    const youtubeUrl = String(body.youtubeUrl || '').trim()
    const status = body.status === 'draft' ? 'draft' : 'published'

    if (!titleBn) {
      return NextResponse.json({ error: 'ভিডিওর শিরোনাম আবশ্যক' }, { status: 400 })
    }
    if (!youtubeUrl) {
      return NextResponse.json({ error: 'ইউটিউব ভিডিওর URL দিন' }, { status: 400 })
    }

    const videoId = getYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'সঠিক YouTube URL দিন (যেমন: https://www.youtube.com/watch?v=...)' }, { status: 400 })
    }

    // স্বয়ংক্রিয় ইউটিউব থাম্বনেইল জেনারেট
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const standardEmbedUrl = `https://www.youtube.com/watch?v=${videoId}`

    const [video] = await db
      .insert(newsVideos)
      .values({
        titleBn,
        titleEn,
        youtubeUrl: standardEmbedUrl,
        thumbnailUrl,
        status
      })
      .returning()

    return NextResponse.json({ video, message: 'ভিডিও সফলভাবে যুক্ত হয়েছে' }, { status: 201 })
  } catch (error) {
    console.error('Video insert error:', error)
    return NextResponse.json({ error: 'ভিডিও সংরক্ষণ ব্যর্থ হয়েছে' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'আইডি আবশ্যক' }, { status: 400 })

  try {
    await db.delete(newsVideos).where(eq(newsVideos.id, id))
    return NextResponse.json({ ok: true, message: 'ভিডিও মুছে ফেলা হয়েছে' })
  } catch {
    return NextResponse.json({ error: 'ভিডিও মুছতে ব্যর্থ' }, { status: 500 })
  }
}