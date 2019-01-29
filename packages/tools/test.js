import {logResults} from './common/specs/helpers.js';

(async () => {
	const results = {
		...((await (await import('./common/specs/canary.js')).default()) || undefined),
		...((await (await import('./common/specs/classes.js')).default()) || undefined),
	};

	logResults(results);
})();

// import globals, {global} from './common/core/globals.js';
// import {Resource} from './common/core/resource.js';

// const process = global && global.process;
// const gap = () => process && console.log();

// (async () => {
// 	console.groupCollapsed(import.meta.url);
// 	try {
// 		{
// 			console.group(`‹ class Resource ›`);
// 			const test = source => Resource.loadText(source);
// 			const format = `${test} => `.replace(/^.*?=> */, '() => ').replace('(source)', `(%O)`);
// 			const args = [import.meta.url];
// 			gap();
// 			try {
// 				const result = await test(...args);
// 				console.log(`${format}[%s %O characters]`, ...args, typeof result, 0 + result && result.length);
// 			} catch (exception) {
// 				console.warn(`${format} => %O`, ...args, exception);
// 			}
// 			console.groupEnd();
// 		}

// 		const importFrom = async (name, from) => (await import(`./${from}`))[name];

// 		const classes = [
// 			[
// 				'Headers',
// 				'common/core/headers.js',
// 				[
// 					(Headers, {headers}) => new Headers(),
// 					(Headers, {headers}) => new Headers({AbCd: 1}),
// 					(Headers, {headers}) => new Headers([...headers]),
// 				],
// 			],
// 			[
// 				'Request',
// 				'common/core/request.js',
// 				[
// 					(Request, {request}) => new Request(),
// 					(Request, {request}) => new Request('file.ext'),
// 					(Request, {request}) => new Request(new URL('file:///file.ext')),
// 					(Request, {request}) => new Request(request),
// 				],
// 			],
// 			[
// 				'Response',
// 				'common/core/response.js',
// 				[
// 					(Response, {response}) => new Response(),
// 					(Response, {response}) => new Response('file.ext'),
// 					(Response, {response}) => new Response(new URL('file:///file.ext')),
// 					(Response, {response}) => new Response(response),
// 					(Response, {response, request}) => new Response(request),
// 				],
// 			],
// 		];
// 		{
// 			let instances = {},
// 				clones = {};
// 			for (const [name, from, constructors = [Class => new Class()]] of classes) {
// 				gap();
// 				console.group(`‹ class ${name} ›`);
// 				try {
// 					let Class, instance, clone, values;
// 					console.log(`import(%O) => ({%s}) => %O`, from, name, (Class = await importFrom(name, from)));

// 					gap();

// 					for (const constructor of constructors) {
// 						// console.log(`new ${name}()`);
// 						console.log(
// 							'%s => %O',
// 							`${constructor}`.replace(/^.*?=> */, '() => '),
// 							(instances[name.toLowerCase()] = instance = constructor(Class, instances, clones)),
// 						);

// 						instance &&
// 							instance[Symbol.iterator] &&
// 							(values = [...instance]).length &&
// 							console.log(`\t${new Array(values.length).fill('%o').join(',\n\t')}`, ...values);

// 						gap();
// 					}
// 					if (instance.clone) {
// 						console.log(
// 							'%s => %O',
// 							`() => ${name.toLowerCase()}.clone()`,
// 							(clones[name.toLowerCase()] = clone = instance.clone()),
// 						);

// 						gap();
// 					}
// 				} catch (exception) {
// 					console.warn(exception);
// 				}
// 				console.groupEnd();
// 			}
// 		}
// 	} catch (exception) {
// 		console.warn(exception);
// 	}
// 	console.groupEnd();
// })();
