import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
} from 'crypto'

export type BridgeSourceApp = 'clientdesk' | 'fastpik'
export type BridgeTargetBoard = 'clientdesk' | 'fastpik'

export interface BridgeIdentity {
  jti: string
  source_app: BridgeSourceApp
  source_user_id: string
  email: string
  name: string | null
  avatar_url: string | null
  target_board: BridgeTargetBoard
}

interface StoredBridgeSession {
  identity: BridgeIdentity
  expiresAt: number
}

interface StoredCode {
  identity: BridgeIdentity
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: string | null
  expiresAt: number
}

type BridgeJsonWebKey = JsonWebKey & {
  alg: 'RS256'
  kid: string
  use: 'sig'
}
type JsonWebKeySet = { keys: BridgeJsonWebKey[] }

const sessionStore = new Map<string, StoredBridgeSession>()
const codeStore = new Map<string, StoredCode>()
const usedJtis = new Map<string, number>()

const fallbackKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = process.env.QUACKBACK_BRIDGE_OIDC_PRIVATE_KEY
  ? createPrivateKey(process.env.QUACKBACK_BRIDGE_OIDC_PRIVATE_KEY.replace(/\\n/g, '\n'))
  : fallbackKeyPair.privateKey
const publicKey = process.env.QUACKBACK_BRIDGE_OIDC_PRIVATE_KEY
  ? createPublicKey(privateKey)
  : fallbackKeyPair.publicKey

export const BRIDGE_SESSION_COOKIE = 'qb_bridge_session'
export const BRIDGE_COOKIE_MAX_AGE_SECONDS = 5 * 60
export const BRIDGE_CODE_TTL_MS = 60 * 1000
export const BRIDGE_TOKEN_TTL_SECONDS = 5 * 60
export const BRIDGE_OIDC_KID = process.env.QUACKBACK_BRIDGE_OIDC_KID || 'quackback-bridge-v1'

export function isBridgeOidcEnabled(): boolean {
  return process.env.QUACKBACK_BRIDGE_OIDC_ENABLED !== 'false'
}

export function getBridgeClientId(): string {
  return process.env.QUACKBACK_BRIDGE_OIDC_CLIENT_ID || 'quackback-portal'
}

export function getBridgeClientSecret(): string {
  return process.env.QUACKBACK_BRIDGE_OIDC_CLIENT_SECRET || ''
}

export function getBridgeProviderName(): string {
  return process.env.QUACKBACK_BRIDGE_PROVIDER_NAME || 'ClientDesk / Fastpik'
}

export function getBridgeIssuer(origin: string): string {
  return process.env.QUACKBACK_BRIDGE_OIDC_ISSUER || origin
}

