import {freeze, setPrototypeOf} from './helpers.mjs';
import {Module} from './module.mjs';

export const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))();

export const ModuleScope = new Proxy(
  freeze(
    setPrototypeOf(
      (({eval: $eval}) => ({
        eval: $eval,
        Module,
      }))(GlobalScope),
      GlobalScope,
    ),
  ),
  {
    get: (globals, property, receiver) =>
      property in globals ? globals[property] : GlobalScope[property],
    set: (globals, property) => {
      throw ReferenceError(`${property} is not defined`);
    },
  },
);
