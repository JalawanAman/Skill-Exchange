/**
 * Shared CORS origin policy for both the REST API and the socket server.
 *
 * Allowed: localhost (any port, for dev), an explicit FRONTEND_URL if set, and
 * any *.vercel.app host — so Vercel's per-deploy hash URLs, branch aliases, and
 * the production domain all work without reconfiguring on every deploy.
 *
 * Safe to be permissive here: the API authenticates every request with a Clerk
 * bearer token, so CORS is not the security boundary — auth is.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true // non-browser callers (curl, health checks, server-to-server)

  const explicit = process.env.FRONTEND_URL?.trim()
  if (explicit && origin === explicit) return true

  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

/** Origin callback compatible with both the `cors` package and socket.io's cors. */
export function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isAllowedOrigin(origin))
}
