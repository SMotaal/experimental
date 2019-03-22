# Dynamic Bindings <span float-right><small>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/documents/Dynamic%20Bindings.md)</small></span>

<section>

ECMAScript modules introduced first-class binding semantics where it became possible for the first time to syntactically declare specific variables in scope to present as the one-way bound proxy of another from a different scope. Like other aspects of ECMAScript modules, the language as it stands today gapes too wide in offering first-class mechanisms that would leverage these additional capabilities outside the scope of ESM.

This closed-up design often demands implementation-level adjustments in order to provide any necessary interoperability layers between ESM and preexisting module systems that have historical significance.

<blockquote>**Important Note**: While this proposal presents the complete syntaxes for first-class support of bindings, the more fundamental aspect of this work is to work towards it without stipulations on what a reasonable level of first-class support needs to be for interoperability in a well-controlled manner.</blockquote>

</section>

<section>

## Motivating Examples

<section>

### Dynamic Import Bindings

```js
/// exporter.js
export let counter = 0;
export const count = () => ++counter;

/// consumer1.js
// without Dynamic Bindings
import('module.js').then((exporter) => {
  const {count} = exporter;
  while (count() < 10) console.log(exporter.counter);
});

/// consumer2.js
// with Dynamic Bindings
import('module.js').then(({[counter], [count]}) => {
  while (count() < 10) console.log(counter);
});
```

</section>
</section>

<section>

## Proposed Syntax

```js
/** Creates an object with bindings to scoped variables */
const createBindings = () => {
  let x;
  const C = 1;
  return bindings = {
    [x],      // unaliased one-way binding to a local variable
    [x as y], // aliased one-way binding to a local variable
    [C],      // unaliased one-way binding to a local variable (constant)

    x2: x     // conventional reference assignment from a local variable
  };
};

consumer: {
  let {
    [x],      // one-way binding to a variable in a respective scope
    [y as z], // one-way binding to a variable in a respective scope
    [C],      // one-way binding to a variable in a respective scope (constant)

    y,        // local variable initialized by a reference assignment
    ['y']: u, // local variable initialized by a reference assignment

    x2,       // conventional destructuring declaration and assignment
  } = createBindings();

  // use bindings as if they were statically declared imports
}
```

</section>

<section>

## Related Works

This proposal is a one of several proposals aim at briding the modules gap.

Some of these proposals are considered complimentary in that they provide direct utility to or benefits greatly from other proposals aimed directly at solving the interoperability gap.

Others are merely supplimentary proposals that may provide a more rounded developer experience around proposals that would solve the interoperability gap.

<section>

### _Dynamic Bindings_ <kbd>Complimentary</kbd>

Declarative syntax to make an `import` like binding in scope to an `export` like field on an object exposed from some scope, as a normative feature of future ECMAScript.

<details><summary><h4>_Scope Reflection_ <kbd>Supplimentary</kbd></h4></summary>

##### _Scope Reflection operations_

Abstract methods for inspecting and/or augmenting a qualified scope through well-defined semantics that tie directly to its life-cycle stages, _exclusive_ of any abstract methods and runtime semantics for constructing or deriving the qualified scope itself.

##### _Scope Reflection hooks_

Runtime semantics for attaching special handlers to some life-cycle stages of a qualified scope, as a required precondition to ensure controlled and optimiziable Scope Reflection operations, whereby they would similarly operator and be aligned with all relevant preexisting mechanisms (ie property handlers and proxy traps… etc.).

##### Reflect API extensions for Scopes

TBD.

</details>

</section><hr/><section>

### _Dynamic Namespaces_ <kbd>Complimentary</kbd>

Well-structured first-class entities meeting the interfacing requirements of an ECMAScript Module namespace making it well-suited for linking against while retaining validity of its consumers for both syntax and semantics, making it possible to achieve interoperability and conformance, as a discretionary recommendation of future ECMAScript at the very least.

<details><summary><h4>_Namespace Reflection_ <kbd>Supplimentary</kbd></h4></summary>

##### _Namespace Reflection operations_

Abstract methods for inspecting and/or augmenting a qualified namespace through well-defined semantics that tie directly to its life-cycle stages, _**not** exclusive_ (at least potentially) of any abstract methods and runtime semantics for constructing or deriving the qualified namespace itself.

##### _Namespace Reflection hooks_

Runtime semantics for attaching special handlers to some life-cycle stages of a qualified namespace, as a required precondition to ensure controlled and optimiziable Namespace Reflection operations, whereby they would similarly operator and be aligned with all relevant preexisting mechanisms (ie property handlers and proxy traps… etc.).

##### Reflect API extensions for Namespaces

TBD.

</details>

</section><hr/><section>

### _Dynamic Modules_ <kbd>Complimentary</kbd>

<blockquote>**Note**: [Dynamic Modules](https://github.com/nodejs/dynamic-modules) are an indepedent effort that preceeded the current work and is currently a "Stage 1" proposal by Bradly Farias in collaboration with Guy Bedford.</blockquote>

Implementation-specific additions proposed on behalf of Node.js aim towards safely introducing non-ECMAScript Modules which were historically not designed for static linking into an otherwise conforming ECMAScript module graph.

</section>

</section>
