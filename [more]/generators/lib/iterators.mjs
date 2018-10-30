const {create, freeze, setPrototypeOf} = Object;

export const {iterator: ITERATOR} = Symbol;

/** Empty readonly array */
export const EMPTY = freeze(
  setPrototypeOf(
    [],
    create(null, {
      [ITERATOR]: {
        value: Array.prototype[ITERATOR],
      },
    }),
  ),
);

/**
 * Creates an iterator from any value
 * @param {iterative|arbitrary} [source] - value including undefined
 * @returns {Iterator} ECMAScript iterator
 */
export const iteratorFrom = source => {
  return (
    ((source || source === '') &&
      ((ITERATOR in source && source[ITERATOR]()) ||
        ('next' in source && typeof source.next === 'function' && source))) ||
    EMPTY[ITERATOR]()
  );
};

/** @typedef {Iterable|AsyncIterable} iterable - a/sync iterable */
/** @typedef {Iterator|AsyncIterator} iterator - a/sync iterator */
/** @typedef {iterable|iterator} iterative - a/sync iterable or iterator */
/** @typedef {unknown|never} arbitrary - maybe any */
