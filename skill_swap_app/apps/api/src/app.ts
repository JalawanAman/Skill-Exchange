import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { clerkMiddleware } from '@clerk/express'
import { webhookRoutes } from './routes/webhooks'
import { userRoutes } from './routes/users'
import { skillRoutes } from './routes/skills'
import { availabilityRoutes } from './routes/availability'
import { requestLogger } from './middleware/logging'
import { logger } from './lib/logger'

const app: Express = express()

// Trust Railway/Render proxy — required for rate limiter and real IP detection
app.set('trust proxy', 1)

// Request logging + correlation id — first, so every request is captured
app.use(requestLogger)

// Security headers
app.use(helmet())

// CORS — frontend only
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)

// Rate limiting — 100 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Webhooks must receive raw body for Svix signature verification — registered before JSON parser
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes)

// Body parsing for all other routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check — before Clerk middleware, no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Clerk auth middleware
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}))

// Routes — added per milestone
app.use('/api/users', userRoutes)
app.use('/api/skills', skillRoutes)
app.use('/api/availability', availabilityRoutes)
// app.use('/api/matches', matchRoutes)
// app.use('/api/conversations', conversationRoutes)
// app.use('/api/sessions', sessionRoutes)
// app.use('/api/credits', creditRoutes)
// app.use('/api/reviews', reviewRoutes)
// app.use('/api/notifications', notificationRoutes)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' })
})

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void logger.exception('unhandled error', err, {
    source: 'http',
    requestId: res.locals.requestId as string | undefined,
    context: { method: req.method, path: req.originalUrl },
  })
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
})

export { app }
