(async () => {
  const args = ['…'];
  const globals = Object.values(this || (1, eval)('this'));
  const textify = async value => {
    let text = '';
    let type = (value == null && 'null') || typeof value;

    if (type == null || type === 'symbol') return '<${type}>';

    if (type === 'function')
      return (
        !value.prototype ||
        (value.prototype instanceof Function &&
          `<${(value.constructor && value.constructor.name) || 'ƒ'}> ${value.name}()`) ||
        `<class> ${value.name || value.prototype[Symbol.toStringTag]}`
      );

    if (type !== 'object') return `${JSON.stringify(value)}`;

    if (value instanceof String) return `<${value[Symbol.toStringTag] || 'String'}> "${value}"`;

    let iterator = value[Symbol.iterator];
    const limit = 10;
    if (iterator) {
      const Class = [Array, Map, Set, WeakMap, WeakSet].find(C => value instanceof C);
      const size = !Class ? NaN : Class === Array ? value.length : value.size;
      return `<${(Class && Class.name) || value[Symbol.toStringTag] || 'Iterable'}> [ ${(Class &&
        (await Promise.all([...value].slice(0, limit).map(textify))).join(', ')) ||
        '…'}${(size > limit && `, … ${size - limit}`) || ''} ]`;
    }

    if (globals.includes(value))
      return `${value[Symbol.toStringTag] || (value.constructor && value.constructor.name)}`;

    const keys = Reflect.ownKeys(value);

    return `<${value[Symbol.toStringTag] ||
      (value.constructor && value.constructor.name)}> {${keys.length && ` ${keys.join(', ')} ` || ''}}`;
  };

  {
    const functionSets = [
      [
        /* prettier-ignore */
        function A() { return [this, ... arguments]; },
        /* prettier-ignore */
        function* B() { return [this, ... arguments]; },
      ],
      [
        /* prettier-ignore */
        async function A2() { return [this, ... arguments]; },
        /* prettier-ignore */
        async function* B2() { return [this, ... arguments]; },
      ],
    ];

    const tests = [ƒ => ƒ(...args), ƒ => new ƒ(...args)];

    let code = '';

    for (functions of functionSets) {
      code += `\n\n${functions.join('\n\n')}\n\n`;

      for (const test of tests) {
        const body = `${test}`
          .replace(/ƒ *=> *{?([^]*);? *}? *$/, '$1')
          .replace(/\.{3} *args/g, '…');
        for (const ƒ of functions) {
          code += `\n ${`${body.replace(/ƒ/g, ƒ.name)};`.padEnd(10)}`;
          try {
            let returns = test(ƒ);
            code += ` // returns ${(await textify(returns)).replace(/"…"/g, '…')}\n`;
          } catch (error) {
            code += ` // throws ${error}\n`.replace(/ƒ/g, ƒ.name);
          }
        }
      }
    }

    console.log(code);
  }
})();
