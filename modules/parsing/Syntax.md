# Modules › Parsing › Syntax <nav float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/parsing/Syntax.md)

## Syntax

### Standard ECMAScript Modules

#### `import` Statements

```js
import 'specifier';
import DEFAULT from 'specifier';
import * as STAR from 'specifier';
import DEFAULT, {A, b as B, C} from 'specifier';
```

#### `export` Statements

<figcaption><i>Bindings</i></figcaption>

```js
export * as STAR from 'specifier';
export {A, b as B, C} from 'specifier';

import DEFAULT from 'specifier';
export { DEFAULT };

import * as STAR from 'specifier';
export { STAR, STAR as star };

import DEFAULT, {A, b as B} from 'specifier';
export { A, A as a , B, B as b };

const CONST = 1;
export { CONST, CONST as c\u034fonst }
```

<figcaption><i>Functions</i></figcaption>

```js
export function ƒ() {};
export async function ƒ() {};
export function* ƒ() {};
export async function* ƒ() {};
```

<figcaption><i>Classes</i></figcaption>

```js
export class Class {};
export class Class extends Super {};
```

<figcaption><i>Variables</i></figcaption>

```js
export var VAR;
export let LET;
export const CONST = 1;
export const { 0: $0, 1: $1, 2: $2, length } = [0, 1, 2];
export const [$0, $1, $2] = [0, 1, 2];
```

#### `export default` Statements

<figcaption><i>Bindings</i></figcaption>

```js
import DEFAULT from 'specifier';
export default DEFAULT;

import DEFAULT from 'specifier';
export { DEFAULT as default };

import * as STAR from 'specifier';
export default STAR;

import * as STAR from 'specifier';
export { STAR as default };

import DEFAULT, {A, b as B} from 'specifier';
export default B;

import DEFAULT, {A, b as B} from 'specifier';
export { B as default };

export {default} from 'specifier';
```

<figcaption><i>Functions</i></figcaption>

```js
export default function() {};
export default async function() {};
export default () => {};
export default async () => {};
export default function*() {};
export default async function*() {};
export default function ƒ() {};
export default async function ƒ() {};
export default function* ƒ() {};
export default async function* ƒ() {};
```

<figcaption><i>Classes</i></figcaption>

```js
export default class {};
export default class Class {};
export default class Class extends Super {};
```

<figcaption><i>Literals</i></figcaption>

```js
export default /Regular Expression/;
export default 1 / 2 / 3;
export default "String\
                spanning \
                multiple \
                lines";
export default `Template string
  spanning multiple lines
  ${ 'with nested String'.replace(/String/, m => {
    return 'String and Regular Expression' });
  }\n
`;
```

### Pre-ES2015 Module Formats

<figcaption><i>CommonJS</i></figcaption>

```js
module.exports = require('a');
/* FYI */ (require(__filename) === module.exports);
/* FYI */ (require(__filename) !== exports);

module.exports = [... exports] = [0, 1, 2, 3];
/* FYI */ (module.exports !== exports);

[... module.exports] = [... exports] = [0, 1, 2, 3];
/* FYI */ (module.exports !== exports);

module.exports = ([... exports] = [0, 1, 2, 3], module.exports);
/* FYI */ (module.exports === exports) === true;

module.exports = exports = function () {};

module.exports = exports = [0, 1, 2, 3];

module.exports = exports = new Array(4);
[exports[0], exports[1], exports[2], exports[3]] = [0, 1, 2, 3];

({A: export.A} = require('specifier'));
```

<figcaption><i>IIFE</i></figcaption>

```js
Parenthesized: (function() {})();

Parametrized: void (function() {})();
```

<figcaption><i>AMD</i></figcaption>

```js
// Source: https://www.jvandemo.com/a-10-minute-primer-to-javascript-modules-module-formats-module-loaders-and-module-bundlers/

//Calling define with a dependency array and a factory function
define(['dep1', 'dep2'], function(dep1, dep2) {
	//Define the module value by returning a value.
	return function() {};
});
```