export function getBridgeDiscoveryUrl(origin: string): string {
  return `${getBridgeIssuer(origin)}/.well-known/quackback-bridge-openid-configuration`
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function getBridgeSecret(sourceApp: BridgeSourceApp): string | undefined {
  return sourceApp === 'clientdesk'
    ? process.env.QUACKBACK_BRIDGE_SECRET_CLIENTDESK
    : process.env.QUACKBACK_BRIDGE_SECRET_FASTPIK
}

function isSourceApp(value: unknown): value is BridgeSourceApp {
  return value === 'clientdesk' || value === 'fastpik'
}

function isTargetBoard(value: unknown): value is BridgeTargetBoard {
  return value === 'clientdesk' || value === 'fastpik'
}

function cleanupExpired(): void {
  const now = Date.now()
  for (const [key, value] of sessionStore.entries()) {
    if (value.expiresAt <= now) sessionStore.delete(key)
  }
  for (const [key, value] of codeStore.entries()) {
    if (value.expiresAt <= now) codeStore.delete(key)
  }
  for (const [key, expiresAt] of usedJtis.entries()) {
    if (expiresAt <= now) usedJtis.delete(key)
  }
}

export function verifyBridgeToken(token: string): BridgeIdentity {
  cleanupExpired()
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Malformed bridge token')
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8')) as Record<
    string,
    unknown
  >
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as Record<
    string,
    unknown
  >

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Unsupported bridge token')
  }
  if (!isSourceApp(payload.source_app) || !isTargetBoard(payload.target_board)) {
    throw new Error('Invalid bridge target')
  }

  const secret = getBridgeSecret(payload.source_app)
  if (!secret) throw new Error('Bridge secret is not configured')

  const expected = base64UrlEncode(
    createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest()
  )
  if (expected !== encodedSignature) {
    throw new Error('Invalid bridge token signature')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < nowSeconds) {
    throw new Error('Bridge token expired')
  }
  if (
    typeof payload.jti !== 'string' ||
    typeof payload.source_user_id !== 'string' ||
    typeof payload.email !== 'string' ||
    !payload.email.includes('@')
  ) {
    throw new Error('Bridge token is missing identity')
  }
  if (usedJtis.has(payload.jti)) {
    throw new Error('Bridge token already used')
  }

  usedJtis.set(payload.jti, (payload.exp + BRIDGE_TOKEN_TTL_SECONDS) * 1000)

  return {
    jti: payload.jti,
    source_app: payload.source_app,
    source_user_id: payload.source_user_id,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === 'string' && payload.name ? payload.name : null,
    avatar_url:
      typeof payload.avatar_url === 'string' && payload.avatar_url ? payload.avatar_url : null,
    target_board: payload.target_board,
  }
}

export function createBridgeSession(identity: BridgeIdentity): string {
  cleanupExpired()
  const sessionId = randomUUID()
  sessionStore.set(sessionId, {
    identity,
    expiresAt: Date.now() + BRIDGE_COOKIE_MAX_AGE_SECONDS * 1000,
  })
  return sessionId
}

export function consumeBridgeSession(sessionId: string | null): BridgeIdentity | null {
  cleanupExpired()
  if (!sessionId) return null
  const session = sessionStore.get(sessionId)
  if (!session) return null
  return session.identity
}

export function createAuthorizationCode(args: {
  identity: BridgeIdentity
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: string | null
}): string {
  cleanupExpired()
  const code = randomUUID()
  codeStore.set(code, { ...args, expiresAt: Date.now() + BRIDGE_CODE_TTL_MS })
  return code
}

export function consumeAuthorizationCode(code: string): StoredCode | null {
  cleanupExpired()
  const stored = codeStore.get(code)
  if (!stored) return null
  codeStore.delete(code)
  return stored
}

export function parseCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const item = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null
}

export function verifyClientSecret(request: Request, body: URLSearchParams): boolean {
  const expectedId = getBridgeClientId()
  const expectedSecret = getBridgeClientSecret()
  if (!expectedSecret) return false

  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Basic ')) {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
    const [clientId, clientSecret] = decoded.split(':')
    return clientId === expectedId && clientSecret === expectedSecret
  }

  return body.get('client_id') === expectedId && body.get('client_secret') === expectedSecret
}

export function publicJwks(): JsonWebKeySet {
  const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey
  const { key_ops: _keyOps, ext: _ext, ...publicJwk } = jwk
  return {
    keys: [
      {
        ...publicJwk,
        alg: 'RS256',
        kid: BRIDGE_OIDC_KID,
        use: 'sig',
      },
    ],
  }
}

export function signOidcJwt(payload: Record<string, unknown>): string {
  const encodedHeader = base64UrlEncode(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: BRIDGE_OIDC_KID })
  )
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey)
  return `${signingInput}.${base64UrlEncode(signature)}`
}

export function verifyOidcJwt(token: string): Record<string, unknown> | null {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const ok = verify(
    'RSA-SHA256',
    Buffer.from(signingInput),
    publicKey,
    base64UrlDecode(encodedSignature)
  )
  if (!ok) return null
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as Record<
    string,
    unknown
  >
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function subjectForIdentity(identity: BridgeIdentity): string {
  return `email:${createHmac('sha256', 'quackback-bridge-subject')
    .update(identity.email)
    .digest('hex')}`
}
