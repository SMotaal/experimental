import {Headers} from './headers.js';
import globals, {scoped} from './globals.js';
import {Resource as Body} from './resource.js';
import {defineProperties, freeze, getOwnPropertyDescriptors} from '../helpers.js';

/// Builtin Response
globals.Response ||
	defineProperties(
		scoped(
			'Response',
			class Response {
				/**
				 * @param {BodyInit | null} [body]
				 * @param {ResponseInit} [init]
				 */
				constructor(body, init) {
					// TODO: Restore Response.body initialization if it becomes supported
					// this.body = body || null;

					/** @type {HeadersInit} */
					let headers;

					/** @type {typeof defaults} */
					({
						headers,
						status: this.status = defaults.status,
						statusText: this.statusText = defaults.statusText,
						/** @type {import('./types').ResponseType} */
						type: this.type = 'default',
						url: this.url = '',
					} = {
						...defaults,
						...init,
					});

					this.headers = new Headers(headers);
				}

				clone() {
					return new Response(this);
				}

				error() {
					if (this.type !== 'error') {
						defineProperties(this, getOwnPropertyDescriptors(overrides.error));
					}
					return this;
				}
			},
		).prototype,
		(({constructor, ...properties}) => properties)(Object.getOwnPropertyDescriptors(Body.prototype)),
	);

/// Core Response
export class Response extends globals.Response {
	/**
	 * @param {BodyInit | null} body
	 * @param {ResponseInit} [init]
	 */
	constructor(body, init) {
		//@ts-ignore
		super(body, {...defaults, ...init});
		// this.clone = () => new new.target(this);
	}

	clone() {
		/** @type {typeof Response}  */
		const constructor = this.constructor || Response;
		return new constructor(this);
	}
}

/// Defaults

const defaults = {
	/** The status code for the reponse. */
	status: 200,
	/** The status message associated with the status code */
	statusText: '',
};

/// Overrides

// Passive requests only use "resource" fields only
// other fields default to the specs for now.
const overrides = {
	error: freeze({
		status: 0,
		statusText: '',
		headers: Headers.freeze({}),
		type: 'error',
	}),
};

/** @typedef {(typeof globals)['Response']['prototype']} globals.Response */
