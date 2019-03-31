# Modules › Parsing › Patterns <span float-right><small>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental/blob/master/modules/parsing/disambiguation/Patterns.md)</small></span>

<blockquote>**Important Note**: This is an incomplete draft</blockquote>

## Dual Mode Interop in Node.js

### Exporting to ESM

<figure>

<figcaption><kbd>ESM <code>Valid</code></kbd> <b>Experimental Module</b>(ie <code>default</code>-only)</figcaption>

```js
export {default} from './legacy.js';
```

---

<figcaption><kbd>ESM <code>Shimmed</code></kbd> <b>Runtime Transpiled</b> (ie <code>@std/esm</code>… etc</figcaption>

```js
export * as fs from 'fs';
export {a, b, c} from './legacy.js';
```

---

<figcaption><figcaption><kbd>ESM <code>Proposed</code></kbd> <b>Dynamic Modules</b></figcaption>

```js
export {readFile} from 'fs';
export {a, b, c, default} from './legacy.js';
```

</figure>

### Exporting to CJS

<figure>

<figcaption><kbd>CJS <code>Valid</code></kbd> <b>Awaitable Exports</b></figcaption>

```js
(exported => {
	Object.setPrototypeOf(exports, {
		then: {value: ƒ => exported.then(ƒ)},
		catch: {value: ƒ => exported.catch(ƒ)},
		finally: {value: ƒ => exported.finally(ƒ)},
	}).then(imports => {
		Object.defineProperties(exports, Object.getOwnPropertyDescriptors(imports));
	});
})(import('./esm.js'));
```

---

<figcaption><kbd>CJS <code>Proposed</code></kbd> <b>Top Level Await</b></figcaption>

```js
module.exports = await import('./esm.js');
```

---

<figcaption><kbd>CJS <code>Theoretical</code></kbd> <b>Module-base API</b></figcaption>

```js
module.ready = import('./esm.js');
```

---

<figcaption><kbd>CJS <code>Theoretical</code></kbd> <b>Wrapper-base API</b></figcaption>

```js
exports('./esm.js');
```

</figure>

<!-- <style src="/markup/markup-hover.css"></style> -->
<style src="/markout/markup.css"></style>
