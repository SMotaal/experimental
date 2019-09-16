//<!-- prettier-ignore --><script type="text/javascript" id=bootstrap>
new (class {
	bootstrap() {
		if (globalThis.self && globalThis.navigator) this.browser(globalThis.self);
		else if (globalThis.global && globalThis.process) this.node(globalThis.global);
	}

	node(global) {
		if (typeof global.process !== 'object' && typeof global.process.version !== 'string') return false;
		console.log(`This works better in the browser but Node.js ${global.process.version} is also sweet!`);
		return true;
	}

	browser(self) {
		if (typeof self !== 'object') return false;
		if (self.document && self.window === self.document.defaultView) this.window(self.window);
		else if (self.location && self.location.href) this.self(self);
		return true;
	}

	self(self) {
		if (typeof self !== 'object' || typeof self.location !== 'object') return false;
		if (self.postMessage) self.postMessage({name: `${self[Symbol.toStringTag] || self}`, location: `${self.location}`});
		return true;
	}

	window(window) {
		if (typeof window !== 'object') return false;
		if (typeof window.document === 'object') this.document(window.document);
		if (typeof window.Worker === 'function') this.createWorker(window.Worker);
		if (typeof window.navigator === 'object') this.createServiceWorker(window.navigator);
		return true;
	}

	document(document) {
		if (typeof document !== 'object') return false;
		document.body.innerHTML = '';
		document.head.innerHTML = /* html */ `
      <title>SMotaal's Bootstrap Experiment</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline';" />
      <meta name="theme-color" content="#999">
      <link rel="stylesheet" href="/fonts/iosevka.css" />
      <link rel="stylesheet" href="/markout/styles/styles.css" />
      <link id="style:styles/markout.css" rel=preload as=style href="/markout/styles/markout.css" />
    `;
		import('/browser/markout-preview.js?dev');
		return true;
	}

	createServiceWorker(navigator) {
		if (typeof navigator !== 'object' && typeof navigator.serviceWorker !== 'object') return false;
		// import('/service-worker.js');
		return true;
	}

	createWorker(Worker) {
		if (typeof Worker !== 'function') return false;
		new Worker(`./bootstrap.js`, {type: 'module'}).onmessage = ({data}) => console.log(`[Worker] %o`, data);
		return true;
	}
})().bootstrap();
// </script><body><main><markout-content src=README.md></markout-content></main>
