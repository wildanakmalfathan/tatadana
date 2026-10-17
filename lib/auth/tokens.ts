import nodeCrypto from 'crypto'

export interface SessionPayload {
  userId: string
  email: string
  name: string
  role: 'user' | 'admin'
  plan: 'starter' | 'pro' | 'pro_lifetime'
  status?: 'active' | 'pending_approval' | 'rejected' | 'suspended'
  iat?: number
  exp?: number
}

export const DEFAULT_SECRET = process.env.SESSION_SECRET || 'tatadana-super-secure-production-jwt-key-2026-indonesia'

/**
 * Base64URL encode buffer/string
 */
function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * Base64URL decode to string
 */
function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf-8')
}

/**
 * Generates a cryptographically signed HMAC-SHA256 session token (JWT structure)
 */
export function generateSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  options?: { expiresInSeconds?: number }
): string {
  const now = Math.floor(Date.now() / 1000)
  // Default user session: 7 days (604800 seconds); default admin: 24 hours (86400 seconds)
  const defaultExpiry = payload.role === 'admin' ? 86400 : 604800
  const expiresIn = options?.expiresInSeconds || defaultExpiry

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))

  const signature = nodeCrypto
    .createHmac('sha256', DEFAULT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()
  const encodedSignature = base64UrlEncode(signature)

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

/**
 * Verifies the signature and expiration of a session token (Node.js runtime)
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts

  try {
    const expectedSignature = nodeCrypto
      .createHmac('sha256', DEFAULT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest()
    const expectedEncoded = base64UrlEncode(expectedSignature)

    if (
      expectedEncoded.length !== encodedSignature.length ||
      !nodeCrypto.timingSafeEqual(Buffer.from(expectedEncoded), Buffer.from(encodedSignature))
    ) {
      return null
    }

    const payloadJson = base64UrlDecode(encodedPayload)
    const payload: SessionPayload = JSON.parse(payloadJson)

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Verifies the signature and expiration of a session token using standard Web Crypto API (Edge & Node compatible)
 */
export async function verifySessionTokenEdge(
  token: string,
  secret: string = DEFAULT_SECRET
): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts

  try {
    const encoder = new TextEncoder()
    const cryptoSubtle = typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : (nodeCrypto as any).webcrypto?.subtle
    if (!cryptoSubtle) {
      return verifySessionToken(token)
    }

    const key = await cryptoSubtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    let b64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4 !== 0) b64 += '='
    const binarySig = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`)

    const isValid = await cryptoSubtle.verify('HMAC', key, binarySig, data)
    if (!isValid) return null

    let payloadB64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    while (payloadB64.length % 4 !== 0) payloadB64 += '='
    const payloadJson = decodeURIComponent(
      atob(payloadB64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload: SessionPayload = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Extracts a session token from an incoming HTTP Request
 * Inspects: Authorization Header, x-session-token, or HTTP Cookies
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization')
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (token) return token
  }

  // 2. Custom headers
  const sessionHeader = req.headers.get('x-session-token')
  if (sessionHeader && sessionHeader.trim()) {
    return sessionHeader.trim()
  }

  const adminTokenHeader = req.headers.get('x-admin-token')
  if (adminTokenHeader && adminTokenHeader.includes('.')) {
    return adminTokenHeader.trim()
  }

  // 3. Cookie header inspection
  const cookieHeader = req.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim())
    for (const cookie of cookies) {
      if (cookie.startsWith('tatadana_admin_session=')) {
        return cookie.substring('tatadana_admin_session='.length)
      }
      if (cookie.startsWith('tatadana_session=')) {
        return cookie.substring('tatadana_session='.length)
      }
    }
  }

  return null
}
