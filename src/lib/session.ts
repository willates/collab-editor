import { getIronSession, IronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface SessionData {
  userId: number
  email: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    'fallback-dev-secret-please-change-in-production-32ch',
  cookieName: 'collab-editor-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}

/** Returns session data if logged in, null otherwise. */
export async function requireAuth(): Promise<SessionData | null> {
  const session = await getSession()
  if (!session.isLoggedIn || !session.userId) return null
  return { userId: session.userId, email: session.email, isLoggedIn: true }
}

/** Convenience: return 401 JSON when not authenticated. */
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
