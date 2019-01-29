/// SPECIFIERS
export {SchemePart, StandardSchemes} from '../../packages/tools/common/core/locations.js';

export const PackageSpecifier = /^((?:(@[a-z][-a-z\.0-9]*)\/|)([a-z][-a-z\.0-9]*))(?:\/([^\n\t:#?\[\]]+)|)|/i;
export const RelativeSpecifierPrefix = /^\.{1,2}\/|$/;
export const SpecifierPrefix = /^\.{0,2}\/|$/;

/// PACKAGES
export const resolvers = {
	url: ({specifier, referrer}) => {
		return `${referrer ? new URL(specifier, referrer) : new URL(specifier)}`;
	},
	unpkg: ({specifier, id, entry, version = '*'} = {}) => {
		if (!id) {
			if (!specifier) {
				throw ReferenceError(`Cannot resolve unpkg module without a specifier or an id.`);
			}

			const match = PackageSpecifier.exec(specifier);

			if (!match || !match[1]) {
				throw ReferenceError(
					`Cannot resolve unpkg module from specifier "${specifier}" which does not match the bare specifier format: ${PackageSpecifier}`,
				);
			}

			[, id, , , entry = entry] = match;
		}
		if (!id) {
			throw ReferenceError(`Cannot resolve unpkg request from ${JSON.stringify(arguments[0], null, 1)}`);
		}

		return `https://unpkg.com/${id}/${entry && `${entry}`}`;
	},
};

/// GLOBALS
export const globals = {};

globals.self = typeof self === 'object' && self && self.self === self && self;

globals.global = typeof global === 'object' && global && global.global === global && global;

globals.this = globals.self || globals.global || (1, eval)('this');

/// CONTAINMENT
export const createNamespace = hooks => Object.create(null, hooks);
export const createEvaluator = (1, eval)(`(function() { with (arguments[0]) return eval\u034f => eval(eval\u034f) })`);
// export const createEvaluator = (1, eval)(
// 	`(function() { with (arguments[0]) return (function () { return eval(arguments[0]) }) })`,
// );

export const createScriptProxy = (namespace, global = globals.this) =>
	new Proxy(namespace, {
		has: () => true,
		// set: Reflect.set,
		// defineProperty: Reflect.defineProperty,
		get: (target, property, receiver) =>
			property === 'global' ? receiver : property in namespace ? namespace[property] : global[property],
	});
