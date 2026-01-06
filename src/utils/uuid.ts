/**
 * Generates a random number based on a seed
 *
 * @param {number} seed - A seed to generate the number from
 * @returns {number} a random number
 * @example
 * let num = num(1);
 * // num = 1013904223
 */
export const num = (seed?: number): number => {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let state = seed || Date.now();

  state = (a * state + c) % m;
  return state;
};
