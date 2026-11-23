import crypto from 'crypto';

/**
 * Performs a cryptographically secure Fisher-Yates shuffle on an array.
 * Returns a new shuffled array without mutating the original.
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function secureShuffle(array) {
  if (!Array.isArray(array)) return [];
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default secureShuffle;
