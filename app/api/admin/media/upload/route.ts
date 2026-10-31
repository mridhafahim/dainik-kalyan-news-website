// import { NextRequest, NextResponse } from 'next/server'
// import { put } from '@vercel/blob'
// import { db } from '@/lib/db'
// import { mediaAssets } from '@/lib/db/schema'
// import { requireAdmin } from '@/lib/admin-auth'
// export async function POST(request: NextRequest) { const session = await requireAdmin(request, undefined, 'news:write'); if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const form = await request.formData(); const file = form.get('file'); if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 }); if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 }); if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image must be smaller than 8MB' }, { status: 400 }); const blob = await put(`news/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, file, { access: 'public', addRandomSuffix: true }); const [asset] = await db.insert(mediaAssets).values({ url: blob.url, filename: file.name.slice(0, 240), mimeType: file.type, sizeBytes: file.size, createdBy: session.sub }).returning(); return NextResponse.json({ asset }, { status: 201 }) }



import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { mediaAssets } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import fs from 'node:fs/promises'
import path from 'node:path'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'news:write')
  if (!actor) return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 403 })

  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'ছবির ফাইল আবশ্যক' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'ফাইলের আকার ১০ MB-এর মধ্যে হতে হবে' }, { status: 413 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'শুধু JPG, PNG, GIF বা WebP ছবি আপলোড করা যাবে' }, { status: 415 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || 'upload'
    const filename = `${Date.now()}-${safeName}`
    let fileUrl = ''

    // Vercel Blob token থাকলে ক্লাউডে যাবে
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`news/${filename}`, file, { access: 'public', addRandomSuffix: true })
        fileUrl = blob.url
      } catch (err) {
        console.warn('Vercel blob failed, falling back to local file storage:', err)
      }
    }

    // লোকাল ফোল্ডারে সেভ করার ফলব্যাক
    if (!fileUrl) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'news')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)
      fileUrl = `/uploads/news/${filename}`
    }

    const [asset] = await db
      .insert(mediaAssets)
      .values({
        url: fileUrl,
        filename: file.name.slice(0, 240),
        mimeType: file.type,
        sizeBytes: file.size,
        createdBy: actor.sub
      })
      .returning()

    return NextResponse.json({ asset, url: fileUrl }, { status: 201 })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: 'ছবি আপলোড করতে ব্যর্থ হয়েছে' }, { status: 500 })
  }
}