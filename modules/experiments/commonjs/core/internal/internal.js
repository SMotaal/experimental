/// <reference lib="esnext" />
/// <reference types="node" />
/// <reference path="./types.d.ts" />

import {Cache} from './cache.js';
import {Undefined, freeze, defineProperty, defineProperties} from '../../helpers.js';

export class Internal {
  constructor(
    {
      entrypoint = defaults.entrypoint,
      builtins: {
        moduleLoadList = defaults.builtins.moduleLoadList,
        cache = defaults.builtins.cache,
        config = defaults.builtins.config,
        binding,
        internalBinding,
        BuiltinModule,
      } = defaults.builtins,
      hooks = defaults.hooks,
    } = defaults || {},
  ) {
    this.entrypoint = entrypoint;
    this.cache = cache;
    this.moduleLoadList = moduleLoadList;
    this.config = config;

    /** @param {Partial<typeof exports>} overloads */
    this.hook = overloads => {
      const cachable = ['binding', 'internalBinding'];
      for (const hook in hooks) {
        (typeof overloads[hook] === 'function' && (this[hook] = overloads[hook])) ||
          (this[hook] || !cachable.includes(hook) || (this[hook] = id => this.cache(id, hook)));
      }
    };

    this.binding = binding;
    this.internalBinding = internalBinding;
    this.BuiltinModule = BuiltinModule;

    defineProperties(this, freeze(hooks));

    const exports = {binding, internalBinding, BuiltinModule: BuiltinModule};

    for (const property in hooks) {
      const hook = hooks[property];
      hook && hook.get && defineProperty(exports, property, {get: hook.get});
    }

    /** @type {Readonly<exports>} */
    this.exports = exports;
  }
}

/// Defaults

const defaults = {};

defaults.entrypoint = 'internal/bootstrap/loaders';

defaults.hooks = {
  /** @type {hook<binding>} */
  binding: {get: Undefined, set: Undefined},
  /** @type {hook<internalBinding>} */
  internalBinding: {get: Undefined, set: Undefined},
  /** @type {hook<BuiltinModule>} */
  BuiltinModule: {get: Undefined, set: Undefined},
};

defaults.builtins = {
  /** @type {binding} */
  get binding() {},
  /** @type {internalBinding} */
  get internalBinding() {},
  /** @type {BuiltinModule} */
  get BuiltinModule() {},

  /** @type {string[]} */
  get moduleLoadList() {
    return [];
  },
  get config() {
    return {exposeInternals: true};
  },
  get cache() {
    return new Cache();
  },
};

/** @type {options} */
Internal.defaults = defaults;

/// Types

/**
 * Hook
 * @template T
 * @typedef {{get?():T; set?(value: T): void}} hook
 */

/**
 * Types
 * @typedef {Partial<typeof defaults>} options
 * @typedef {{(id: string)}} binding
 * @typedef {{(id: string)}} internalBinding
 * @typedef {typeof NodeJS.NativeModule} BuiltinModule
 */
