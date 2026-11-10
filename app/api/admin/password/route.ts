import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers, siteSettings } from '@/lib/db/schema'

async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action // 'request_code' অথবা 'reset_password'
    const userId = String(body.userId || '').trim().toLowerCase()

    if (!userId) return NextResponse.json({ error: 'মডারেটর ইউজার আইডি আবশ্যক' }, { status: 400 })

    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId)).limit(1)
    if (!user) return NextResponse.json({ error: 'এই আইডির কোনো মডারেটর পাওয়া যায়নি' }, { status: 404 })

    if (user.role === 'super_admin') {
      return NextResponse.json({ error: 'সুপার অ্যাডমিনের জন্য এই রিসেট প্রযোজ্য নয়' }, { status: 403 })
    }

    // ১. মডারেটরের কোডের অনুরোধ (Request Code)
    if (action === 'request_code') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiry = Date.now() + 15 * 60 * 1000 // ১৫ মিনিট

      // সুপার অ্যাডমিনের ড্যাশবোর্ডে দেখার জন্য সেভ
      await db
        .insert(siteSettings)
        .values({
          key: `reset_otp_${userId}`,
          value: JSON.stringify({ code: otpCode, expiry, requestedAt: new Date().toISOString() }),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: JSON.stringify({ code: otpCode, expiry, requestedAt: new Date().toISOString() }),
            updatedAt: new Date()
          }
        })

      return NextResponse.json({
        ok: true,
        message: 'কোডটি সুপার অ্যাডমিনের ড্যাশবোর্ডে পাঠানো হয়েছে। সুপার অ্যাডমিনের থেকে কোডটি সংগ্রহ করুন।'
      })
    }

    // ২. কোড ভেরিফাই ও নতুন পাসওয়ার্ড সেট (Reset Password)
    if (action === 'reset_password') {
      const code = String(body.code || '').trim()
      const newPassword = String(body.newPassword || '').trim()

      if (!code || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'সঠিক কোড ও কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড দিন' }, { status: 400 })
      }

      const [storedSetting] = await db.select().from(siteSettings).where(eq(siteSettings.key, `reset_otp_${userId}`)).limit(1)
      if (!storedSetting) return NextResponse.json({ error: 'কোনো কোডের অনুরোধ পাওয়া যায়নি' }, { status: 400 })

      const otpData = JSON.parse(storedSetting.value)
      if (Date.now() > otpData.expiry) {
        return NextResponse.json({ error: 'কোডের মেয়াদ শেষ হয়ে গেছে। পুনরায় অনুরোধ করুন।' }, { status: 400 })
      }

      if (otpData.code !== code) {
        return NextResponse.json({ error: 'ভুল ওটিপি কোড!' }, { status: 400 })
      }

      // পাসওয়ার্ড আপডেট
      const newHash = await hashPassword(newPassword)
      await db.update(adminUsers).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(adminUsers.id, user.id))
      await db.delete(siteSettings).where(eq(siteSettings.key, `reset_otp_${userId}`))

      return NextResponse.json({ ok: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এবার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'প্রসেস করতে সমস্যা হয়েছে' }, { status: 500 })
  }
}

// সুপার অ্যাডমিন ড্যাশবোর্ডে কোড দেখানোর GET API
export async function GET() {
  try {
    const settings = await db.select().from(siteSettings)
    const resetRequests = settings
      .filter(s => s.key.startsWith('reset_otp_'))
      .map(s => {
        const userId = s.key.replace('reset_otp_', '')
        try {
          const val = JSON.parse(s.value)
          return { userId, code: val.code, expiry: val.expiry, active: Date.now() <= val.expiry }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return NextResponse.json({ resetRequests })
  } catch {
    return NextResponse.json({ resetRequests: [] })
  }
}