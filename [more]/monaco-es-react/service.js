if (typeof self === 'object' && typeof navigator === 'object') {
  const serviceWorker = navigator.serviceWorker;

  const activate = async event => self.clients.claim();
  const install = async event => self.skipWaiting();

  const register = async () => {
    if (!serviceWorker || !serviceWorker.register) return;
    const registration = await navigator.serviceWorker.register('service.js');

    await registration.update();

    return registration;
  };

  const initialize = async () => {
    self.addEventListener('activate', event => event.waitUntil(activate(event)));
    self.addEventListener('install', event => event.waitUntil(install(event)));

    // console.log(localStorage['abc']);
  };

  serviceWorker && serviceWorker.register ? register() : initialize();
}
