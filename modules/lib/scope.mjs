import {freeze, setPrototypeOf} from './helpers.mjs';
import {Module} from './module.mjs';

export const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))();

export const ModuleScope = new Proxy(
  freeze(
    // setPrototypeOf(
    (({eval: $eval}) => ({
      eval: $eval,
      Module,
    }))(GlobalScope),
    //   GlobalScope,
    // ),
  ),
  {
    get: (globals, property, receiver) => {
      if (property in globals) return globals[property];
      const target = GlobalScope;
      const value =
        property in target && typeof property === 'string' ? target[property] : undefined;
      if (value && typeof value === 'function') {
        const local = (this.locals || (this.locals = {}))[property];
        return local && local.value === value
          ? local.proxy
          : (this.locals[property] = {
              value,
              proxy: new Proxy(value, {
                apply: (method, thisArg, argArray) =>
                  Reflect.apply(
                    method,
                    ((!thisArg || thisArg === ModuleScope) && target) || thisArg,
                    argArray,
                  ),
              }),
            }).proxy;
      }
      return value;

      // property in globals ? globals[property] : GlobalScope[property];
    },
    set: (globals, property) => {
      throw ReferenceError(`${property} is not defined`);
    },
  },
);
