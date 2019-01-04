/// <reference lib="esnext" />
/// <reference types="node" />
/// <reference path="./types.d.ts" />

import {Cache} from './cache.js';
import {CoreModule} from '../module.js';
import {defineProperties, sealAndFreeze, getPrototypeOf, setProperty} from '../../helpers.js';

/** @type {(id: string) => Error} */
const UnknownBuiltinModuleError = id =>
  defineProperties(Error(`No such built-in module: ${id}`), {
    code: {value: 'ERR_UNKNOWN_BUILTIN_MODULE'},
    name: {value: 'Error [ERR_UNKNOWN_BUILTIN_MODULE]'},
  });

let instances = 0;

export const createBuiltinModule = internal => {
  // TODO: Encapsulate cache here (instead of lazy static _cache & getCache)

  class BuiltinModule extends CoreModule {
    cache() {
      this.constructor._cache[this.id] = this;
    }

    compile() {
      const id = this.id;
      this.loading = true;
      try {
        // TODO: Actual implementation
        // const requireFn = this.id.startsWith('internal/deps/')
        //   ? this.requireForDeps
        //   : this.require;
        // const fn = compileFunction(id);
        // fn(this.exports, requireFn, this, process, internalBinding);
        // if (config.experimentalModules && !this.isInternal(this.id)) {
        //   this.proxifyExports();
        // }
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    }

    /** @param {string} id */
    static require(id) {
      if (id === internal.entrypoint) return internal.exports;

      const cached = this.getCached(id);

      if (cached && (cached.loaded || cached.loading)) return cached.exports;

      if (!this.exists(id)) throw UnknownBuiltinModuleError(id);
      internal.moduleLoadList.push(`BuiltinModule ${id}`);
      const builtinModule = new this(id);
      builtinModule.cache();
      builtinModule.compile();
      return builtinModule.exports;
    }

    /** @param {string} id */
    static nonInternalExists(id) {
      return internal.config && internal.config.exposeInternals
        ? id !== internal.entrypoint && this.exists(id)
        : this.exists(id) && !this.isInternal(id);
    }

    /** @param {string} id */
    static isInternal(id) {
      return internal.config && internal.config.exposeInternals
        ? id !== internal.entrypoint && this.exists()
        : id.startsWith('internal/');
    }

    /** @param {string} id */
    static isDepsModule(id) {
      return id.startsWith('node-inspect/') || id.startsWith('v8/');
    }

    /** @param {string} id */
    static requireForDeps(id) {
      return this.require((!this.exists(id) && (id = `internal/deps/${id}`)) || id);
    }

    /** @param {string} id */
    static exists(id) {
      return true;
    }

    /** @type {NodeJS.NativeModule.getCached} */
    static get getCached() {
      const cache = new Cache(internal.cache, 'builtin_module');
      setProperty(this, '_cache', getPrototypeOf(cache));
      return setProperty(this, 'getCached', cache, true);
    }

    static get _cache() {
      return this.getCached, this._cache;
    }
  }

  sealAndFreeze(BuiltinModule.prototype);

  return BuiltinModule;
};
