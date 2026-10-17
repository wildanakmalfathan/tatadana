import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PersistentStore, OFFICIAL_SUPERADMIN_ID, OFFICIAL_ADMIN_EMAIL, StoredUser } from '@/lib/db/store'
import { extractSessionToken, verifySessionToken } from '@/lib/auth/tokens'

export const SUPERADMIN_ID = OFFICIAL_SUPERADMIN_ID

export interface AdminAuthResult {
  authorized: boolean
  user?: StoredUser
  adminId?: string
  error?: string
  statusCode?: number
}

/**
 * Validates whether the incoming request is authorized with genuine Admin privileges.
 * 
 * Zero-Trust Rules:
 * 1. Client header spoofing (x-admin-role, x-admin-id, Authorization: Bearer admin-token) is strictly REJECTED.
 * 2. Body parameter spoofing (body.admin_role, body.admin_id) is completely ignored and rejected.
 * 3. Requires a valid cryptographic HMAC-SHA256 session token from cookie or Authorization header.
 * 4. Token payload must declare role === 'admin' and email === 'wildanakmalfathan@gmail.com'.
 * 5. Backed by persistent database verification: user.role === 'admin' && user.status === 'active'.
 * 6. Non-admin or unauthenticated requests return authorized: false with HTTP 403 status code.
 */
export async function verifyAdminAuthorization(
  req: Request,
  _body?: any
): Promise<AdminAuthResult> {
  // Reject explicit non-admin role header
  const userRoleHeader = req.headers.get('x-user-role')
  if (userRoleHeader && userRoleHeader !== 'admin') {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Akses ditolak: Memerlukan hak akses Admin',
    }
  }

  // 1. Verify cryptographically signed session token from cookie or Bearer header
  const token = extractSessionToken(req)
  if (token) {
    const payload = verifySessionToken(token)
    if (
      payload &&
      payload.role === 'admin' &&
      payload.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase()
    ) {
      const user =
        PersistentStore.findUserById(payload.userId) ||
        PersistentStore.findUserByEmail(payload.email)

      if (
        user &&
        user.role === 'admin' &&
        user.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase() &&
        user.status === 'active'
      ) {
        return {
          authorized: true,
          user,
          adminId: user.id,
        }
      }
    }
  }

  // 2. Fallback: Supabase Server Session verification (only if token cookie is Supabase auth cookie)
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && user.email?.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase()) {
      const dbUser =
        PersistentStore.findUserById(user.id) ||
        PersistentStore.findUserByEmail(user.email)
      if (
        dbUser &&
        dbUser.role === 'admin' &&
        dbUser.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase() &&
        dbUser.status === 'active'
      ) {
        return {
          authorized: true,
          user: dbUser,
          adminId: dbUser.id,
        }
      }
    }
  } catch {
    // Supabase session retrieval skipped if offline or without cookies
  }

  // Default-Deny: Reject all unauthenticated or non-admin requests
  return {
    authorized: false,
    statusCode: 403,
    error: 'Akses ditolak: Memerlukan hak akses Admin',
  }
}

/**
 * Alias for verifyAdminAuthorization for interface compliance
 */
export async function verifyAdminSession(req: Request): Promise<AdminAuthResult> {
  return verifyAdminAuthorization(req)
}

/**
 * Higher-order function wrapper to require admin authorization on route handlers
 */
export function requireAdmin(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const auth = await verifyAdminAuthorization(req)
    if (!auth.authorized) {
      return forbiddenAdminResponse(auth.error)
    }
    return handler(req, ...args, auth)
  }
}

/**
 * Standard HTTP 403 Forbidden Response for unauthorized admin access
 */
export function forbiddenAdminResponse(
  errorMessage = 'Akses ditolak: Memerlukan hak akses Admin'
) {
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      message: errorMessage,
    },
    { status: 403 }
  )
}
