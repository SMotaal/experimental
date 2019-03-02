/// <reference path="./lexer.d.ts" />
//@ts-check

/**
 * @typedef {LexExp.Lookup} Lookup
 * @typedef {LexExp.Pattern} Pattern
 * @typedef {LexExp.Source} Source
 * @typedef {LexExp.Flags} Flags
 * @typedef {LexExp.Expression} Expression
 */

/**
 * @template {string} K
 * @implements {LexExp<K>}
 */
class LexExp extends RegExp {
	/**
	 * @param { LexExp.Pattern } [pattern]
	 * @param { LexExp.Flags } [flags]
	 */
	constructor(pattern, flags) {
		let lookup;
		/** @type {Source} */ let source;

		({source = `${pattern}`, lookup, flags = flags} = Object(pattern));

		super(source, flags);

		/** @type {LexExp.Lookup<'a'>} */
		this.lookup = new LexExp.Lookup({...lookup});
	}

	/**
	 * @param {string} string
	 */
	exec(string) {
		return super.exec(string);
	}
}

/**
 * @template {string} K
 * @implements {LexExp.Lookup<K>}
 */
LexExp.Lookup = class Lookup {
	/**
	 * @param {{[name in K]?: any}} [lookup]
	 */
	constructor(lookup) {
		/** @type {any} */
		const keys = lookup ? Object.getOwnPropertyNames({...lookup}) : [];

		/** @type {K[]} */
		this[Symbol.unscopables] = keys;

		for (const key of keys) {
			const pattern = lookup[key];
			pattern == null ||
				(typeof pattern === 'string'
					? (this[key] = new LexExp(pattern))
					: 'exec' in pattern && typeof pattern.exec === 'function'
					? (this[key] = pattern)
					: new Lookup(pattern));
		}

		Object.freeze(this);
	}

	[Symbol.iterator]() {
		return this[Symbol.unscopables][Symbol.iterator]();
	}
};

/** @type {LexExp<'a'>} */
const x = new LexExp('', 'i');

const a = x.lookup['a'];
