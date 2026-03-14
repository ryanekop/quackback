import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import {
  createdResponse,
  badRequestResponse,
  handleDomainError,
} from '@/lib/server/domains/api/responses'
import { validateTypeId } from '@/lib/server/domains/api/validation'
import type { PostId } from '@quackback/ids'

const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  createdAt: z.string().datetime().optional(),
})

export const Route = createFileRoute('/api/v1/posts/$postId/notes')({
  server: {
    handlers: {
      /**
       * POST /api/v1/posts/:postId/notes
       * Create an internal note on a post (team members only)
       */
      POST: async ({ request, params }) => {
        const authResult = await withApiKeyAuth(request, { role: 'team' })
        if (authResult instanceof Response) return authResult
        const { principalId } = authResult

        try {
          const { postId } = params

          const postError = validateTypeId(postId, 'post', 'post ID')
          if (postError) return postError

          const body = await request.json()
          const parsed = createNoteSchema.safeParse(body)

          if (!parsed.success) {
            return badRequestResponse('Invalid request body', {
              errors: parsed.error.flatten().fieldErrors,
            })
          }

          // Only admins can set createdAt (for imports)
          const createdAt =
            parsed.data.createdAt && authResult.role === 'admin'
              ? new Date(parsed.data.createdAt)
              : undefined

          // Validate post exists
          const { db, posts, postNotes, eq } = await import('@/lib/server/db')

          const post = await db.query.posts.findFirst({
            where: eq(posts.id, postId as PostId),
            columns: { id: true },
          })

          if (!post) {
            return badRequestResponse('Post not found')
          }

          const [note] = await db
            .insert(postNotes)
            .values({
              postId: postId as PostId,
              principalId,
              content: parsed.data.content.trim(),
              ...(createdAt && { createdAt }),
            })
            .returning()

          return createdResponse({
            id: note.id,
            postId: note.postId,
            principalId: note.principalId,
            content: note.content,
            createdAt: note.createdAt.toISOString(),
          })
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
