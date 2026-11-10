import { NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE, validateAdminSession, AdminRole } from './admin-session'

export async function requireAdmin(request: NextRequest, requiredRole?: AdminRole, requiredPermission?: string) {
  // উভয় কুকি চেক করা (লোকালহোস্ট ও প্রোডাকশন)
  const token =
    request.cookies.get('admin_session')?.value ||
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  const session = await validateAdminSession(token)
  if (!session) return null

  if (requiredRole && session.role !== 'super_admin' && session.role !== requiredRole) {
    return null
  }

  return session
}