import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { clerkMiddleware } from '@clerk/express'

const app = express()

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

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Clerk auth middleware
app.use(clerkMiddleware())

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes — added per milestone
// app.use('/api/auth', authRoutes)
// app.use('/api/users', userRoutes)
// app.use('/api/skills', skillRoutes)
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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
})

export { app }
