import { createFileRoute } from '@tanstack/react-router'
import { getBridgeClientId, getBridgeIssuer } from '@/lib/server/bridge/oidc'

export const Route = createFileRoute('/.well-known/quackback-bridge-openid-configuration')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin
        const issuer = getBridgeIssuer(origin)
        return Response.json({
          issuer,
          authorization_endpoint: `${issuer}/api/bridge/oauth/authorize`,
          token_endpoint: `${issuer}/api/bridge/oauth/token`,
          userinfo_endpoint: `${issuer}/api/bridge/oauth/userinfo`,
          jwks_uri: `${issuer}/api/bridge/oauth/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          scopes_supported: ['openid', 'email', 'profile'],
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
          claims_supported: ['sub', 'email', 'email_verified', 'name', 'picture'],
          client_id: getBridgeClientId(),
        })
      },
    },
  },
})
