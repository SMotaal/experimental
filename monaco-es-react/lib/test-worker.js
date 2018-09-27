// new Worker(URL.createObjectURL(new Blob([`import('${origin}/lib/test-modules.js').then(console.log).catch(console.warn)`], {type: 'text/javascript'})))



// importScripts('./test-worker.mjs');
import('./test-worker.mjs').then(console.log, console.warn);
