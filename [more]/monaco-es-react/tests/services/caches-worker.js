/**
 * Caches Service Worker (v1) — Saleh Abdel Motaal — 2018
 * SEE: https://w3c.github.io/ServiceWorker/v1/
 */
{
  const safari = `${navigator.vendor || ''}`.startsWith('Apple');

  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
  self.addEventListener('fetch', event => {
    if (event.request.url.includes('/caches/')) {
      const matched = match(event.request);
      // event.waitUntil(matched);
      event.respondWith(matched);
    }
  });

  function match(request, cache) {
    const defaultCache = self.caches.open('default');
    // const defaultCache = null; // self.caches.open('default');
    const emptyResponse = new Response(new Blob(['']));

    match = async (request, cache = defaultCache) => {
      const url = request.url;
      // safari && (await new Promise(resolve => setTimeout(resolve, 1000)));
      let matched = (await defaultCache).match(url);
      return matched; //  || emptyResponse;
    };

    console.trace('first match');

    return match(request, cache);
  }
}
