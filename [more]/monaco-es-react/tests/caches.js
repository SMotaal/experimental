/**
 * Caches Service Worker (v1) — Saleh Abdel Motaal — 2018
 *
 * Caches is an isomorphic Service Worker client and worker, designed to
 * service back content which is cached by the client or other service
 * workers. This pattern minimizes the chances of cache-lapses caused from
 * out-of-sync loads.
 *
 * SEE: https://w3c.github.io/ServiceWorker/v1/
 */
if (typeof self === 'object' && typeof navigator === 'object') {
  if (self.document && self.document.defaultView === self) {
    const firefox = `${navigator.userAgent || ''}`.includes('Firefox');
    const script = document.createElement('script');
    // script.setAttribute('type', 'module');
    script.type = 'module';
    script.textContent = `
      import {register} from '/services/caches-client.js';
      console.log('Registering');
      register('/caches.js').then(console.log);
    `;
    setTimeout(() => self.document.body.append(script));
    // firefox ? setTimeout(() => self.document.body.append(script))
    //   : self.document.body.append(script);
    // import('/services/caches-client.js').then(({register}) => register('/caches.js'));
  } else if (self.registration) {
    importScripts('/prototypes/prototypes.js');
    importScripts('/services/caches-worker.js');
    Prototypes.import('cachable').then(console.log, console.warn);
  }
}