<figcaption><i>UMD</i></figcaption>

```js
// Source: https://www.jvandemo.com/a-10-minute-primer-to-javascript-modules-module-formats-module-loaders-and-module-bundlers/
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['b'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory(require('b'));
	} else {
		// Browser globals (root is window)
		root.returnExports = factory(root.b);
	}
})(this, function(b) {
	//use b in some fashion.

	// Just return a value to define the module export.
	// This example returns an object, but the module
	// can return a function as the exported value.
	return {};
});
```

### Future Specs

<figcaption><i>Slice notation</i></figcaption>

```js
const arr = ['a', 'b', 'c', 'd'];

arr[1:];
// → ['b', 'c', 'd']

arr[:3];
// → ['a', 'b', 'c']

arr[1::2];
// → ['b', 'd']

arr[:3:2];
// → ['a', 'c']
```

<figcaption><i><code>do</code> Expressions</i></figcaption>

```js
let x = do {
	if (foo()) {
		f();
	} else if (bar()) {
		g();
	} else {
		h();
	}
};
```

<figcaption><i><code>throw</code> Expressions</i></figcaption>

```js
function save(filename = throw new TypeError('Argument required')) {}

lint(ast, {
	with: () => throw new Error("avoid using 'with' statements."),
});

function getEncoder(encoding) {
	const encoder =
		encoding === 'utf8'
			? new UTF8Encoder()
			: encoding === 'utf16le'
			? new UTF16Encoder(false)
			: encoding === 'utf16be'
			? new UTF16Encoder(true)
			: throw new Error('Unsupported encoding');
}

class Product {
	get id() {
		return this._id;
	}
	set id(value) {
		this._id = value || throw new Error('Invalid value');
	}
}
```

<figcaption><i>Class Fields and Decorators</i></figcaption>

```js
@defineElement('num-counter')
class Counter extends HTMLElement {
	@observed #x = 0;

	@bound
	#clicked() {
		this.#x++;
	}

	constructor() {
		super();
		this.onclick = this.#clicked;
	}

	connectedCallback() {
		this.render();
	}

	@bound
	render() {
		this.textContent = this.#x.toString();
	}
}
```

<figcaption><i>Hashbangs</i></figcaption>

```js
#!/usr/bin/env node

import fs from 'fs';
```

<figcaption><i>Numeric Separators</i></figcaption>

```js
1_000_000_000; // Ah, so a billion
101_475_938.38; // And this is hundreds of millions

let fee = 123_00; // $123 (12300 cents, apparently)
let fee = 12_300; // $12,300 (woah, that fee!)
let amount = 12345_00; // 12,345 (1234500 cents, apparently)
let amount = 123_4500; // 123.45 (4-fixed financial)
let amount = 1_234_500; // 1,234,500
```

<figcaption><i>Nullish Coalescing Operators</i></figcaption>

```js
const undefinedValue = response.settings?.undefinedValue ?? 'some other default'; // result: 'some other default'
const nullValue = response.settings?.nullValue ?? 'some other default'; // result: 'some other default'
const headerText = response.settings?.headerText ?? 'Hello, world!'; // result: ''
const animationDuration = response.settings?.animationDuration ?? 300; // result: 0
const showSplashScreen = response.settings?.showSplashScreen ?? true; // result: false
```

<figcaption><i>Logical Assignment Operators</i></figcaption>

```js
// "Or Or Equals" (or, the Mallet operator :wink:)
a ||= b;
a || (a = b);

// "And And Equals"
a &&= b;
a && (a = b);

// Eventually....
// "QQ Equals"
a ??= b;
a ?? (a = b);
```

<figcaption><i>Pipeline Operator</i></figcaption>

```js
let person = { score: 25 };

let newScore = person.score
  |> double
  |> add(7, ?)
  |> boundScore(0, 100, ?);

newScore //=> 57

class Comment extends Model |> Editable |> Sharable {}
```

<!-- <style src="/markup/markup-hover.css"></style> -->
<style src="/markout/markup.css"></style>
