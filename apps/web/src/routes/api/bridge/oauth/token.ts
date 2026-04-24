import { createHash } from 'crypto'
import { createFileRoute } from '@tanstack/react-router'
import { config } from '@/lib/server/config'
import {
  consumeAuthorizationCode,
  getBridgeClientId,
  getBridgeIssuer,
  signOidcJwt,
  subjectForIdentity,
  verifyClientSecret,
} from '@/lib/server/bridge/oidc'

const jsonError = (error: string, status = 400) => Response.json({ error }, { status })

const logTokenError = (error: string, details?: Record<string, unknown>) => {
  console.warn('[bridge:oauth:token]', error, details ?? {})
}

const base64UrlEncode = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

function verifyPkce(codeVerifier: string | null, challenge: string | null, method: string | null) {
  if (!challenge) return true
  if (!codeVerifier) return false
  if (method === 'S256') {
    return base64UrlEncode(createHash('sha256').update(codeVerifier).digest()) === challenge
  }
  return codeVerifier === challenge
}

export const Route = createFileRoute('/api/bridge/oauth/token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = new URLSearchParams(await request.text())
        if (!verifyClientSecret(request, body)) {
          logTokenError('invalid_client', {
            hasBasicAuth: request.headers.get('authorization')?.startsWith('Basic ') === true,
            hasClientId: Boolean(body.get('client_id')),
            clientIdMatches: body.get('client_id') === getBridgeClientId(),
          })
          return jsonError('invalid_client', 401)
        }
        if (body.get('grant_type') !== 'authorization_code') {
          logTokenError('unsupported_grant_type', { grantType: body.get('grant_type') })
          return jsonError('unsupported_grant_type')
        }

        const code = body.get('code')
        if (!code) {
          logTokenError('invalid_request', { reason: 'missing_code' })
          return jsonError('invalid_request')
        }
        const stored = consumeAuthorizationCode(code)
        if (!stored) {
          logTokenError('invalid_grant', { reason: 'missing_or_expired_code' })
          return jsonError('invalid_grant')
        }
        if (
          body.get('redirect_uri') &&
          stored.redirectUri &&
          body.get('redirect_uri') !== stored.redirectUri
        ) {
          logTokenError('invalid_grant', { reason: 'redirect_uri_mismatch' })
          return jsonError('invalid_grant')
        }
        if (
          !verifyPkce(body.get('code_verifier'), stored.codeChallenge, stored.codeChallengeMethod)
        ) {
          logTokenError('invalid_grant', { reason: 'pkce_verification_failed' })
          return jsonError('invalid_grant')
        }

        const issuer = getBridgeIssuer(config.baseUrl)
        const now = Math.floor(Date.now() / 1000)
        const subject = subjectForIdentity(stored.identity)
        const claims = {
          iss: issuer,
          aud: getBridgeClientId(),
          sub: subject,
          email: stored.identity.email,
          email_verified: true,
          name: stored.identity.name ?? stored.identity.email.split('@')[0],
          picture: stored.identity.avatar_url,
          source_app: stored.identity.source_app,
          source_user_id: stored.identity.source_user_id,
          iat: now,
          exp: now + 60 * 60,
        }

        return Response.json({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: signOidcJwt(claims),
          id_token: signOidcJwt(claims),
          scope: 'openid email profile',
        })
      },
    },
  },
})
