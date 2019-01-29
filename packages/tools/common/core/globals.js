/// <reference path='../global.d.ts' />
//@ts-check

/// Internal

/** @type {ObjectConstructor} */
//@ts-ignore
export const Object = {}.constructor;

const bindings = Object.create(null);

/** @typedef {import('../types').Globals} Globals */
/** @type {{[K in keyof Globals]: Globals[K]}} */
const globals = Object.create(bindings, {
  Request: {get: () => Request, set: value => (Request = value)},
});

/**
 * @template {keyof Globals} T
 * @param {T} name
 * @param {*} value
 * @returns {Globals[T]}
 */
export const scoped = (name, value) => (
  name in bindings
    ? (bindings[name] = value)
    : Object.defineProperty(globals, name, {value, enumerable: true, configurable: true}),
  value
);

const rebind = (b, a) =>
  function() {
    return arguments.length ? b(a(arguments[0])) : b();
  };

/**
 * @template {keyof Globals} T
 * @template {(value?: Globals[T]) => Globals[T] | void} U
 * @param {T} name
 * @param {U} bind
 * @returns {U}
 */
const binding = (name, bind) => (
  name in bindings &&
    //@ts-ignore
    (bind = rebind(bind, Object.getOwnPropertyDescriptor(bindings, name).get)),
  //@ts-ignore
  Object.defineProperty(bindings, name, {get: bind, set: bind, enumerable: true, configurable: true}),
  bind
);

/// Scoped

const scopedSelf = scoped('self', (typeof self === 'object' && self && self.self === self && self) || undefined);

const scopedGlobal = scoped(
  'global',
  (typeof global === 'object' && global && global.global === global && global) || undefined,
);

scoped('Object', Object);

export const scope = scopedSelf || scopedGlobal || (1, eval)('this');

/// Bindings
export let Request;

binding('Request', function() {
  return arguments.length ? (Request = arguments[0]) : Request;
})(scopedSelf && scopedSelf.Request);

export let Response;

binding('Response', function() {
  return arguments.length ? (Response = arguments[0]) : Response;
})(scopedSelf && scopedSelf.Response);

export let Headers;

binding('Headers', function() {
  return arguments.length ? (Headers = arguments[0]) : Headers;
})(scopedSelf && scopedSelf.Headers);

/// Exports

export {scopedSelf as self, scopedGlobal as global};

export default globals;
