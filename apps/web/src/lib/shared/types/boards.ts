/**
 * Board-related types for client use.
 *
 * Re-exported from the server domain for architectural compliance — type-only
 * imports are erased at compile time and never affect the bundle.
 */

export type { BoardWithStats } from '@/lib/server/domains/boards'
