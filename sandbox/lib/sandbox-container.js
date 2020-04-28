export class SandboxContainer {
	constructor({frame}) {
		this.frame = frame;
		this.registered = new.target.register();
	}

	async navigate(src) {
		const {frame, registered} = this;
		// await (document.readyState === 'complete' ||
		// 	new Promise(resolve => document.addEventListener('readystatechange', resolve, {once: true})));
		frame && 'src' in frame && (await this.registered, await new Promise(requestAnimationFrame), (frame.src = src));
	}

	async prefetch(src) {}

	reload() {
		this.frame && this.frame.reload();
	}

	/**
	 * @param {string|{toString}} aspect
	 * @param {... Array<{}>} details
	 */
	static log(aspect, ...details) {
		details.length &&
			console.log(
				`%c%s%c`,
				'background: #69F; color: white; border-radius: 2px;',
				` ${aspect} `,
				'',
				Object.assign({}, ...details),
			);
	}

	/**
	 * @param {Awaitable<ServiceWorkerRegistration>} registration
	 * @returns {Promise<ServiceWorkerRegistration>}
	 */
	static async update(registration) {
		const previous = registration && (registration = await registration);
		const updated =
			previous && registration !== (registration = await registration.update()) ? registration : undefined;
		return updated
			? (SandboxContainer.log('SandboxContainer.update', {previous, updated}), registration)
			: arguments[0];
	}
	/**
	 * @param {Awaitable<ServiceWorkerRegistration>} registration
	 * @returns {Promise<ServiceWorkerRegistration>}
	 */
	static async activate(registration) {
		let scope, scriptURL, type, installed, activated, onupdatefound;
		const Species = this || SandboxContainer;
		registration &&
			(registration = await registration) &&
			(({scope, onupdatefound = (registration.onupdatefound = event => Species.update(registration))} = registration),
			(installed = registration.installation ? (await registration.installation, true) : false),
			(activated = registration.active ? (({scriptURL, type = 'classic'} = registration.active), true) : false),
			SandboxContainer.log('SandboxContainer.activate', {registration, scope, scriptURL, type, installed, activated}),
			activated && (await new Promise(requestAnimationFrame)));
		return registration;
	}

	/** @param {ServiceWorkerOptions} [options] */
	static async register(options) {
		const {window, navigator} = globalThis;
		const serviceWorkerContainer = navigator && navigator.serviceWorker;

		let scriptURL, scope, type, registration;

		const Species = this || SandboxContainer;
		const {
			defaults: {serviceWorker: defaults} = SandboxContainer.defaults,
			registration: currentRegistration,
		} = Species;

		if (currentRegistration) {
			return currentRegistration;
		}

		if (serviceWorkerContainer) {
			({scriptURL = defaults.scriptURL, scope, type} = options = {...options});

			!'scriptURL' in options ||
				((scriptURL = `${new URL(scriptURL, location)}`),
				'scope' in options || (scope = `${new URL('./', scriptURL)}`));

			(scriptURL === defaults.scriptURL || !type) && (type = defaults.type);

			registration = await (Species.registration = Species.activate(
				serviceWorkerContainer.register(scriptURL, {scope, type}),
			));
		}

		return registration;
	}

	static get defaults() {
		return defaults;
	}
}

const defaults = {};

const base = (defaults.base = `${new URL(
	'./',
	(typeof location === 'object' && location.href) || import.meta.url,
)}`.replace(/\/(?:dist|lib)\/^/, '/'));

defaults.serviceWorker = Object.freeze({
	scriptURL: `${new URL('./containers/service-worker.js', base)}`,
	type: 'classic',
});

Object.freeze(defaults);

/** @typedef {Partial<defaults.serviceWorker>} ServiceWorkerOptions */
/** @template T @typedef {T|Promise<T>} Awaitable */
