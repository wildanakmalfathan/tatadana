import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionTokenEdge } from './lib/auth/edge-tokens'

const OFFICIAL_ADMIN_EMAIL = 'wildanakmalfathan@gmail.com'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow unauthenticated access to admin login page and its assets
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next()
  }

  // 2. Intercept all /admin/* routes with Default-Deny posture
  if (pathname.startsWith('/admin')) {
    // Extract token from cookies or Authorization header
    const adminCookie = request.cookies.get('tatadana_admin_session')?.value
    const sessionCookie = request.cookies.get('tatadana_session')?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader && /^Bearer\s+/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '').trim() : null

    const token = adminCookie || bearerToken || sessionCookie

    if (!token) {
      // Unauthenticated -> Redirect immediately to admin login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Cryptographic token verification in Edge Runtime (pure Web Crypto API)
    const payload = await verifySessionTokenEdge(token)

    if (!payload || payload.role !== 'admin' || payload.email !== OFFICIAL_ADMIN_EMAIL) {
      // Authenticated as non-admin or tampered token -> Reject access
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(loginUrl)
    }

    // Valid superadmin session -> Allow proceeding
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
