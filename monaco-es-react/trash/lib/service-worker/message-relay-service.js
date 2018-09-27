/**
 * Creates a service worker which would
 * listen to messages passed from it's
 * clients and forward them to all the
 * other clients
 */
(function initializeMessageRelayService() {
  // Listen for messages from clients
  self.addEventListener('message', async event => {
    const sender = event.source.id;
    const data = event.data;
    if (!('relay' in data)) return;
    const message = data.relay;
    const payload = {sender, message};
    const clients = await self.clients.matchAll();
    for (const client of clients) client.postMessage(payload);
  });
})();

// event.source: { focused: true, frameType: "top-level", id, type: "window", url, visibilityState: "visible" }
