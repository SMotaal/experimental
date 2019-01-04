/// Objects
export const {
  assign,
  defineProperty,
  defineProperties,
  create,
  freeze,
  seal,
  preventExtensions,
  getOwnPropertyDescriptor,
  getOwnPropertyDescriptors,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  getPrototypeOf,
  setPrototypeOf,
  entries,
  keys,
  values,
} = Object;

/**
 * Extends a from b
 * @template {object|function} T
 * @param {T} a
 * @param {T} b
 */
export const extend = (a, b) =>
  typeof b === 'function' && b.prototype
    ? setPrototypeOf(
        defineProperty(a, 'prototype', {
          value: defineProperty(create(b.prototype), 'constructor', {value: a}),
        }),
        b,
      )
    : setPrototypeOf(typeof a === 'function' && a, b);

export const isPrototypeOf = Function.call.bind(Object.isPrototypeOf);

/// Functions

export const noop = () => {};
export const bind = Function.bind.bind(Function.call);
export const call = Function.call.bind(Function.call);

/// Properties

export const hasOwnProperty = Function.call.bind(Object.hasOwnProperty);

/**
 * @template {{}} T
 * @template {string|symbol} U
 * @template V
 * @param {T} target
 * @param {U} property
 * @param {V} value
 * @param {boolean} [enumerable = false]
 * @param {boolean} [configurable = false]
 * @returns V
 */
export const setProperty = (target, property, value, enumerable = false, configurable = false) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

export const bindProperty = (target, property, get, enumerable = false, configurable = false) =>
  defineProperty(target, property, {get, set: noop, configurable, enumerable});

export const linkProperty = (target, source, identifier, alias = identifier) =>
  defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

/// Promises

export const ResolvedPromise = Promise.resolve();
