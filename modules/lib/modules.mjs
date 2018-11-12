import ModuleScope from './module-scope.mjs';

((global) => {
  global.ModuleScope = ModuleScope;
})(
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))()
)
