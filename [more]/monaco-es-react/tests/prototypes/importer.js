{
  // function Importer(base) {}

  /// Bootstrapping ///
  const globals = {
    self: typeof self === 'object' && self.self === self && self,
    global: typeof global === 'object' && global.global === global && global,
  };

  const contexts = {};

  if (globals.self) {
    let browser = false;

    const self = globals.self;
    const window = self.window === self && self;
    const name = `${(self.constructor && self.constructor.name) || ''}`;

    if (window && window.document && window.document.defaultView === window) {
      (browser || (browser = {context: 'browser-window'})).window = globals.window = window;
      browser.document = window.document || false;
      browser.navigator = window.navigator || false;
    } else if (name.includes('Worker')) {
      (browser || (browser = {context: 'browser-worker'})).worker = worker;
      if (name.startsWith('ServiceWorker')) browser.serviceWorker = worker;
      browser.navigator = worker.navigator || false;
    } else if (name.includes('Worklet')) {
      (browser || (browser = {context: 'browser-worklet'})).worklet = worker;
      browser.navigator = worker.navigator || false;
    }

    browser = contexts.browser = browser || false;
    globals.navigator = browser.navigator || false;
    globals.document = browser.document || false;

    if (globals.navigator.userAgent) {
      const versions = (contexts.browser.versions = {});
      globals.navigator.userAgent.replace(
        /.*?(\w+)\/([^ ]+)|.*?$/g,
        (m, name, value) => (name && (versions[name] = value), m),
      );
    }
  }

  if (globals.global) {
    const global = globals.global;
    const process = (typeof global.process === 'object' && global.process) || false;
    const versions = process && (typeof process.versions === 'object' && process.versions) || false;

    if (versions) {
      let unknown = true;
      for (const context of ['node', 'electron']) {
        const version = versions[context];
        if (!version && !/\d+\./.test(version)) continue;
        contexts[context] = {context: `${context}-process`, global, process, versions, version};
        unknown = false;
      }
      if (unknown) {
        const context = process.name || 'global';
        contexts[process.name || 'global'] = {
          context: `${context}-process`,
          global,
          process,
          versions,
          version,
        };
      }
    }

    if (process) globals.process = process;
  }

  // const environment = {globals, contexts};
  console.log({globals, contexts});
}
