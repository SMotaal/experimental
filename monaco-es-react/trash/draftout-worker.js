// / <reference types="typescript/lib/lib.webworker" />
// / <reference types="typescript/lib/lib.webworker.importscripts" />

BROWSER: if (typeof self === 'object' && self.self === self) {
  const configuration = {
    worker: {
      scriptURL: '/draftout-worker.js',
      options: {
        // scope: 'local',
        // type: 'module',
      },
    },
    modules: {
      base: '/lib/service-worker',
      client: [
        //
        'local-caches-client',
        'message-relay-client',
      ],
      worker: [
        'local-caches-service',
        'message-relay-service',
        //
        'auto-claim-clients',
      ],
    },
  };

  if (self.document && self.document.defaultView === self) initializeClient(configuration);
  else if (self.clients && self.clients.claim) initializeWorker(configuration);

  async function initializeClient({
    worker: {scriptURL, options},
    modules: {base, client: modules},
  }) {
    // TODO: Register service worker
    const registration = await navigator.serviceWorker.register(scriptURL, options);

    const scope = registration.scope.replace(/[/]$/, '');
    const key =
      localStorage['local-caches'] ||
      (localStorage['local-caches'] = (Math.random() * 10e8).toString(32));
    const local = new URL(`local/@${key}/`, location);

    console.log('Service Worker Registration: %O', registration);

    await registration.update();

    for (const module of modules) {
      await import(`${base}/${module}.js`).catch(console.warn);
    }

    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => {
        console.log('Waiting for Service Worker...');
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true});
      });
    }

    console.log('Service Worker Ready...');

    try {
      const response = await fetch(`${scope}/local/status/uptime`, {referrer: local});
      import(new URL(`status/client.js#${key}`, local))
        .then(console.log)
        .catch(console.error);
      // const response = await fetch(`${local}/status/uptime`);
      const uptime = new Date(await response.text());
      console.log(`Service uptime: %o`, uptime);
    } catch (exception) {
      console.log(exception);
    }
  }

  function initializeWorker({modules: {base, worker: modules}}) {
    // TODO: Initialize service worker
    self.importScripts(...modules.map(module => `${base}/${module}.js`));
  }
}

// const PascalCased = /[a-z](?=[A-Z])/g;
