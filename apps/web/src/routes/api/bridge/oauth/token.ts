import { createHash } from 'crypto'
import { createFileRoute } from '@tanstack/react-router'
import {
  consumeAuthorizationCode,
  getBridgeClientId,
  getBridgeIssuer,
  signOidcJwt,
  subjectForIdentity,
  verifyClientSecret,
} from '@/lib/server/bridge/oidc'

const jsonError = (error: string, status = 400) => Response.json({ error }, { status })

const base64UrlEncode = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

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
        if (!verifyClientSecret(request, body)) return jsonError('invalid_client', 401)
        if (body.get('grant_type') !== 'authorization_code') {
          return jsonError('unsupported_grant_type')
        }

        const code = body.get('code')
        if (!code) return jsonError('invalid_request')
        const stored = consumeAuthorizationCode(code)
        if (!stored) return jsonError('invalid_grant')
        if (
          body.get('redirect_uri') &&
          stored.redirectUri &&
          body.get('redirect_uri') !== stored.redirectUri
        ) {
          return jsonError('invalid_grant')
        }
        if (!verifyPkce(body.get('code_verifier'), stored.codeChallenge, stored.codeChallengeMethod)) {
          return jsonError('invalid_grant')
        }

        const origin = new URL(request.url).origin
        const issuer = getBridgeIssuer(origin)
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
