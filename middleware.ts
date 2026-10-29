import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE, validateAdminSession } from '@/lib/admin-session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPanel = path === '/dainik-kalyan-control-panel' || path.startsWith('/dainik-kalyan-control-panel/')
  const isLogin = path === '/dainik-kalyan-control-panel/login'
  const isAdminApi = path.startsWith('/api/admin/')
  const isLoginApi = path === '/api/admin/login'
  const hasValidSession = await validateAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)

  if (isAdminApi && !isLoginApi && !hasValidSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isPanel && !isLogin && !hasValidSession) return NextResponse.redirect(new URL('/dainik-kalyan-control-panel/login', request.url))
  if (isPanel && hasValidSession?.mustChangePassword && path !== '/dainik-kalyan-control-panel/dashboard/change-password') return NextResponse.redirect(new URL('/dainik-kalyan-control-panel/dashboard/change-password', request.url))
  if (isLogin && hasValidSession) return NextResponse.redirect(new URL('/dainik-kalyan-control-panel/dashboard', request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/dainik-kalyan-control-panel/:path*', '/api/admin/:path*'] }
