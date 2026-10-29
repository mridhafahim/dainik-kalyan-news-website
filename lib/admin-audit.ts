import { db } from '@/lib/db'
import { adminAuditLogs } from '@/lib/db/schema'

export async function recordAdminAudit(input: { actorUserId: string; action: string; resourceType: string; resourceId?: number | string | null; metadata?: Record<string, unknown> }) {
  try {
    await db.insert(adminAuditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId == null ? null : String(input.resourceId),
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    console.error('[admin-audit] failed to record audit event', error)
  }
}
