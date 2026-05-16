import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      const { redirectToSignIn } = await import('@clerk/nextjs/server')
      return redirectToSignIn({ returnBackUrl: req.url })
    }
  }
  return
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
