/**
 * returns the number of milliseconds in a second
 *
 * @param {number} num - The number of seconds
 * @returns {number} The number of milliseconds
 * @example
 * second(1)
 * // => 1000
 */
export const second = (num: number = 1): number => {
  return num * 1000;
};

/**
 * returns the number of milliseconds in a minute
 *
 * @param {number} num - The number of minutes
 * @returns {number} The number of milliseconds
 * @example
 * minute(1)
 * // => 60000
 */
export const minute = (num: number = 1): number => {
  return num * 60 * second();
};

/**
 * returns the number of milliseconds in an hour
 *
 * @param {number} num - The number of hours
 * @returns {number} The number of milliseconds
 * @example
 * hour(1)
 * // => 3600000
 */
export const hour = (num: number = 1): number => {
  return num * 60 * minute();
};

/**
 * returns the number of milliseconds in a day
 *
 * @param {number} num - The number of days
 * @returns {number} The number of milliseconds
 * @example
 * day(1)
 * // => 86400000
 */
export const day = (num: number = 1): number => {
  return num * 24 * hour();
};

/**
 * returns the number of milliseconds in a week
 *
 * @param {number} num - The number of weeks
 * @returns {number} The number of milliseconds
 * @example
 * week(1)
 * // => 604800000
 */
export const week = (num: number = 1): number => {
  return num * 7 * day();
};

/**
 * Creates a promise that resolves after a specified number of milliseconds
 *
 * @param {number} time - The number of milliseconds to wait
 * @returns {Promise<void>}
 * @example
 * await timer(1000)
 * // => Promise resolves after 1 second
 */
export const timer = (time: number = 1000): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, time));
};
