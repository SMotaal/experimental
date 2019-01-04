import {
  setPrototypeOf,
  getPrototypeOf,
  defineProperty,
  preventExtensionsAndFreeze,
  sealAndFreeze,
} from '../../helpers.js';

export class Cache {
  /** @param {Cache} [cache] @param {string} [id] */
  constructor(cache, cacheID) {
    // Returns a scoped cache instance.
    // NOTE: only exposes own cache (to pass around safely)
    if (cache) {
      if (!cacheID || typeof cacheID !== 'string') {
        throw TypeError('Cache constructor called with an invalid cacheID.');
      }

      const caches = getPrototypeOf(cache);

      if (typeof cache !== 'function' || typeof caches !== 'object' || !(caches instanceof Cache)) {
        throw TypeError('Cache constructor called with an invalid parent cache instance.');
      }

      // CHANGE: Append index to existing cacheID to prevent leaks.
      let scopeID = cacheID;
      for (let i = 0; scopeID in caches; scopeID = `${cacheID}#${++i}`);
      // REVERT: Throw if cacheID already exists to prevent leaks.

      defineProperty(caches, scopeID, {value: this, configurable: false});

      return preventExtensionsAndFreeze(setPrototypeOf(id => cache(id, scopeID), this));
    }

    // Returns a parent cache instance
    // NOTE: exposes all scoped caches (must remain encapsulated)
    else {
      const caches = {default: this};
      return preventExtensionsAndFreeze(
        setPrototypeOf((id, cacheID = 'default') => {
          const {
            [cacheID]: cache = (caches[cacheID] = {}),
            [cacheID]: {[id]: cached = (cache[id] = {})},
          } = caches;
          return cached;
        }, this),
      );
    }
  }
}

sealAndFreeze(Cache.prototype);
