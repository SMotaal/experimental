export const TypeOf = type =>
  TypeOf[type] ||
  (TypeOf[type] = Object.defineProperties(
    unknown => type === typeof unknown,
    Object.freeze({
      boolean: type === 'boolean',
      number: type === 'number',
      bigint: type === 'bigint',
      string: type === 'string',
      symbol: type === 'symbol',
      function: type === 'function',
      undefined: type === 'undefined',
    }),
  ));

