if (
  (typeof global !== 'undefined' && global && global.global === global) ||
  (typeof self !== 'undefined' &&
    (self && self.self === self) &&
    (self.global && Object.defineProperty(self, 'global', {value: self})))
) {
  // const worker = (typeof window === 'object' && window.window
  //   ? function*() {
  //     new Worker()
  //   }
  //   : async function*() {})();


} // else console.warn('[WORKER]: Unsupported runtime');
