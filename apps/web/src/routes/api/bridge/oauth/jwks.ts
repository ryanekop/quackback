import { createFileRoute } from '@tanstack/react-router'
import { publicJwks } from '@/lib/server/bridge/oidc'

export const Route = createFileRoute('/api/bridge/oauth/jwks')({
  server: {
    handlers: {
      GET: async () => Response.json(publicJwks()),
    },
  },
})
