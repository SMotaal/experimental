# ESX

## Experimental

At the moment, ES Modules do not directly include fallback support for legacy runtimes. The only solutions to date are AOT transpilation with platform mechanisms like `nomodule` and even then, many simply avoid ES modules.

A different alternative is proposed which can minimize the gap between ES Module source text and the code evaluated within environments that do not support. It tries to mitigate the performance burden of eager AOT transpilation by using a JIT transpiler that targets a new module subsystem.

### Framework

#### Evaluator

A number of designs are explored to select an evaluator that provide the best balance between interoperability, performance, and spec compliance.

```js
new function(module) {
  with (module.scope)
    (exports => {
      'use strict';
      exports(() => a);
      var a;
      exports.default(a);
    })(module.export);
}(context);
```

**Caveats**

- `this` references cannot be coerced to undefined.
