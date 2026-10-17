import { NextResponse } from 'next/server'
import { PersistentStore } from '@/lib/db/store'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    let userId: string | null = null
    const token = extractSessionToken(req)
    if (token) {
      const payload = verifySessionToken(token)
      if (payload?.userId) userId = payload.userId
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan untuk heartbeat.' },
        { status: 401 }
      )
    }

    // Touch user heartbeat in persistent store
    PersistentStore.touchUserHeartbeat(userId)

    const activeUsers = PersistentStore.getActiveUsersCount(90)

    return NextResponse.json({
      success: true,
      message: 'Heartbeat tercatat.',
      userId: userId,
      activeUsers,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Kesalahan saat memproses heartbeat.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  // Public or admin quick poll for active users count
  const activeUsers = PersistentStore.getActiveUsersCount(90)
  return NextResponse.json({
    success: true,
    activeUsers,
    timestamp: new Date().toISOString(),
  })
}
