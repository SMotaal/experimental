# Modules Experiment: CommonJS

Yet another implementation of Node.js CommonJS module system. This one authored as ECMAScript modules and is intended to be used only on supporting runtimes. It also tries to leverages other modern language features like classes cautiously, i.e. with partial-encapsulation, freezing and non-configurable properties.

> NOTE: This code is only a couple of days old and far from operational. The initial efforts were to devise safe patterns for inheritance (which is easier to inspect independent from the logic).

## Prior Art

<dl>

<dt>

Node.js

<dd>

_Latest Implementation_ <kbd>[`master`/lib][nodejs-legacy-lib]</kbd>

- [Modules][nodejs-latest-modules]
- [Bootstrap - Loaders][nodejs-latest-bootstrap-loaders]

[nodejs-latest-lib]: https://github.com/nodejs/node/tree/master/lib/
[nodejs-latest-modules]: https://github.com/nodejs/node/tree/master/lib/internal/modules
[nodejs-latest-bootstrap-loaders]: https://github.com/nodejs/node/blob/master/lib/internal/bootstrap/loaders.js

_Legacy Implementation_ <kbd>[`v7.0.0`/lib][nodejs-latest-lib]</kbd>

- [Module][nodejs-legacy-module]
- [Bootstrap - NativeModule][nodejs-legacy-native-module]

[nodejs-legacy-lib]: https://github.com/nodejs/node/blob/v7.0.0/lib/
[nodejs-legacy-module]: https://github.com/nodejs/node/blob/v7.0.0/lib/module.js
[nodejs-legacy-native-module]: https://github.com/nodejs/node/blob/v7.0.0/lib/internal/bootstrap_node.js#L396-L495

<dt>

Community

<dd>

_bmeck/node-module-system_ <kbd>[`master`][bmeck-node-module-system]</kbd>

[bmeck-node-module-system]: https://github.com/bmeck/node-module-system/blob/master/lib/index.js

</dl>
