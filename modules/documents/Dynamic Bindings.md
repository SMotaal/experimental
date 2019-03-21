# Dynamic Bindings <span float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/documents/Dynamic%20Bindings.md)</span>

<section>

ECMAScript modules introduced first-class binding semantics where it became possible for the first time to syntactically declare specific variables in scope to present as the one-way bound proxy of another from a different scope. Like other aspects of ECMAScript modules, the language as it stands today gapes to wide in offering first-class mechanisms that would leverage these additional capabilities outside the scope of ESM.

This closed-up design often demands implementation-level adjustments in order to provide any necessary interoperability layers between ESM and preexisting module systems that have historical significance.

</section><section>

## Motivating Examples

<section>

### Binding Definition

```js
let x;
const C = 1;
const bindings = {
  [x],        // unaliased one-way binding to a local variable
  [x as y],   // aliased one-way binding to a local variable
  [C],        // unaliased one-way binding to a local variable (constant)

  x2: x       // conventional reference assignment from a local variable
};
```

</section><section>

### Binding Declaration

```js
declare const bindings: {readonly [name: identifier]: any};

let {
  [y as x],   // one-way binding to a variable in a respective scope
  [C],        // one-way binding to a variable in a respective scope (constant)

  y,          // local variable initialized by a reference assignment
  ['y']: y2,  // local variable initialized by a reference assignment

  x2,         // conventional destructuring declaration and assignment
} = bindings;
```

</section><section>

## Related Work

This proposal is a first of series of proposals that will gradually aim at creating first-class parity in ways that honour the none-breaking principles of ECMAScript.

The outlook for these proposals is unclear but will likely involve:

<table><tr><td>

1. _Dynamic Bindings_ <kbd>Draft</kbd>

   Declarative syntax to make an `import` like binding in scope to an `export` like field on an object exposed from some scope, as a normative feature of future ECMAScript.

</td></tr><tr><td>

2. _Scope Reflection_ <kbd>Supplimentary</kbd>

   a. _Scope Reflection operations_ <kbd>TBD</kbd>

   Abstract methods for inspecting and/or augmenting a qualified scope through well-defined semantics that tie directly to its life-cycle stages, _exclusive_ of any abstract methods and runtime semantics for constructing or deriving the qualified scope itself.

   b. _Scope Reflection hooks_ <kbd>TBD</kbd>

   Runtime semantics for attaching special handlers to some life-cycle stages of a qualified scope, as a required precondition to ensure controlled and optimiziable Scope Reflection operations, whereby they would similarly operator and be aligned with all relevant preexisting mechanisms (ie property handlers and proxy traps… etc.).

   c. Reflect API extensions for Scopes <kbd>TBD</kbd>

   TBD.

</td></tr><tr><td>

3. _Dynamic Namespaces_ <kbd>Complimentary</kbd>

   Well-structured first-class entities meeting the interfacing requirements of an ECMAScript Module namespace making it well-suited for linking against while retaining validity of its consumers for both syntax and semantics, making it possible to achieve interoperability and conformance, as a discretionary recommendation of future ECMAScript at the very least.

</td></tr><tr><td>

4. _Namespace Reflection_ <kbd>Supplimentary</kbd>

   a. _Namespace Reflection operations_ <kbd>TBD</kbd>

   Abstract methods for inspecting and/or augmenting a qualified namespace through well-defined semantics that tie directly to its life-cycle stages, _**not** exclusive_ (at least potentially) oof any abstract methods and runtime semantics for constructing or deriving the qualified namespace itself.

   b. _Namespace Reflection hooks_ <kbd>TBD</kbd>

   Runtime semantics for attaching special handlers to some life-cycle stages of a qualified namespace, as a required precondition to ensure controlled and optimiziable Namespace Reflection operations, whereby they would similarly operator and be aligned with all relevant preexisting mechanisms (ie property handlers and proxy traps… etc.).

   c. Reflect API extensions for Namespaces <kbd>TBD</kbd>

   TBD.

</td></tr><tr><td>

5. _Dynamic Modules_ <kbd>Stage 1</kbd>

   Implementation-specific additions proposed on behalf of Node.js aim towards safely introducing non-ECMAScript Modules which were historically not designed for static linking into an otherwise conforming ECMAScript module graph.

   **Note**: Dynamic modules are an indepedent effort that preceeded the current work and are currently a "Stage 1" proposal by Bradly Farias in collaboration with Guy Bedford [Dynamic Modules](https://github.com/nodejs/dynamic-modules).

</td></tr></table>

<section>

</section>
