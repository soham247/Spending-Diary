/**
 * Returns a pair of user IDs in canonical order (lower first).
 * Used for friendships, balances, and any table keyed by a pair.
 */
export function orderPair(
  a: string,
  b: string,
): [userLowId: string, userHighId: string] {
  return a < b ? [a, b] : [b, a];
}
