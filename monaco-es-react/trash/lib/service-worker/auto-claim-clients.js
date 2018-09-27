// / <reference types="typescript/lib/lib.webworker" />
// / <reference types="typescript/lib/lib.webworker.importscripts" />
/**
 * Immediately claim any new clients.
 * This is not needed to send messages,
 * but makes for a better experience
 * since the user does not need to
 * refresh.
 */
(function autoClaimClients() {
  const includeUncontrolled = true;
  const uptime = new Date().toISOString();
  // const local = self.registration.scope.replace(/[/]?$/, '/local');
  const scope = new URL(self.registration.scope);
  const local = new URL('local/', scope);

  const onactivate = async event => {
    // const clients = await self.clients.matchAll({includeUncontrolled});
    // for (const client of clients) console.log('Service Worker Client: %O', client);
    return self.clients.claim();
  };

  self.addEventListener('activate', event => event.waitUntil(onactivate(event)));

  const oninstall = async event => {
    return self.skipWaiting();
  };

  self.addEventListener('install', event => event.waitUntil(oninstall(event)));

  const onfetch = async event => {
    const url = new URL(event.request.url);

    // if (!url.startsWith(local)) return;
    if (url.origin !== local.origin) return;
    // return console.warn(`[fetch ${local}] <%o> — %O`, url, event);

    console.log(event.request);
    // console.count(`[fetch ${local}]`);

    // if (url === `${local}/status/uptime`) {
    if (url.pathname === `/local/status/uptime`) {
      event.respondWith(
        new Response(uptime, {
          headers: {
            'content-type': 'text/plain',
          },
        }),
      );
    }
  };

  self.addEventListener('fetch', onfetch);
})();

// console.log('[fetch]: <%O>%O', url, event);
//
