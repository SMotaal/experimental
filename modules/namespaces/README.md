# Modules › Namespaces <code tag>Draft</code> [<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/namespaces/)

The ECMAScript Module specifications, as of this moment, fall short of providing a predictable approach for implementors to work with namespaces which are not compliant to those returned by a SourceTextModule. Instead, they offer certain allowances that make it possible for implementors to optionally diverge to accommodate behaviours of namespaces.

It seems reasonable for the ECMAScript TC39 committee to futher consider the need for the conformance criteria of such constructs that would enable them to meet the wider range of behaviours that would not violate the technical requirements needed to ensure that such namespaces are interoperable with the ECMAScript modules.

---

## Introduction

Feedback from TC39 regarding proposals aiming to close gaps between historically prominent JavaScript module formats (such as CommonJS) which were designed in the absence of ECMAScript's static linking semantics introduced in ES2015, highlights the committee's eagerness to work with implementors to resolve barriers for interoperability.

An assumed notion by everyone involved in those efforts leans towards tenable solutions which would not affect the current specifications relating to the static linking for ECMAScript modules and make it possible to completely preserve the semantics of `import` and `export` declarations while affording equivalent utility of the same when linking against non-standard modules at the implementor's discression.

Clearly, the most critical aspects to be considered where interoperability is involved is the ability to provide compatible interfaces of the exported bindings with the intrinsics needed to declare, initialize and update those bindings, not limited to the current source text evaluation scenario.

Such a notion that aligns well with the concept of namespaces cannot be narrowly viewed as the thing that solves immediate problems if doing so will potentially limit the ability of leveraging this broader concept in order to solve the less-visible problems that unfold down the road.

Consequently, this effort starts with the most abstract notion of a namespace dealing with dynamic bindings, looking closely on going efforts that can leverage such a construct to improve or simplify complexities related to bindings.

### Rationale

Due to the vastly different challenges and behaviours of the non-standard module systems and implementations, it seems unreasonable to device a counterpart to "Static Modules" capable of meeting the requirements of all existing and future implementations.

With this premise, it seems reasonable to consider this counterpart to be a gray area that needs to retain flexibility across conforming implementations of ECMAScript runtimes.

Dynamic Namespaces could be proposed as the constructs that would enable implementors to retain conformances that completely preserve the semantics of `import` and `export` declarations of SourceText modules interoperating with namespaces of any proprietary module format.

### Motivating Examples

<figure>

#### Builtin Namespaces

<div><div>

<figcaption><kbd>Browser</kbd></figcaption>

```js
import * as navigator from 'navigator';
import {serviceWorker} from 'navigator';
```

</div>
<div>

<figcaption><kbd>Node.js</kbd></figcaption>

```js
import * as fs from 'fs';
import fs, {readFile} from 'fs';
```

</div></div>
</figure>

<figure>

#### Non-standard Namespaces

<div><div>

<figcaption><kbd>Legacy Modules</kbd></figcaption>

```js
import * as server from 'my-server';
import serve, {Static} from 'my-server';
```

</div>
<div>

<figcaption><kbd>Abridged Modules</kbd></figcaption>

```js
/* … */
```

</div></div>
</figure>

<figure>

#### Synthetic Namespaces

<div><div>

<figcaption><kbd>Attenuated Modules</kbd></figcaption>

```js
/* … */
```

</div>
<div>

<figcaption><kbd>Encrypted Modules</kbd></figcaption>

```js
/* … */
```

</div></div>
</figure>

<figure>

#### Dynamic Namespaces

<div><div>

<figcaption><kbd>First-class Namespaces</kbd></figcaption>

```js
export namespace foo {
  export const x = 1;
}
```

</div>
<div>

<figcaption><kbd>Reflective Namespaces</kbd></figcaption>

```js
/* … */
```

</div></div>

</figure>

---

## Background

### Synopses

- Bindings are the fundamental mechism of namespaces as they relate to the current ECMAScript specs, and limited only to _one-way_ binding.

- Currently, there are at least two distinct forms _one-way_ bindings which relate to the current scope. We will refer to them as _import bindings_ and _export bindings_ to signify their contrasting _pull_ versus _push_ behaviours.

- This work assumes that there are valid arguments for the two outlined forms one-way bindings as they relate to different problem spaces.

- If we strip away all other aspects of the current ECMAScript Modules specifications, we can argue that the current binding semantics operating on the notion of static bindings are not sufficiently suited for many forms of dynamically evaluated namespaces.

### Concepts

<figure>

**Import Bindings**

In the simplist form, the basic idea of namespaces can be expressed using a block closure, and a theoretical `exports` function used to bind a getter to encapsulated entities:

```js
NamespaceScope: {
	// Setup
	await namespace.imports(/* … */);

	// Evaluation
	with (await namespace.createContext()) {
		let entity;
		exports({entity: () => entity});

		/* Statements */
		entity = new SomeImportedEntity();
	}
}
```

This form makes it possible to retain the full declaration syntax (ir `let` and `const`… etc.) within the scope of a namespace.

</figure>
<figure>

**Export Bindings**

In the current specifications for Module namespaces, the above idea is inverted, which is not easily expressed with a simple example but follows along these lines:

```js
NamespaceScope: {
	// Setup
	await namespace.exports(['a', 'B']);
	await namespace.imports(/* … */);

	// Evaluation
	with (await namespace.createContext()) {
		// export let a = 1
		a = 1;

		// export const B = IMPORTED_C;
		const B = exports.B.set(IMPORTED_C);
	}
}
```

This form aligns with the current specification of Module namespace objects and intentionally affords implementors certain latitude for optimizations that do not violate the _push_ behaviours of the bindings.

</figure>

---

## Proposal

### Considerations

- Allowing implementors to provide 100% support for maximum interoperability between the namespaces of ECMAScript modules (SourceTextModule) and respective namespace representations that are not within the same prevue are vital for:

  1. Making it possible for runtimes which are 100% compliant with the ECMAScript specifications and vastly relied upon in the JavaScript ecosystem which historically employed reliable runtime-evaluated JavaScript module systems to devise layers of interoperability needed to encourage the adoption ECMAScript modules through workable paths for gradual migration.

  2. Affording the ability for reasonable interoperability with any potential new module formats with suitable ECMAScript interfaces to be able to predictably utilize the same module bindings semantics universally across all interested implementors.

  3. Further optimizing the loading, instantiation and evaluation behaviours for platforms that may require different optimization criteria than those enforced by the SourceTextModule when dealing with bindings throughout their dependency graphs.

- Allowing ECMAScript runtimes to extend the use of the same binding mehcanisms used for namespaces to create namespace-like constructs which may or may not be directly configurable by executing code is vital for:

  1. Devising a novel approach for creating object-bound closures without the pitfalls of the deprecated `with` syntax as a more suitable alternative for such use cases.

  2. Providing proxy-like facilities that are compatible with the special behaviours of namespace targets to make it possible to limit or alter the entities of namespaces exposed to certain consumers.

---

## References

### Prior Arts

- WASM…
- Dynamic Modules…
