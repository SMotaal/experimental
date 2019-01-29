//@ts-check
/// <reference path="../types.d.ts" />

import globals, {scoped} from './globals.js';
import {
	defineProperties,
	entries,
	freeze,
	getOwnPropertyDescriptors,
	noop,
	Object,
	setPrototypeOf,
} from '../helpers.js';

const toLowerCaseString = Function.call.bind(String.prototype.toLowerCase);
const trimString = Function.call.bind(String.prototype.trim);

/// Builtin Headers

globals.Headers ||
	setPrototypeOf(
		defineProperties(
			scoped(
				'Headers',
				class Headers extends Map {
					/** @param {HeadersInit} init */
					constructor(init) {
						init ? super(entriesFrom(init)) : super();
					}

					get(name) {
						if (name) return super.get(toLowerCaseString(name));
					}

					has(name) {
						return (name && super.has(toLowerCaseString(name))) || false;
					}

					delete(name) {
						return (name && super.delete(toLowerCaseString(name))) || false;
					}

					set(name, value) {
						name && (value = trimString(value)) && super.set(toLowerCaseString(name), value);
						return this;
					}

					append(name, value) {
						const current = super.get((name = toLowerCaseString(name)));
						name && (value = trimString(value)) && super.set(name, current ? `${current}, ${value}` : value);
						return this;
					}
				},
			).prototype,
			(({constructor, clear, size, ...properties}) => properties)(getOwnPropertyDescriptors(Map.prototype)),
		),
		Object.prototype,
	);

/// Core Headers

export class Headers extends globals.Headers {
	/**
	 * @param {HeadersInit | {[name: string]: string}} headers
	 * @returns {[string, string][]}
	 */
	static entries(headers) {
		//@ts-ignore
		return headers && typeof headers === 'object'
			? [
					//@ts-ignore
					...(Symbol.iterator in headers ? headers : entries(headers)),
			  ].map(header => ((header[0] = toLowerCaseString(header[0])), header))
			: [];
	}

	/**
	 * Freezes Headers by overloading inherited methods (not the actual map).
	 * @param {globals.Headers} headers
	 */
	static freeze(headers) {
		headers &&
			(headers instanceof globals.Headers ? headers.set !== noop : (headers = new globals.Headers(headers))) &&
			freeze(defineProperties(headers, getOwnPropertyDescriptors(overrides.frozen)));
		return headers;
	}
}

const {entries: entriesFrom} = Headers;

/// Frozen Headers
const overrides = {
	frozen: freeze({set: noop, delete: noop, append: noop}),
};

/** @typedef {(typeof globals)['Headers']['prototype']} globals.Headers */
