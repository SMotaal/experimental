import {SchemePart, StandardSchemes, resolvers, PackageSpecifier} from './helpers.js';

export const defaults = {
	read: {encoding: null, flag: 'r'},
	fetch: {referrer: 'no-referrer'},
};

export class Loader {
	constructor(base) {
		this.base = new URL(base); // referrer ? new URL(base) : new URL(base, referrer);
	}

	async load(url) {
		return Loader.loadText(new URL(url, this.base));
	}

	resolve(specifier, referrer = this.base) {
		return `${new URL(specifier, referrer)}`;
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
			typeof url === 'string'
				? (url = new URL(url, (options && options.base) || (typeof location === 'object' ? location : 'file:///')))
				: url;

		if (typeof fetch === 'function' && (!scheme || StandardSchemes.includes(scheme.slice(0, -1)))) {
			return (await (this || Resource).fetch(url, options)).text();
		} else if (typeof process === 'object' && (!scheme || scheme === 'file:')) {
			return String(await (this || Resource).read(url, options));
		}
	}
}

const loader = new Loader(`${import.meta.url}/../../`);
export default loader;

// resolve(specifier, referrer) {
// 	return resolvers.url({specifier, referrer});
// }

// resolve({
// 	specifier,
// 	referrer = this.base,
// 	provider = '',
// 	resolver,
// 	package: {scope, name: packageName, id} = {},
// 	entry,
// 	version,
// } = {}) {
// 	const resolution = {...arguments[0], referrer};
// 	// let resolution = arguments[0];
// 	if (specifier) {
// 		specifier = `${specifier || ''}`;
// 		let match;
// 		if (specifier.startsWith('./') || specifier.startsWith('../')) {
// 			resolver || (resolver = resolvers.url);
// 			// return `${new URL(specifier, referrer)}`;
// 		} else if ((match = PackageSpecifier.exec(specifier))) {
// 			[, id, scope = scope, , entry = entry] = match;
// 		} else {
// 			throw TypeError(`Cannot resolve specifier "${specifier}": unsupported type`);
// 		}
// 	}

// 	// if (!id) {
// 	// 	throw ReferenceError(`Cannot resolve ${JSON.stringify(arguments[0], null, 1)}`);
// 	// }

// 	if (!resolver && !(resolver = resolvers[provider])) {
// 		throw ReferenceError(
// 			`Cannot resolve bare specifier "${specifier}"${provider && `: unknown provider "${provider}"`}`,
// 		);
// 	}
// 	return resolver(resolution);
// }
