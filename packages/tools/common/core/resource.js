//@ts-check

import {SchemePart, StandardSchemes} from './locations.js';
import {defineProperties, freeze, noop} from '../helpers.js';

/** @type {{fs?: Promise<import('fs')>}} */
const builtins = {};

const createPromise = ƒ => {
	const result = (async () => ƒ())();
	result.catch(noop);
	return result;
};

const promises = {
	undefined: Promise.resolve(),
	emptyStringPromise: Promise.resolve(''),
	emptyArrayBufferPromise: createPromise(ƒ => new ArrayBuffer(0)),
	emptyBlobPromise: createPromise(ƒ => new Blob([])),
	emptyFormDataPromise: createPromise(ƒ => new FormData()),
};

export class Resource {
	arrayBuffer() {
		return promises.emptyArrayBufferPromise;
	}

	blob() {
		return promises.emptyBlobPromise;
	}

	json() {
		return promises.undefined;
	}

	text() {
		return promises.emptyStringPromise;
	}

	formData() {
		return promises.emptyFormDataPromise;
	}

	/**
	 * @param {URL | string} url
	 * @param {RequestInit & {encoding?: string, flag?: string}} [options]
	 */
	static async fetch(url, options) {
		if (typeof fetch === 'function') {
			/** @type {URL} */
			// @ts-ignore
			const {href} =
				// @ts-ignore
				typeof url === 'string' ? (url = new URL(url, typeof location === 'object' ? location : 'file:///')) : url;

			return fetch(href, {...defaults.fetch, ...options});
		}
		throw ReferenceError(`Resource.fetch is not supported`);
	}

	/**
	 * @param {URL | string} url
	 * @param {RequestInit & {encoding?: string, flag?: string}} [options]
	 */
	static async read(url, options) {
		// @ts-ignore
		const {fs = (builtins.fs = import('fs').catch(/** @returns {typeof import('fs')} */ () => false))} = builtins;
		const readFileSync = (await fs).readFileSync;
		if (readFileSync) {
			/** @type {URL} */
			// @ts-ignore
			return readFileSync((typeof url === 'string' && new URL(url, 'file:///')) || url, {
				...defaults.read,
				...options,
			});
		}
		throw ReferenceError(`Resource.read is not supported`);
	}

	/**
	 * @param {URL | string} url
	 * @param {RequestInit & {encoding?: string, flag?: string}} [options]
	 */
	static async loadText(url, options) {
		/** @type {URL} */
		// @ts-ignore
		const {protocol: scheme = (SchemePart.exec(url) || '')[0] || ''} =
			// @ts-ignore
			typeof url === 'string' ? (url = new URL(url, typeof location === 'object' ? location : 'file:///')) : url;

		if (typeof fetch === 'function' && (!scheme || StandardSchemes.includes(scheme.slice(0, -1)))) {
			return (await (this || Resource).fetch(url, options)).text();
		} else if (typeof process === 'object' && (!scheme || scheme === 'file:')) {
			return String(await (this || Resource).read(url, options));
		}
	}
}

freeze(
	defineProperties(Resource.prototype, {
		body: {value: null, enumerable: true, configurable: true},
		bodyUsed: {value: false, enumerable: true, configurable: true},
	}),
);

/// Defaults

const defaults = {
	read: {encoding: null, flag: 'r'},
	fetch: {referrer: 'no-referrer'},
};

// /**
//  * @param {URL | string} url
//  * @param {RequestInit & {encoding?: string, flag?: string}} [options]
//  */
// export async function loadAsText(url, options) {
// 	/** @type {URL} */
// 	// @ts-ignore
// 	const {href, protocol: scheme = (SchemePart.exec(url) || '')[0] || ''} =
// 		// @ts-ignore
// 		typeof url === 'string' ? (url = new URL(url, typeof location === 'object' ? location : 'file:///')) : url;

// 	if (typeof fetch === 'function' && (!scheme || StandardSchemes.includes(scheme.slice(0, -1)))) {
// 		return (await fetch(href, {...defaults.fetch, ...options})).text();
// 	} else if (typeof process === 'object' && (!scheme || scheme === 'file:')) {
// 		const {fs = (builtins.fs = import('fs'))} = builtins; // .catch(() => null)
// 		if (fs) {
// 			typeof url === 'string' && (url = new URL(url, 'file:///'));
// 			return String((await fs).readFileSync(url, {...defaults.read, ...options}));
// 		}
// 	}
// }
