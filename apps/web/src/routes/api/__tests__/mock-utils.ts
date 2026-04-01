/**
 * Type-safe cast for partial mock data in tests.
 * Replaces `as any` when providing incomplete objects to vi.mocked().mockResolvedValueOnce().
 * T is inferred from the call-site context (e.g. the parameter type of mockResolvedValueOnce).
 */
export function mockAs<T>(value: unknown): T {
  return value as T
}
