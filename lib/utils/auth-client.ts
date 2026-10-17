/**
 * Client-side authentication helpers for TataDana Dashboard
 * Guarantees Bearer Authorization token and session cookies are sent on every request.
 */

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders }
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('tatadana_session') ||
      localStorage.getItem('tatadana_admin_session')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const customHeaders = (init.headers as Record<string, string>) || {}
  const headers = getAuthHeaders(customHeaders)
  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })
}
