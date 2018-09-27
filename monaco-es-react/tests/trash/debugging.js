// if (!navigator.serviceWorker.controller) debugger;
async function waitForServiceWorkerController(timeout = 1000) {
  if (!navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.getRegistration();

    const waiting = new Promise(resolve => {
      setTimeout(resolve, timeout);
      navigator.serviceWorker.addEventListener('controllerchange', () =>
        resolve(navigator.serviceWorker.controller, {once: true}),
      );
    });

    registration.update();
    await waiting;
    // Force reload
    navigator.serviceWorker.controller || (location = `${location}`);
  }
  return;
}
