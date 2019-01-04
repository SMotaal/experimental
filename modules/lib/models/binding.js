/// <reference types="./types" />
// @ts-check

import {constants} from './helpers.js';

/** @type {WeakMap<Binding['get'], Binding['get']>} */
const getters = new WeakMap();
/** @type {WeakMap<Binding['set'], Binding['set']>} */
const setters = new WeakMap();

/**
 * @template K
 * @typedef {Partial<Pick<Binding<K>, 'get'|'set'>>} binding
 */

/**
 * Polymorphic Binding Record
 * @template K
 * @implements {bindings.Binding<K>}
 */
export class Binding {
  /** @param {binding<K>} [binding] */
  constructor(binding) {
    let revoked, locked, getter, setter;

    /** @param {binding<K>} [binding] */
    this.bind = binding => {
      if (!locked && !revoked && binding !== this) {
        const newGetter =
          (binding && ((typeof binding.get === 'function' && getters.get(binding.get)) || binding.get)) || undefined;

        const newSetter =
          (binding && ((typeof binding.get === 'function' && setters.get(binding.get)) || binding.get)) || undefined;

        newGetter === getter || getters.set(this.get, (getter = newGetter));
        newSetter === setter || setters.set(this.set, (setter = newSetter));
      }
    };

    /** @returns {* | void} */
    this.get = () => getter && getter();
    /** @param {*} value */
    this.set = value => void setter && setter(value);
    this.lock = () => void (revoked || (locked = true));
    this.unlock = () => void (revoked || (locked = false));
    this.revoke = () => {
      if (!revoked) {
        revoked = true;
        getters.delete(this.get);
        setters.delete(this.set);
        locked = setter = getter = this.get = this.set = undefined;
      }
    };

    constants(this, {...this});

    binding && this.bind(binding);
  }

  /** @readonly */
  static get STAR() {
    return '*';
  }

  /** @readonly @type {'default'} */
  static get DEFAULT() {
    return 'default';
  }
}

export const {STAR, DEFAULT} = constants(Binding, {
  STAR: Binding.STAR,
  DEFAULT: Binding.DEFAULT,
});
