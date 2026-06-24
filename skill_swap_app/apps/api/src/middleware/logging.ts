import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

/**
 * Assigns every request a correlation id (`res.locals.requestId`, also echoed
 * in the `x-request-id` response header) and logs the outcome of each request
 * once it finishes — method, path, status, and duration.
 *
 * Downstream handlers should read `res.locals.requestId` and pass it to
 * `logger.*({ requestId })` so all logs for one request stitch together.
 *
 * `/health` is skipped — Railway pings it constantly and it would drown the table.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)

  if (req.path === '/health') {
    next()
    return
  }

  const start = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - start
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    void logger[level](`${req.method} ${req.originalUrl} → ${res.statusCode}`, {
      source: 'http',
      requestId,
      context: {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        ip: req.ip,
      },
    })
  })

  next()
}
