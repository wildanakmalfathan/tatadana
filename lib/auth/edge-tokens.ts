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
 * Base64URL decode helper for Edge runtime
 */
function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) {
    b64 += '='
  }
  return atob(b64)
}

/**
 * Verifies session token in Edge Runtime using standard Web Crypto API (crypto.subtle)
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
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    let b64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/')
    while (b64Sig.length % 4 !== 0) b64Sig += '='
    const binarySig = Uint8Array.from(atob(b64Sig), (c) => c.charCodeAt(0))
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`)

    const isValid = await crypto.subtle.verify('HMAC', key, binarySig, data)
    if (!isValid) return null

    const payloadRaw = base64UrlDecode(encodedPayload)
    const payloadJson = decodeURIComponent(
      payloadRaw
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
