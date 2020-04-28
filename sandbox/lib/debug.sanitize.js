{
	Symbol.for('debug') in console || importScripts('/sandbox/lib/debug.js');

	const {[Symbol.for('debug')]: debug} = console;
	const {stringify, parse} = JSON;
	/** @type {ObjectConstructor} */
	const Object = {}.constructor;
	const {WeakSet, WeakMap} = self;
	const {create, freeze, getPrototypeOf, setPrototypeOf} = Object;
	const Void = freeze(create(null));
	// const globals = Object.values(self);

	const sanitized = new WeakMap();
	const proxies = new WeakSet();
	const prototypes = new WeakMap();
	const parentPrototypes = new WeakMap();
	parentPrototypes.excludes = [Object, Array, Set, Map, WeakSet, WeakMap, self.Event, self.ExtendableEvent]
		.filter(Boolean)
		.map(({prototype}) => prototype);

	const parentPrototypeOf = prototype => {
		if (!prototype) return null;
		const prototypes = [prototype];
		for (
			let parent = prototype;
			(parent = getPrototypeOf(prototype)) &&
			!(prototype = parentPrototypes.get(parent)) &&
			!parentPrototypes.excludes.includes((prototype = parent));
			prototypes.push(parent)
		);
		if (prototype || (prototype = prototypes[prototypes.length - 1])) {
			for (const childPrototype of prototypes) parentPrototypes.set(childPrototype, prototype);
		}
		return prototype || null;
		// let parentPrototype = getPrototypeOf(object);
	};

	const sanitize = (object, seen = new WeakSet()) => {
		// if (proxies.has(object)) return Void;
		seen.add(object);
		const ownPrototype = getPrototypeOf(object);
		const parentPrototype = (ownPrototype && parentPrototypeOf(ownPrototype)) || Void;
		const proxy = create(null);
		// parentPrototype && (proxy['(parentPrototype)'] = `${parentPrototype}`);
		// ownPrototype && ownPrototype !== parentPrototype && (proxy['(ownPrototype)'] = `${ownPrototype}`);
		proxies.add(proxy);
		sanitized.set(object, proxy);
		for (const key in object) {
			const value = object[key];
			const type = typeof value;
			value == null ||
				type === 'function' ||
				key in parentPrototype ||
				(proxy[key] =
					type !== 'object' ? value : seen.has(value) ? Void : sanitized.get(value) || sanitize(value, seen));
		}

		if (ownPrototype) {
			let proxyPrototype = prototypes.get(ownPrototype);
			proxyPrototype || prototypes.set(ownPrototype, (proxyPrototype = {constructor: ownPrototype.constructor}));
			setPrototypeOf(proxy, proxyPrototype);
		}
		// ownPrototype && ownPrototype.constructor && setPrototypeOf(proxy, );
		return proxy;
	};

	debug.sanitize = value =>
		typeof value === 'function'
			? Function.toString.call(value)
			: value === null || typeof value !== 'object'
			? value
			: sanitized.get(value) || sanitize(value);

	// debug.serialize = value => {
	// 	const seen = new WeakSet();
	// 	return parse(
	// 		stringify(
	// 			value,
	// 			(key, value) =>
	// 				typeof value === 'function'
	// 					? `${value}`
	// 					: (value !== null &&
	// 							typeof value === 'object' &&
	// 							// 'constructor' in value &&
	// 							// value.constructor !== Object &&
	// 							// globals.includes(value.constructor) &&
	// 							(seen.has(value) ? (value = Void) : seen.add(value).add((value = serialize(value)))),
	// 					  value),
	// 			2,
	// 		),
	// 	);
	// };
}
