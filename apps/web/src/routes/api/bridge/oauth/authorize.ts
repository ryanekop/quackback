import { createFileRoute } from '@tanstack/react-router'
import {
  BRIDGE_SESSION_COOKIE,
  consumeBridgeSession,
  createAuthorizationCode,
  getBridgeClientId,
  parseCookie,
} from '@/lib/server/bridge/oidc'

export const Route = createFileRoute('/api/bridge/oauth/authorize')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const clientId = url.searchParams.get('client_id')
        const redirectUri = url.searchParams.get('redirect_uri')
        const state = url.searchParams.get('state')
        const codeChallenge = url.searchParams.get('code_challenge')
        const codeChallengeMethod = url.searchParams.get('code_challenge_method')

        if (clientId !== getBridgeClientId() || !redirectUri) {
          return Response.json({ error: 'invalid_request' }, { status: 400 })
        }

        const sessionId = parseCookie(request, BRIDGE_SESSION_COOKIE)
        const identity = consumeBridgeSession(sessionId)
        if (!identity) {
          return Response.json({ error: 'login_required' }, { status: 401 })
        }

        const code = createAuthorizationCode({
          identity,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
        })
        const redirect = new URL(redirectUri)
        redirect.searchParams.set('code', code)
        if (state) redirect.searchParams.set('state', state)

        return Response.redirect(redirect)
      },
    },
  },
})
