import { createFileRoute } from '@tanstack/react-router'
import { verifyOidcJwt } from '@/lib/server/bridge/oidc'

export const Route = createFileRoute('/api/bridge/oauth/userinfo')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get('authorization')
        const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
        const claims = token ? verifyOidcJwt(token) : null
        if (!claims) return Response.json({ error: 'invalid_token' }, { status: 401 })
        return Response.json({
          sub: claims.sub,
          email: claims.email,
          email_verified: claims.email_verified,
          name: claims.name,
          picture: claims.picture,
        })
      },
    },
  },
})
