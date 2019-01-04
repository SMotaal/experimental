export * from '../helpers.js';
import {defineProperties, freeze, getOwnPropertyDescriptors} from '../helpers.js';

/**
 *
 * @template T
 * @template {{[key: string|symbol]}} U
 * @param {T} object
 * @param {U} constants
 * @returns {T & {Readonly<U>}}
 */
export const constants = (object, constants) => {
  return defineProperties(object, getOwnPropertyDescriptors(freeze(constants)));
};

