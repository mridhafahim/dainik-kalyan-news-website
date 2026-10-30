// import { put } from '@vercel/blob'
// import { NextRequest, NextResponse } from 'next/server'
// import { requireAdmin } from '@/lib/admin-auth'
// import { recordAdminAudit } from '@/lib/admin-audit'

// const MAX_BYTES = 25 * 1024 * 1024
// const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
// export async function POST(request: NextRequest) {
//   const actor = await requireAdmin(request, undefined, 'epaper:write')
//   if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   const form = await request.formData(); const file = form.get('file')
//   if (!(file instanceof File)) return NextResponse.json({ error: 'ফাইল আবশ্যক' }, { status: 400 })
//   if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'ফাইলের আকার ২৫ MB-এর মধ্যে হতে হবে' }, { status: 413 })
//   if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'শুধু PDF বা ছবি আপলোড করা যাবে' }, { status: 415 })
//   const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || 'upload'
//   const blob = await put(`epaper/${Date.now()}-${safeName}`, file, { access: 'public', addRandomSuffix: true })
//   await recordAdminAudit({ actorUserId: actor.sub, action: 'epaper_upload', resourceType: 'epaper_asset', metadata: { contentType: file.type, bytes: file.size, pathname: blob.pathname } })
//   return NextResponse.json({ url: blob.url, pathname: blob.pathname, contentType: file.type })
// }


import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { recordAdminAudit } from '@/lib/admin-audit'
import fs from 'node:fs/promises'
import path from 'node:path'

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

  // If Vercel Blob token is configured, use it
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`epaper/${filename}`, file, { access: 'public', addRandomSuffix: true })
      fileUrl = blob.url
    } catch (err) {
      console.warn('Vercel blob failed, falling back to local file storage:', err)
    }
  }

  // Local storage fallback for localhost development
  if (!fileUrl) {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'epaper')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)
      fileUrl = `/uploads/epaper/${filename}`
    } catch (err) {
      console.error('Local file write error:', err)
      return NextResponse.json({ error: 'ছবি সেভ করতে সমস্যা হয়েছে' }, { status: 500 })
    }
  }

  await recordAdminAudit({
    actorUserId: actor.sub,
    action: 'epaper_upload',
    resourceType: 'epaper_asset',
    metadata: { contentType: file.type, bytes: file.size, pathname: fileUrl }
  })

  return NextResponse.json({ url: fileUrl, pathname: fileUrl, contentType: file.type })
}