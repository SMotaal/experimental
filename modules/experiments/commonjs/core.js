export let binding, internalBinding, BuiltinModule;

import {Core} from './internal/core.js';

new Core({
  // Hooks to wire the bootstrapper to namespace exports
  hooks: {
    binding: {get: () => binding, set: value => (binding = value)},
    internalBinding: {get: () => internalBinding, set: value => (internalBinding = value)},
    BuiltinModule: {get: () => BuiltinModule, set: value => (BuiltinModule = value)},
  },
});
