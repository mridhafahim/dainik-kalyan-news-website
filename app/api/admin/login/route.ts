import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { createAdminSession, getAdminCredentials } from '@/lib/admin-session'

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
    const userId = String(body.userId || body.adminId || '').trim().toLowerCase()
    const password = String(body.password || '').trim()

    if (!userId || !password) {
      return NextResponse.json({ error: 'আইডি ও পাসওয়ার্ড প্রদান করুন' }, { status: 400 })
    }

    let authenticatedRole: 'super_admin' | 'moderator' = 'moderator'
    let matchedUserId = userId

    // ১. প্রথমে .env.local-এর সুপার অ্যাডমিন ক্রেডেনশিয়াল চেক করা
    try {
      const superCredentials = getAdminCredentials()
      if (
        superCredentials.adminId.toLowerCase() === userId &&
        superCredentials.password === password
      ) {
        authenticatedRole = 'super_admin'
      }
    } catch {}

    // ২. যদি সুপার অ্যাডমিন না হয়, তবে ডেটাবেসের admin_users টেবিলে মডারেটর খোঁজা
    if (authenticatedRole !== 'super_admin') {
      const [dbUser] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.userId, userId))
        .limit(1)

      if (!dbUser || dbUser.status !== 'active') {
        return NextResponse.json({ error: 'ভুল ইউজার আইডি অথবা একাউন্ট নিষ্ক্রিয়' }, { status: 401 })
      }

      // পাসওয়ার্ড হ্যাশ মিলিয়ে দেখা
      const inputHash = await hashPassword(password)
      if (dbUser.passwordHash !== inputHash && dbUser.passwordHash !== password) {
        return NextResponse.json({ error: 'ভুল পাসওয়ার্ড' }, { status: 401 })
      }

      authenticatedRole = (dbUser.role as any) === 'super_admin' ? 'super_admin' : 'moderator'
      matchedUserId = dbUser.userId

      // লাস্ট লগইন টাইম আপডেট
      void db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, dbUser.id)).catch(() => {})
    }

    // সেশন তৈরি করা
    const sessionToken = await createAdminSession(matchedUserId, authenticatedRole)

    const response = NextResponse.json({
      ok: true,
      role: authenticatedRole,
      message: 'লগইন সফল হয়েছে'
    })

    // সিকিউর সেশন কুকি সেট করা
    response.cookies.set('__Host-admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4 // ৪ ঘণ্টা
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'লগইন করতে সমস্যা হয়েছে' }, { status: 500 })
  }
}