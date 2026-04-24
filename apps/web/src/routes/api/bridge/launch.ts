import { createFileRoute } from '@tanstack/react-router'
import {
  BRIDGE_COOKIE_MAX_AGE_SECONDS,
  BRIDGE_SESSION_COOKIE,
  createBridgeSession,
  verifyBridgeToken,
} from '@/lib/server/bridge/oidc'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const Route = createFileRoute('/api/bridge/launch')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const token = url.searchParams.get('token')
          if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

          const identity = verifyBridgeToken(token)
          const sessionId = createBridgeSession(identity)
          const callbackURL = `/?board=${encodeURIComponent(identity.target_board)}`
          const payload = JSON.stringify({
            providerId: 'custom-oidc',
            callbackURL,
            disableRedirect: true,
          })

          const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Opening feedback...</title></head>
  <body>
    <p>Opening feedback...</p>
    <script>
      fetch('/api/auth/sign-in/oauth2', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: ${JSON.stringify(payload)}
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (!data || !data.url) throw new Error('Unable to start sign in');
          window.location.href = data.url;
        })
        .catch(function (error) {
          document.body.textContent = error && error.message ? error.message : 'Unable to open feedback';
        });
    </script>
  </body>
</html>`

          return new Response(html, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'set-cookie': `${BRIDGE_SESSION_COOKIE}=${escapeHtml(
                encodeURIComponent(sessionId)
              )}; Path=/; Max-Age=${BRIDGE_COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax`,
            },
          })
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Bridge launch failed' },
            { status: 401 }
          )
        }
      },
    },
  },
})
