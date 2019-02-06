<small float-right>
<a href="//github.com/SMotaal/experimental/blob/master/modules/documents/Dynamic%20Namespaces.md" target="_blank">GitHub</a>
</small>

# Dynamic Namespaces

The ECMAScript Module specifications, as of this moment, fall short of providing a predictable approach for implementors to work with namespaces which are not compliant to those returned by a SourceTextModule. Instead, they offer certain allowances that make it possible for implementors to optionally diverge to accommodate behaviours of namespaces.

It seems reasonable for the ECMAScript TC39 committee to futher consider the need for the conformance criteria of such constructs that would enable them to meet the wider range of behaviours that would not violate the technical requirements needed to ensure that such namespaces are interoperable with the ECMAScript modules.

## Rationale

### Motivating Examples

```js
// Theoretically for browsers
import * as navigator from 'navigator';
import {serviceWorker} from 'navigator';

// Node.js Builtins
import * as fs from 'fs';
import fs, {readFile} from 'fs';

// Node.js CommonJS Dependency
import * as server from 'my-server';
import serve, {Static} from 'my-server';

// Add WASM... etc
```

### Prior Arts

- WASM…
- Dynamic Modules…

### Considerations

- Allowing implementors to provide 100% support for maximum interoperability between the namespaces of ECMAScript modules (SourceTextModule) and respective namespace representations that are not within the same prevue are vital for:

  1. Making it possible for runtimes which are 100% compliant with the ECMAScript specifications and vastly relied upon in the JavaScript ecosystem which historically employed reliable runtime-evaluated JavaScript module systems to devise layers of interoperability needed to encourage the adoption ECMAScript modules through workable paths for gradual migration.

  2. Affording the ability for reasonable interoperability with any potential new module formats with suitable ECMAScript interfaces to be able to predictably utilize the same module bindings semantics universally across all interested implementors.

  3. Further optimizing the loading, instantiation and evaluation behaviours for platforms that may require different optimization criteria than those enforced by the SourceTextModule when dealing with bindings throughout their dependency graphs.

- Allowing ECMAScript runtimes to extend the use of the same binding mehcanisms used for namespaces to create namespace-like constructs which may or may not be directly configurable by executing code is vital for:

  1. Devising a novel approach for creating object-bound closures without the pitfalls of the deprecated `with` syntax as a more suitable alternative for such use cases.

  2. Providing proxy-like facilities that are compatible with the special behaviours of namespace targets to make it possible to limit or alter the entities of namespaces exposed to certain consumers.
