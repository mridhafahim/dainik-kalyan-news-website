import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { mediaAssets } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'

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

    // 1. Vercel Blob থাকলে
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`news/${filename}`, file, { access: 'public', addRandomSuffix: true })
        fileUrl = blob.url
      } catch (err) {
        console.warn('Blob upload failed, falling back to Data URL:', err)
      }
    }

    // 2. শতভাগ নিরাপদ Base64 Data URL (যা লোকালহোস্ট ও Netlify-তে কখনো 404 হবে না)
    if (!fileUrl) {
      const buffer = Buffer.from(await file.arrayBuffer())
      fileUrl = `data:${file.type};base64,${buffer.toString('base64')}`
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