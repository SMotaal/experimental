/// <reference lib="webworker" />
ServiceWorker: {
	/** @type {ServiceWorkerGlobalScope} */
	const {registration, clients, addEventListener, skipWaiting, navigator} = self;
	const {log} = console;
	const root = Object.freeze(new URL(registration.scope));
	const frames = {};
	const containers = {
		['test']: `${new URL('/sandbox/tests/hello-world/', location)}`,
		['smotaal.io']: 'https://www.smotaal.io',
	};
	const router = Object.freeze(
		Object.assign(request => (request.url.startsWith(root) ? router.scoped(request) : router.unscoped(request)), {
			scoped: request => (
				(request.type = 'scoped'),
				([request.container, request.pathname = '/'] = ({search: request.search, hash: request.hash} = new URL(
					request.url,
					root,
				)).pathname
					.slice(root.pathname.length)
					.split(/(?=\/.*$|$)/, 2)),
				// resolve the route
				(request.routing =
					(request.initiator && request.initiator in frames && frames[(request.frame = request.initiator)]) ||
					(request.receiver && (request.frame = request.receiver), request.container in containers && 'sandboxed')) &&
					// save resolved root for the frame
					(!request.frame || request.frame in frames || (frames[request.frame] = request.routing)),
				(router[request.routing] || router.blocked)(request),
				request
			),
			unscoped: request => (
				(request.frame || (request.frame = request.initiator || request.receiver)) in frames
					? (request.type = 'unsandboxed')
					: (request.type = 'default'),
				request
			),
			blocked: request => (
				(request.type = 'blocked'),
				(request.resolved = false),
				(request.response = Promise.reject(`requested url "${request.url}" cannot be resolved`)),
				request
			),
			sandboxed: request => (
				(request.type = 'sandboxed'),
				(request.resolved = `${new URL(
					`.${request.pathname}${request.query || ''}${request.hash || ''}`,
					containers[request.container],
				)}`),
				request
			),
		}),
	);

	addEventListener('activate', event => event.waitUntil(clients.claim()));
	addEventListener('install', event => event.waitUntil(skipWaiting()));
	addEventListener('fetch', event => {
		const request = {init: {}};
		try {
			({
				clientId: request.initiator,
				// TODO: Align with spec
				//  https://fetch.spec.whatwg.org/#concept-request-replaces-client-id
				//   - Safari seems to not always report the resultingClientId
				resultingClientId: request.receiver,
				// TODO: Work through the various init options
				request: {
					body: request.init.body,
					cache: request.cache,
					credentials: request.credentials,
					headers: request.headers,
					integrity: request.integrity,
					keepalive: request.keepalive,
					method: request.init.method,
					url: request.url,
					mode: request.mode,
					referrerPolicy: request.referrerPolicy,
					referrer: request.referrer,
					redirect: request.redirect,
				},
			} = event).respondWith(
				router(request).response || (request.resolved ? fetch(request.resolved, request.init) : fetch(event.request)),
			);
		} catch (exception) {
			request.type = 'error';
			request.error = `${exception}`;
		} finally {
			debug(request.type, request);
		}
	});

	importScripts('/sandbox/lib/debug.js', '/sandbox/lib/debug.sanitize.js');
	const {[Symbol.for('debug')]: debug = console.log} = console;

	// /**
	//  * @param {string|{toString}} aspect
	//  */
	// const debug = async (aspect, ...args) => {
	// 	log(
	// 		`%c%s%c %O`,
	// 		`background: ${debug.colors[aspect] || '#69F'}; color: white; border-radius: 2px;`,
	// 		` ${aspect} `,
	// 		'',
	// 		...args.map(debug.serialize),
	// 	);
	// };
	// debug.colors = {
	// 	default: '#AAA',
	// 	scoped: '#CC0',
	// 	sandboxed: '#0C3',
	// 	unsandboxed: '#E90',
	// 	blocked: '#F33',
	// 	error: '#F00',
	// };
	// debug.serialize = navigator.userAgent.includes('Firefox')
	// 	? a => JSON.stringify(a, (k, v) => (typeof v === 'function' ? `${v}` : v), 2)
	// 	: a => a;
}
