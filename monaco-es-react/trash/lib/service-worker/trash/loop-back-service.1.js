/**
 * Creates a service worker which would
 * yield control over requests back to
 * it their clients.
 */
(function initializeLoopBackService() {
  self.addEventListener('message', event => {
    // TODO: Handle event
    // TODO: Don't yield unless asked
  });
})();
