export * from '../../lib/helpers.js';
import {freeze, seal, preventExtensions} from '../../lib/helpers.js';

/** @type {Function} */
export const Undefined = freeze(() => {});
export const VOID = freeze([]);

export const sealAndFreeze = object => freeze(seal(object));
export const preventExtensionsAndFreeze = object => freeze(preventExtensions(object));

// export const isIdentifierName = name => {
//   try {
//     eval(`let ${name}= name`);
//     return true;
//   } catch (exception) {
//     return false;
//   }
// };

// {
//   const IdentifierStart = raw`_$\p{ID_Start}`;
//   const IdentifierPart = raw`_$\u200c\u200d\p{ID_Continue}\u034f`;

//   isIdentifierName.blacklist = new Set();
//   isIdentifierName.matcher;
// }

// import {create, freeze, getOwnPropertyDescriptors} from '../../lib/helpers.js';

// /**
//  * @template {Object} T
//  * @template {Object} U
//  * @param {T} external
//  * @param {U extends {} = {}} internal
//  * @returns {T & U}
//  */
// export const Internal = (external, internal) => {
//   return create(external, getOwnPropertyDescriptors(internal));
// };

// Object.setPrototypeOf(Cache.prototype, null);

// export const Cache = () => {
//   const caches = {};
//   const cache = (id, cache = 'default') => {
//     const {[cache]: {id: cached = (caches.cache.id = {})} = (caches.cache = {})} = cached;
//     return cached;
//   };
//   return {cache, caches};
// }
