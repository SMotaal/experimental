#!/usr/bin/env node --experimental-modules

console.clear();

// import('../packages/modules.js');
(async () => {
  await import('./lib/modules.mjs');
  await import('./specs/modules.js');
})()
