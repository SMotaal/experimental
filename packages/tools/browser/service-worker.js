/**
 * Caches Service Worker (v1) — Saleh Abdel Motaal — 2018
 * SEE: https://w3c.github.io/ServiceWorker/v1/
 */
{
	self.addEventListener('activate', event => {
		event.waitUntil(self.clients.claim());
	});

	self.addEventListener('install', event => {
		event.waitUntil(self.skipWaiting());
	});

	self.addEventListener('fetch', event => {
		if (event.request.url.includes('/packages/')) {
			const matched = match(event.request);
			event.respondWith(matched);
			matched && event.waitUntil(matched.then(console.log));
		}
	});

	const DEFAULT_CACHE = 'default';

	function match(request, cache = typeof DEFAULT_CACHE === 'string' && DEFAULT_CACHE) {
		match = async (request, cache = match.cache || self.caches) => {
			const matched = (await cache).match(request.url);
			console.log({matched});
			return matched;
		};

		match.cache =
			cache &&
			((typeof cache === 'string' && self.caches.open(cache).then(cache => (match.cache = cache))) ||
				(typeof cache === 'object' && cache) ||
				undefined);

		console.trace('first match');

		return match(request, cache);
	}
}
