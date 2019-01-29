import loader from '../loader/loader.js';
import packages from '../loader/packages.js';
import {createNamespace, createEvaluator, createScriptProxy} from '../loader/helpers.js';

/** @type {mocha} mocha */
export let mocha;

/** @type {mocha.globals} mocha */
export const scope = createNamespace({
	mocha: {get: () => mocha, set: value => void (mocha = value), enumerable: true},
});

export const ready = (scope.ready = (async module => {
	await packages.ready;
	const {main, stylesheet} = packages[module];
	if (main) {
		const url = packages[module].resolve(main);
		const source = await loader.load(url);
		const type = /^\s*export /m.test(source) ? 'module' : 'script';

		stylesheet &&
			typeof document === 'object' &&
			(await new Promise((resolve, reject) => {
				document.head.appendChild(
					Object.assign(document.createElement('link'), {
						rel: 'stylesheet',
						href: url.replace(main, stylesheet),
						onload: resolve,
						onerror: reject,
						onabort: resolve,
					}),
				);
			}));

		type === 'script'
			? await createEvaluator(createScriptProxy(scope))(source)
			: Object.assign(scope, await import(url));
	}
	return scope;
})('mocha'));

/**
 * Defers testing until Mocha is loaded.
 *
 * @param {(scope: mocha.globals) => Promise<undefined>} ƒ
 */
export const async = async ƒ => ƒ(await ready);

// export default scope;

//* SEE: https://github.com/vitalets/mocha-es6-modules

/** @typedef {typeof import('mocha')} mocha */
/** @typedef {import('mocha').MochaGlobals & {mocha: mocha}} mocha.globals */
