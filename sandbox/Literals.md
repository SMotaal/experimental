# Realms: Literals

## Objects

```js
console.log(
	(() => {
		const objects = [];
		const prototypes = object => [object, ...((object = getPrototypeOf(object)) ? prototypes(object) : [])];
		const object = (object, prototype) =>
			objects.push(
				prototypes(Object.defineProperty(object, 'constructor', {value: object.constructor, enumerable: true})),
			);
		const {getPrototypeOf, setPrototypeOf, construct, apply, defineProperty, getOwnPropertyDescriptor} = Reflect;
		const {getOwnPropertyDescriptors, defineProperties} = Object;

		const ObjectPrototype = getPrototypeOf({});
		const ObjectPrototypeDescriptors = getOwnPropertyDescriptors(ObjectPrototype);
		const ObjectPrototypePrototype = getPrototypeOf(ObjectPrototype);
		const ObjectConstructor = ObjectPrototype.constructor;
		const ObjectConstructorDescriptors = getOwnPropertyDescriptors(ObjectConstructor);
		const ObjectConstructorPrototype = getPrototypeOf(ObjectConstructor);
		const ObjectConstructorTarget = ObjectConstructor; // class {};
		const ObjectConstructorProxy = new Proxy(ObjectConstructorTarget, {
			construct(target, argumentList, newTarget, receiver) {
				const object = construct(...arguments);
				console.log('Object.construct', ...arguments);
				object && (object['Object.construct.arguments'] = [...arguments]);
				return object;
			},
			apply(target, thisArgument, argumentList, receiver) {
				const object = apply(...arguments);
				console.log('Object.apply', ...arguments);
				object && (object['Object.apply.arguments'] = [...arguments]);
				return object;
			},
		});
		const ObjectConstructorProxyPrototype = class extends ObjectConstructorProxy {}.prototype;

		let index = 0;

		object((index++, {index}));

		const configurable = true;
		const enumerable = true;

		try {
			defineProperties(ObjectPrototype, {constructor: {value: ObjectConstructorProxy, enumerable, configurable}});
			// defineProperties(ObjectConstructor, {prototype: {value: ObjectConstructorProxyPrototype, enumerable, configurable}});
			setPrototypeOf(ObjectConstructor, ObjectConstructorProxy);
			setPrototypeOf(ObjectPrototype, ObjectConstructorProxyPrototype);
			object((index++, {index}));
			object((index++, ObjectConstructorProxy({index})));
		} finally {
			setPrototypeOf(ObjectConstructor, ObjectConstructorPrototype);
			setPrototypeOf(ObjectPrototype, ObjectPrototypePrototype);
			defineProperties(ObjectPrototype, ObjectPrototypeDescriptors);
			defineProperties(ObjectConstructor, ObjectConstructorDescriptors);
		}

		object((index++, {index}));

		return {
			ObjectPrototype,
			ObjectPrototypePrototype,
			ObjectConstructor,
			ObjectConstructorPrototype,
			ObjectConstructorProxy,
			ObjectConstructorTarget,
			objects,
		};
	})(),
);
```
