import { auth } from '@clerk/nextjs/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

/** Thrown when the API responds with a non-2xx status; carries the status code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Server-side fetch to the API with the current user's Clerk session token
 * attached as a Bearer header. Use from server components / route handlers.
 *
 * Returns the parsed JSON body on success; throws `ApiError` (with the status)
 * on a non-2xx response so callers can branch on, e.g., 401 vs 404.
 */
export async function serverApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { getToken } = await auth()
  const token = await getToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store', // always fresh — this is per-user, auth'd data
  })

  if (!res.ok) {
    throw new ApiError(res.status, `API responded ${res.status} for ${path}`)
  }

  return res.json() as Promise<T>
}
