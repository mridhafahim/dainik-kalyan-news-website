import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, validateAdminSession } from '@/lib/admin-session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ড্যাশবোর্ড প্রোটেকশন চেক
  if (path.startsWith('/dainik-kalyan-control-panel/dashboard')) {
    const token =
      request.cookies.get('admin_session')?.value ||
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value

    const session = await validateAdminSession(token)

    // সেশন না থাকলে লগইনে পাঠাবে
    if (!session) {
      return NextResponse.redirect(new URL('/dainik-kalyan-control-panel/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dainik-kalyan-control-panel/dashboard/:path*']
}