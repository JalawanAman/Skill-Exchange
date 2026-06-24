import { Router, Request, Response, IRouter } from 'express'
import { Webhook } from 'svix'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, creditTransactions } from '../db/schema'
import { generateId } from '../lib/ids'
import { logger } from '../lib/logger'

const router: IRouter = Router()

// Clerk sends raw body — must be parsed before this router (see app.ts)
router.post('/clerk', async (req: Request, res: Response) => {
  const requestId = res.locals.requestId as string | undefined
  const secret = process.env.CLERK_WEBHOOK_SECRET

  if (!secret) {
    void logger.error('CLERK_WEBHOOK_SECRET is not set', { source: 'webhook:clerk', requestId })
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  // Svix signature headers
  const svixId = req.headers['svix-id'] as string
  const svixTimestamp = req.headers['svix-timestamp'] as string
  const svixSignature = req.headers['svix-signature'] as string

  if (!svixId || !svixTimestamp || !svixSignature) {
    void logger.warn('webhook rejected: missing svix headers', { source: 'webhook:clerk', requestId })
    return res.status(400).json({ error: 'Missing svix headers' })
  }

  // Verify the webhook came from Clerk
  let event: { type: string; data: ClerkUserPayload }
  try {
    const wh = new Webhook(secret)
    event = wh.verify(req.body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserPayload }
  } catch (err) {
    void logger.exception('webhook rejected: signature verification failed', err, {
      source: 'webhook:clerk',
      requestId,
      context: { svixId },
    })
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  await logger.info(`webhook received: ${event.type}`, {
    source: 'webhook:clerk',
    requestId,
    context: { eventType: event.type, clerkUserId: event.data?.id },
  })

  try {
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data, requestId)
        break
      case 'user.updated':
        await handleUserUpdated(event.data, requestId)
        break
      case 'user.deleted':
        await handleUserDeleted(event.data, requestId)
        break
      default:
        void logger.debug(`webhook: ignoring unhandled event type ${event.type}`, {
          source: 'webhook:clerk',
          requestId,
        })
        break
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    // Full detail (stack + ids) goes to the logs; a short message is returned so
    // the actual cause is also visible in Clerk's webhook attempt view.
    await logger.exception(`webhook failed to process ${event.type}`, err, {
      source: 'webhook:clerk',
      requestId,
      context: { eventType: event.type, clerkUserId: event.data?.id },
    })
    return res.status(500).json({
      error: 'Failed to process webhook event',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleUserCreated(data: ClerkUserPayload, requestId?: string) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address

  if (!primaryEmail) {
    throw new Error(`No primary email found for Clerk user ${data.id}`)
  }

  const txId = generateId('ctx')
  const SIGNUP_BONUS = 20

  // Insert user + signup bonus credit transaction atomically.
  // The neon-http driver has no interactive transactions; db.batch runs both
  // statements in a single atomic request (order preserved: user before its tx).
  await db.batch([
    db.insert(users).values({
      id: data.id,
      email: primaryEmail,
      displayName: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
      avatarUrl: data.image_url || null,
      creditBalance: SIGNUP_BONUS,
      isOnboarded: false,
    }),
    db.insert(creditTransactions).values({
      id: txId,
      userId: data.id,
      type: 'signup_bonus',
      amount: SIGNUP_BONUS,
      balanceAfter: SIGNUP_BONUS,
      description: 'Welcome bonus on signup',
    }),
  ])

  void logger.info('user created + signup bonus granted', {
    source: 'webhook:clerk',
    requestId,
    context: { clerkUserId: data.id, email: primaryEmail, creditsGranted: SIGNUP_BONUS },
  })
}

async function handleUserUpdated(data: ClerkUserPayload, requestId?: string) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address

  await db
    .update(users)
    .set({
      email: primaryEmail,
      displayName: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
      avatarUrl: data.image_url || undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.id))

  void logger.info('user updated', {
    source: 'webhook:clerk',
    requestId,
    context: { clerkUserId: data.id, email: primaryEmail },
  })
}

async function handleUserDeleted(data: ClerkUserPayload, requestId?: string) {
  await db.delete(users).where(eq(users.id, data.id))
  void logger.info('user deleted', {
    source: 'webhook:clerk',
    requestId,
    context: { clerkUserId: data.id },
  })
}

// ─── Clerk payload type ───────────────────────────────────────────────────────

interface ClerkUserPayload {
  id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
  primary_email_address_id: string
  email_addresses: { id: string; email_address: string }[]
}

export { router as webhookRoutes }
