///* SEE: https://jsbin.com/gist/3ed1cc5321a55786e8bec21858f116b7

console.clear();
setTimeout(async () => {
	const {assign, getOwnPropertyDescriptors, defineProperties, entries, getPrototypeOf} = Object;
	const hasOwnProperty = Function.call.bind({}.hasOwnProperty);
	// const dynamicImport = (1, eval)('specifier => import(specifier)');

	let root;

	if (typeof document === 'object') {
		const iframe = document.createElement('iframe');

		iframe.style.display = 'none';

		await (document.readyState === 'complete' ||
			new Promise(
				resolve =>
					void document.addEventListener(
						'readystatechange',
						(resolve.listener = event =>
							void document.readyState === 'complete' &&
							resolve(void document.removeEventListener('readystatechange', resolve.listener))),
					),
			));

		document.body.appendChild(iframe);

		iframe: {
			const {contentWindow: window} = iframe;
			root = initializeRootContext(window);
			// iframe.remove();
		}
		await new Promise(requestAnimationFrame);
	} else {
		root = initializeRootContext(globalThis);
	}

	console.group('bindings');
	const bindings = {},
		errors = {};
	for (const property in root.bindings) {
		try {
			bindings[property] = root.bindings[property];
		} catch (exception) {
			errors[property] = exception;
		}
	}
	console.log(bindings);
	Object.keys(errors).length && console.warn(errors);
	console.groupEnd();

	for (const scope in root.scopes) {
		console.group(scope);
		try {
			console.log(root.scopes[scope]);
		} catch (exception) {
			console.error(exception);
		}
		console.groupEnd();
	}

	function initializeRootContext(root) {
		const internals = {
			inject(properties) {
				defineProperties(internals, getOwnPropertyDescriptors(properties));
			},
		};

		if ('document' in root && root.document && root.document.defaultView === root) {
			const {document} = root;
			const injector = document.createElement('script');
			root['[[inject]]'] = internals.inject;
			injector.textContent = `window['[[inject]]']({eval: (eval => ({ eval() { return eval(arguments[0]); } }).eval)(eval) })`;
			root.document.body.appendChild(injector);
			delete root['[[inject]]'];
		}

		const scopes = new Scopes();
		const {primordials} = scopes;
		const descriptors = {};
		const context =
			(root.window === root && 'window') ||
			(root.self === root && 'self') ||
			(root.global === root && 'global') ||
			undefined;
		const Contextuals = {
			window: /^(?:closed|length|self|parent|top|opener|location|frames|NodeFilter|TaskQueue|TrustedTypes)/,
		}[context];
		const metadata = {descriptors};
		const bindings = {};

		{
			const {Function} = root;
			for (const [property, descriptor] of entries(getOwnPropertyDescriptors(root))) {
				const {
					configurable,
					enumerable,
					get,
					set,
					value = enumerable ? root[property] : undefined,
					writable,
				} = descriptor;

				const type = (value === null && 'null') || typeof value;
				const prototype = type === 'function' && getPrototypeOf(value);
				let scope = 'globals';

				if (property in primordials) {
					scope = 'primordials';
				} else if (type === 'function') {
					scope =
						hasOwnProperty(value, 'prototype') ||
						(prototype && prototype instanceof Function) ||
						(Contextuals && Contextuals.test(property))
							? 'builtins'
							: (scope = 'methods');
				} else if (type === 'object') {
					(/^(?:[A-Z][a-z]*)+$/.test(property) && (scope = 'namespaces')) ||
						((property === context ||
							property === 'globalThis' ||
							property === 'console' ||
							(Contextuals && Contextuals.test(property))) &&
							(scope = 'properties')) ||
						((get || set) && (scope = 'properties'));
				} else if (get || set || (Contextuals && Contextuals.test(property))) {
					scope = 'properties';
				}

				(descriptors[scope] || (descriptors[scope] = {}))[property] = descriptor;

				const scoped = scope !== 'globals';

				const meta = (configurable && enumerable && scoped) || {property, descriptor, type, prototype, value, scope};

				configurable || ((metadata['non-configurable'] || (metadata['non-configurable'] = {}))[property] = meta);

				enumerable || ((metadata['non-enumerable'] || (metadata['non-enumerable'] = {}))[property] = meta);

				(scoped && (descriptor.enumerable = true)) ||
					((metadata['non-scoped'] || (metadata['non-scoped'] = {}))[property] = meta);

				if (scoped) {
					bindings[property] = {
						get: get
							? (descriptor.get = get.bind(root))
							: set
							? undefined
							: writable
							? () => root[property]
							: () => value,
						set: set
							? (descriptor.set = set.bind(root))
							: get
							? undefined
							: writable
							? value => (root[property] = value)
							: undefined,
						set: (set && (descriptor.set = set.bind(root))) || undefined,
					};
				}
			}
		}

		defineProperties(bindings, bindings);

		for (const scope in descriptors) {
			defineProperties(scopes[scope] || (scopes[scope] = {}), descriptors[scope]);
		}

		return {global: root, context, scopes, bindings, internals, metadata};
	}

	function Primordials(global) {
		const primordials = {};

		for (const primordial of [
			///* SEE: https://github.com/tc39/proposal-realms/blob/master/shim/src/stdlib.js
			// *** 18.1 Value Properties of the Global Object
			'Infinity NaN undefined',
			// *** 18.2 Function Properties of the Global Object
			'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent',
			// *** 18.3 Constructor Properties of the Global Object
			'Array ArrayBuffer BigInt BigInt64Array BigUint64Array Boolean DataView Date Error EvalError Float32Array Float64Array Function Int8Array Int16Array Int32Array Map Number Object Promise Proxy RangeError ReferenceError RegExp Set SharedArrayBuffer String Symbol SyntaxError TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array URIError WeakMap WeakSet',
			// *** 18.4 Other Properties of the Global Object
			'Atomics JSON Math Reflect',
			// *** Annex B
			'escape unescape',
			// *** ECMA-402
			'Intl',
			// *** ESNext
			'Realm',
		]
			.join(' ')
			.split(/[\s\n]+/))
			primordials[primordial] = undefined;

		return new (Primordials = class Primordials {
			constructor() {
				assign(this, primordials, ...arguments);
			}
		})(...arguments);
	}

	function Scopes() {
		return new (eval(
			[
				'Scopes = class Scopes {',
				'  constructor() {',
				'    let primordials;',
				'    [{',
				'      primordials,',
				'      builtins: {... this.builtins} = {},',
				'      methods: {... this.methods} = {},',
				'      properties: {... this.properties} = {},',
				'      globals: {... this.globals} = {},',
				'      } = {}] = arguments;',
				'    this.primordials = new Primordials(primordials)',
				'  }',
				'}',
			].join('\n\t'),
		))(...arguments);
	}
}, 100);
