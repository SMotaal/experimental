/**
 * Creates a service worker which would
 * yield control over requests back to
 * it their clients.
 */
(function initializeLoopBackService() {
  const caching = {};
  const contentTypesByExtension = {
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    html: 'text/html',
    htm: 'text/html',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };

  const serializableTypes = [Object, Array];
  // const transfarableTypes = [Blob, ReadableStream]

  const scope = registration.scope.replace(/[/]$/, '');
  const local = `${scope}/local`;
  const base = `${local}/`;

  /**
   *
   * @param {WindowClient} source
   * @param {*} param1
   */
  const cache = async (source, {key, filename, data, headers = {}}) => {
    if (!key || !filename) return;

    const sender = source.id;

    /** @type {Cache} */
    const cache = await (caching[key] || (caching[key] = self.caches.open(key)));

    if (filename === '*') {
      const keys = await cache.keys();
      console.log({cache, keys});
      const entries = [];
      for (const key of keys) {
        const url = `${key.url || key}`;
        if (data === null || !url.startsWith(base))
          cache.delete(key);
        else
          entries.push(url.slice(base.length));
      }
      return source.postMessage({caches: {key, entries}});
    }

    const url = new URL(filename, base);
    // url.username = key;
    // filename = url; // `${url}`; // .pathname;
    // const isLocal = filename.includes('/local/');
    filename = url.pathname; // `${url}`; // .pathname;
    const isLocal = filename.startsWith('/local/');


    // if (!isLocal)
    //   return console.error(`[cache] %o — not allowed`, filename);

    const ContentType = 'content-type' in headers ? 'content-type' : 'Content-Type';

    let contentType = headers[ContentType];

    if (data === null) return cache.delete(filename);

    const constructor = data.constructor;

    if (serializableTypes.includes(constructor)) {
      data = JSON.stringify(data);
      contentType || (contentType = 'application/json');
    }

    contentType = headers[ContentType] = contentType || 'text/plain';

    const blob = new Blob([`${data}`], {type: contentType});

    cache.put(filename, new Response(blob, {headers}));
  };

  // Listen for messages from clients
  self.addEventListener('message', event => {
    const source = event.source;
    const data = event.data;

    if (!('cache' in data) || !data.cache || !data.cache.key) return;

    event.waitUntil(cache(source, data.cache));
  });

  const onfetch = async event => {
    const url = new URL(event.request.url);

    // if (!url.startsWith(local)) return;
    if (url.origin !== local.origin) return;
    // return console.warn(`[fetch ${local}] <%o> — %O`, url, event);

    console.log(event.request);
    // console.count(`[fetch ${local}]`);

    // if (url === `${local}/status/uptime`) {
    // if (url.pathname === `/local/status/uptime`) {
    //   event.respondWith(
    //     new Response(uptime, {
    //       headers: {
    //         'content-type': 'text/plain',
    //       },
    //     }),
    //   );
    // }
  };

  self.addEventListener('fetch', onfetch);

})();
