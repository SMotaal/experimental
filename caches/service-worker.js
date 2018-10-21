/**
 * Caches Service Worker (v1) — Saleh Abdel Motaal — 2018
 * SEE: https://w3c.github.io/ServiceWorker/v1/
 */
{
  self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('fetch', event => {
    if (event.request.url.includes('/caches/')) {
      const matched = match(event.request);
      event.respondWith(matched);
      // matched && event.waitUntil(matched.then(console.log));
    }
  });

  // self.addEventListener('message', ({data: {command, arguments} = ''}) => {
  //   let result;
  //   switch (command) {
  //     case 'fetch':
  //   }
  // });

  const DEFAULT_CACHE = 'default';

  function match(request, cache = typeof DEFAULT_CACHE === 'string' && DEFAULT_CACHE) {
    match = async (request, cache = match.cache || self.caches) => {
      const matched = (await cache).match(request.url);
      // console.log({matched});
      return matched;
    };

    match.cache =
      cache &&
      ((typeof cache === 'string' &&
        self.caches.open(cache).then(cache => (match.cache = cache))) ||
        (typeof cache === 'object' && cache) ||
        undefined);

    console.trace('first match');

    return match(request, cache);
  }
}

// class CachesServiceWorker {
//   activate(event) {
//     event.waitUntil(self.clients.claim());
//   }

//   install(event) {
//     event.waitUntil(self.skipWaiting());
//   }

//   fetch(event) {
//     if (event.request.url.includes('/caches/')) {
//       const matched = match(event.request);
//       // event.waitUntil(matched);
//       event.respondWith(matched);
//     }
//   }

//   async match(request, cache = caches) {
//     return (await cache).match(request.url);
//   }
// }

// (match.cache &&
//   ('then' in match.cache && (match.cache = await match.cache), match.cache.match)) ||
//   (match.cache = caches);
// const CACHE = ;
// const defaultCache = self.caches.open(CACHE);
// const defaultCache = null; // self.caches.open('default');
// const emptyResponse = new Response(new Blob(['']));
