﻿# Modules › Parsing › Disambiguation <nav float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/parsing/Disambiguation.md)

## Motivation

The Node.js Modules working group is moving fast towards the of first official implementation of its new ECMAScript Modules module system. A lot of work has been made towards maximize out-of-band disambiguation of source text and minimize the need to rely on preparsing. There are few cases which will require some form of disambiguation by limited parsing.

An alternative to parsing could be attempt to execute code as ECMAScript module and rely on exceptions (ie early errors) to detect code that relies on fixtures unique to CommonJS. Such an approach is suitable for limited scenarios, with unpredictable outcomes for at least the following:

- Eval (`-e`) code relying on shorthand globals (ie `fs.…`).
- UMD modules with or without dependencies.
- CJS code making `import(…)` calls before failing at a `require(…)`.
- Partial evaluation before failure with any of the following:
  i. Deferred side-effects using timers, events, promises... etc.
  ii. Dereferenced process or worker threads.

## Considerations

- Effective parsing for source text disambiguation can:

  1. Use a single parse of just the necessary segment of a given source text.

  2. Excluding all text enclosed with strings or regular expressions.

  3. Remain indifferent to errors normally handled by the runtime.

  4. Afford reasonable flexibility in non-discriminating syntax features.

- Efficient parsing for source text disambiguation can:

  1. Avoid extranous parsing for "non-verbose" parsing.

  2. Avoid the creation of unnecessary objects or states.

  3. Avoid unnecessary parsing inside enclosures when possible.

  4. Avoid unnecessary costs associated with semantic and scope analysis.

  5. Disclose appropriate warnings to users opting to rely on such procedures.

- Effective syntax discrimination for ECMAScript modules includes:

  1. Top-level static `import` and `export` declarations.

  2. Meta properties references against `import`.

  3. By explicit fallback if there are no discrimination features.

- Effective syntax discrimination for CommonJS modules includes:

  1. Assignments to members of `exports` or `module.exports`.

  2. Direct assigment to `module.exports`.

  3. Calls to `require()` or `require.resolve()`.

  4. Additional opt-in criteria using "verbose" parsing:

     - Lack of ECMAScript modules discrimination criteria.
     - Lack of `import` statements.
     - Lack of shadowing declarations conflicting with discriminating entities.
     - Unshadowed references to `__dirname` and `__filename` (if no `exports`)

  5. By explicit fallback if there are no discrimination features.

> <cite>@ljharb</cite>
>
> - `Script` is the actual parse goal name, nothing’s called “Global” that i know of
> - re “In most cases”, currently it’s in all cases - even if that out-of-band mode is “use unambiguous parsing to infer”
> - `browser opt for defaulting to Module code` - browsers use `type="module"` first, and then every `import` within it
> - UMD modules are by definition not possible to be ESM, so i’m not sure why that’s relevant
> - `Effective syntax discrimination for ECMAScript modules includes:` usage of `with` means it’s Script
> - `Assignments to members of exports or module.exports.` and `Direct assigment to module.exports.` this occurs in lots of ESM code published on ESM, fwiw, so i don’t think that can be used to disambiguate
> - `Calls to require() or require.resolve().` is the same ^
> - `Lack of import statements.` does not guarantee it’s a Script.
> - `Unshadowed references to __dirname and __filename` could still be referring to globals from within ESM, so this can’t be used either

## Parsing

> **Note**: The following examples require a special renderer which can highlight `cjs` and/or `esm` keywords.

<figcaption><kbd>Ambiguous <code>INVALID</code></kbd> <i>JS Parsing Mode</i></figcaption>

```js
import fs from 'fs';
exports = require('fs');
async () => (exports = await import('fs'));
export default import.meta.url;
```

<figcaption><kbd>Ambiguous <code>INVALID</code></kbd> <i>CJS Parsing Mode</i></figcaption>

```cjs
import fs from 'fs';
exports = require('fs');
(async () => exports = await import('fs'));
export default import.meta.url;
```

<figcaption><kbd>Ambiguous <code>INVALID</code></kbd> <i>ESM Parsing Mode</i></figcaption>

```esm
import fs from 'fs';
exports = require('fs');
(async () => exports = await import('fs'));
export default import.meta.url;
```

<figcaption><kbd>Ambiguous <code>INVALID</code></kbd> <i>Disambiguation Parsing Mode</i></figcaption>

```esx
import fs from 'fs';
exports = require('fs');
(async () => exports = await import('fs'));
export default import.meta.url;
```

<!--

The ECMAScript specifications define two types of source code that can be externally loaded and executed at runtime, Global (script) code and Module code. As of this moment, the vast majority of the modules loaded today fall in the former category, include to a very large degree modules loaded in runtimes that support for ECMAScript modules.

In most cases, runtimes depend on out-of-band conditions to determine the mode used for external code. However, sometimes there is not sufficient out-of-band details from which the mode can be inferred.

For example, in browsers, when statically or dynamically importing particular specifiers without directly binding to entities that it may expose. In such cases, browser opt for defaulting to Module code based on solely on the trigger (ie `import`) of loading the resource as there is no out-of-band means to signal that a particular `text/javascript` resource is of either types.

Other platforms that deal with external code face similar complexities for interoperability between ECMAScript modules and other JavaScript modules formats that must be evaluated as Global code, (wrapped) Function code, or Eval code.

While implementors obviously opt for design decisions that limit these occurrences, it is essential to also appreciate that 100% out-of-band source text disambiguation often comes with trade-offs and those may be of more significant draw-backs to the enduser experience compared to the previously mentioned case for browsers.


## Scope

This work focuses on the disambiguation of source text based on discriminating syntax features for source texts lacking the necessary out-of-band details, using performant parsing approaches for locating the first valid occurrence of a positively discriminating feature, including but not limited to special `pragma` inserted by the authors for making the determination.

-->
