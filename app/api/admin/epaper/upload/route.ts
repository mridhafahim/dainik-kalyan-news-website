import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdmin } from '@/lib/admin-auth'
import { recordAdminAudit } from '@/lib/admin-audit'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request, undefined, 'epaper:write')
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'ফাইল আবশ্যক' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'ফাইলের আকার ২৫ MB-এর মধ্যে হতে হবে' }, { status: 413 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'শুধু PDF বা ছবি আপলোড করা যাবে' }, { status: 415 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || 'upload'
  const filename = `${Date.now()}-${safeName}`
  let fileUrl = ''

  // 1. যদি Vercel Blob token থাকে
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`epaper/${filename}`, file, { access: 'public', addRandomSuffix: true })
      fileUrl = blob.url
    } catch (err) {
      console.warn('Blob upload failed, falling back to database data URL:', err)
    }
  }

  // 2. Netlify ও সার্ভারলেসের জন্য Base64 Data URL (যা কোনো ফাইলসিস্টেম ছাড়াই কাজ করে)
  if (!fileUrl) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      fileUrl = `data:${file.type};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('Data URL conversion error:', err)
      return NextResponse.json({ error: 'ছবি প্রসেস করতে ব্যর্থ হয়েছে' }, { status: 500 })
    }
  }

  await recordAdminAudit({
    actorUserId: actor.sub,
    action: 'epaper_upload',
    resourceType: 'epaper_asset',
    metadata: { contentType: file.type, bytes: file.size }
  })

  return NextResponse.json({ url: fileUrl, pathname: filename, contentType: file.type })
}