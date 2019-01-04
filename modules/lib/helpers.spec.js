console.clear();
const inspect = new class Inspect {
  constructor(defaults = {}) {
    this.ready = import('util')
      .then(({inspect}) => void (this.format = inspect))
      .catch(() => {});
    return Object.setPrototypeOf((value, options) => {
      console.dir(value, {...defaults.options, ...options});
    }, Object.assign(this, defaults));
  }

  format(value, options) {
    return value;
  }

  auto(value, customInspect) {
    return value != null && value instanceof Object
      ? ({
          [this.custom]: customInspect = (value[this.custom] =
            customInspect || this[`[${typeof value}]`] || this[Object.prototype.toString.call(value)]),
        } = value)
      : value;
  }

  '[function]'(depth, {stylize = String} = {}) {
    return stylize(`${this}`.trim(), 'special');
  }
}({
  custom: Symbol.for('nodejs.util.inspect.custom'),
  options: {
    breakLength: 40,
    // depth: 3,
    customInspect: true,
    colors: true,
    // compact: false,
  },
});

/// Functions

(async () => {
  await inspect.ready;

  const {bind, call} = await import('./helpers.js');
  const methods = {bind, call};
  // export const bind = Function.call.bind(Function.bind);
  // export const call = Function.call.bind(Function.call);
  // export const unbind = bind.bind(call);

  class FunctionResult {
    constructor(lexicalThis, argumentList, newTarget, properties) {
      [this.this, this.arguments, this['new.target']] = arguments;
      Object.assign(this, properties);
    }
    // [inspect.custom](depth, {stylize = String} = {}) {
    //   const {this: lexicalThis, arguments: argumentList, 'new.target': newTarget} = this;
    // }
  }

  class Record {
    constructor(key, value) {
      [this.key, this.value] = arguments;
      Object.freeze(this);
    }
    [inspect.custom](depth, {stylize = String} = {}) {
      let {key, value} = this;
      const inset = ' '.repeat(2 * depth || 0);
      const keyType = typeof key;
      const head = (key != null && `${stylize((key = `${key}`.trim()), keyType)}:`) || '';
      const offset = (head && ' '.repeat(1 + Math.ceil(key.length / 8) * 8)) || '';
      const indent = `\n${inset} ${offset}`;
      // const body = inspect
      //   .format(value, {...arguments[1], compact: true})
      //   .replace(/\s*[\[{]\s*\n\s*|\s*\n\s*[\]}]\s*|[,;\(]\s*\n|\n\s*[\)]/g, a => ` ${a.trim()} `);
      const body = inspect.format(value, {...arguments[1], compact: true});
      // .replace(/\s*[\[{]\s*\n\s*|\s*\n\s*[\]}]\s*|[,;\(]\s*\n|\n\s*[\)]/g, a => ` ${a.trim()} `);
      return `${inset}${head}${' '.repeat(offset.length - key.length)}${body.replace(/\n/g, indent)}`;
    }
  }

  class TestResult extends Array {
    constructor(name, test) {
      const state = Object.create(null);
      // Object.defineProperty(super(new Record('test', test)), Symbol.toStringTag, {value: name});
      // super(new Record('test', test));
      super(test);
      Object.defineProperty(this, Symbol.toStringTag, {value: name});
      Object.defineProperty(this, 'state', {value: state});
      return new Proxy(this, {
        set: (target, property, value) => {
          typeof property === 'string' && isNaN(property)
            ? this.push(new Record(property, (state[property] = value)))
            : Reflect.set(this, property, value);
          return true;
        },
        get: (target, property) => {
          return property in state ? state[property] : this[property];
        },
        ownKeys: () => Reflect.ownKeys(state),
      });
    }
    [inspect.custom](depth, options = {}) {
      // const inset = ' '.repeat(2 * depth || (depth = 0));
      options = {...options, compact: true};
      return this.map(record => inspect.format(record, options)).join(`\n`);
    }
  }

  const run = (name, test) => {
    const result = new TestResult(name, test);
    try {
      result.returned = test();
      return (
        (result.returned &&
          typeof result.returned.then === 'function' &&
          (async () => result.returned)()
            .then(resolved => ((result.resolved = resolved), result))
            .catch(rejected => ((result.rejected = rejected), result))) ||
        result
      );
    } catch (thrown) {
      result.thrown = thrown;
    }
    return result;
  };

  const fixtures = {
    '<function>': ƒ =>
      function(...argumentList) {
        return new FunctionResult(this, argumentList, new.target);
      },
    '<arrow function>': ƒ => (...argumentList) => {
      return new FunctionResult(this, argumentList, null);
    },
    '<async function>': ƒ =>
      async function(...argumentList) {
        return new FunctionResult(this, argumentList, new.target);
      },
    '<async arrow function>': ƒ => async (...argumentList) => {
      return new FunctionResult(this, argumentList, null);
    },
    '<generator function>': ƒ =>
      function*(...argumentList) {
        return new FunctionResult(this, argumentList, new.target);
      },
    '<async generator function>': ƒ =>
      async function*(...argumentList) {
        return new FunctionResult(this, argumentList, new.target);
      },
    '<class>': ƒ => class extends FunctionResult {},
    '<class method>': ƒ =>
      new class {
        method(...argumentList) {
          return new FunctionResult(this, argumentList, new.target);
        }
      }().method,
  };

  const tests = {};

  for (const fixture in fixtures) {
    tests[fixture] = ({argumentList}) => ({
      bind: ƒ => bind(fixtures[fixture](), ...argumentList)(),
      call: ƒ => call(fixtures[fixture](), ...argumentList),
    });
  }

  SPEC: {
    const results = {};
    const argumentList = [1, 2, 3];
    const argumentText = inspect
      .format(argumentList, {compact: true, colors: true})
      .trim()
      .slice(1, -2)
      .trim();
    for (const fixture in tests) {
      // console.group(`\n`, fixture);
      const fixtureTests = tests[fixture]({argumentList});
      for (const methodName in methods) {
        // const method = inspect.auto(methods[methodName]);
        const test = inspect.auto(fixtureTests[methodName]);
        // const test = fixtureTests[methodName];
        const string = `${test}`
          .replace(/fixtures\[fixture\](?:\(\))?/, fixture)
          .replace('...argumentList', argumentText);
        // const string = `${test}`.replace('fixtures[fixture]', inspect.format(inspect.auto(fixtures[fixture]())));
        test.toString = () => string;
        // test[inspect.custom] = () => string;
        const name = `${methodName}(${fixture})`;
        const promise = (results[name] = run(name, test));
        const result = (results[name] = await promise);
        inspect(result);
        console.log('\n');
        // console.group(`\n%s(%s, … %O) =>`, methodName, fixture, argumentList);
        // console.groupEnd();
      }
      // console.groupEnd();
    }
  }
})();

/*//////////////////////////////////////////////////////////////////////////////

 TEST:  node -pe "console.dir({[Symbol.for('nodejs.util.inspect.custom')](depth, options){return [... arguments];}}, {customInspect:true, colors: true, depth: 10, compact: false})"

//////////////////////////////////////////////////////////////////////////////*/
