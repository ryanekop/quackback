'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { setWidgetToken, getWidgetToken, clearWidgetToken } from '@/lib/client/widget-auth'
import { authClient } from '@/lib/server/auth/client'

interface WidgetUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

interface WidgetAuthContextValue {
  user: WidgetUser | null
  isIdentified: boolean
  /** Ensures a session exists (identified or anonymous). Returns true if ready. */
  ensureSession: () => Promise<boolean>
  closeWidget: () => void
}

const WidgetAuthContext = createContext<WidgetAuthContextValue | null>(null)

export function useWidgetAuth(): WidgetAuthContextValue {
  const ctx = useContext(WidgetAuthContext)
  if (!ctx) throw new Error('useWidgetAuth must be used inside WidgetAuthProvider')
  return ctx
}

export function WidgetAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WidgetUser | null>(null)
  const isIdentified = user !== null
  const sessionReadyRef = useRef(false)

  // On mount, check if we already have a stored token on the widget origin.
  useEffect(() => {
    if (getWidgetToken()) {
      sessionReadyRef.current = true
    }
  }, [])

  /** Store the widget session token on the widget origin. */
  const storeToken = useCallback((token: string) => {
    setWidgetToken(token)
    sessionReadyRef.current = true
  }, [])

  /**
   * Ensure a session exists. For identified users, this is already done via identify().
   * For anonymous users, creates an anonymous session lazily on first action.
   * Returns true if a session is ready, false if creation failed.
   */
  const sessionPromiseRef = useRef<Promise<boolean> | null>(null)
  const ensureSession = useCallback(async (): Promise<boolean> => {
    if (sessionReadyRef.current) return true
    // Prevent concurrent anonymous session creation
    if (sessionPromiseRef.current) return sessionPromiseRef.current

    const p = (async () => {
      try {
        const { data, error } = await authClient.signIn.anonymous({
          fetchOptions: {
            onSuccess: (ctx) => {
              const token = ctx.response.headers.get('set-auth-token')
              if (token) storeToken(token)
            },
          },
        })
        return !error && !!data
      } catch {
        return false
      } finally {
        sessionPromiseRef.current = null
      }
    })()
    sessionPromiseRef.current = p
    return p
  }, [storeToken])

  const closeWidget = useCallback(() => {
    window.parent.postMessage({ type: 'quackback:close' }, '*')
  }, [])

  useEffect(() => {
    async function handleIdentify(data: Record<string, unknown>) {
      try {
        const response = await fetch('/api/widget/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: { code: 'NETWORK_ERROR' } }))
          window.parent.postMessage(
            {
              type: 'quackback:identify-result',
              success: false,
              error: err.error?.code || 'SERVER_ERROR',
            },
            '*'
          )
          return
        }

        const result = await response.json()
        storeToken(result.sessionToken)
        setUser(result.user)

        window.parent.postMessage(
          { type: 'quackback:identify-result', success: true, user: result.user },
          '*'
        )
        window.parent.postMessage({ type: 'quackback:auth-change', user: result.user }, '*')
      } catch {
        window.parent.postMessage(
          { type: 'quackback:identify-result', success: false, error: 'NETWORK_ERROR' },
          '*'
        )
      }
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== window.parent) return

      const msg = event.data
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return

      if (msg.type === 'quackback:identify') {
        if (msg.data === null) {
          clearWidgetToken()
          sessionReadyRef.current = false
          setUser(null)
          window.parent.postMessage(
            { type: 'quackback:identify-result', success: true, user: null },
            '*'
          )
          window.parent.postMessage({ type: 'quackback:auth-change', user: null }, '*')
        } else if (msg.data && typeof msg.data === 'object') {
          handleIdentify(msg.data as Record<string, unknown>)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    window.parent.postMessage({ type: 'quackback:ready' }, '*')

    return () => window.removeEventListener('message', handleMessage)
  }, [storeToken])

  return (
    <WidgetAuthContext.Provider value={{ user, isIdentified, ensureSession, closeWidget }}>
      {children}
    </WidgetAuthContext.Provider>
  )
}
