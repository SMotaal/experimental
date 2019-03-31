/// <reference path="../global.d.ts" />
import {globals, FAIL, runTests} from './helpers.js';

const defaults = {
	HTMLElement: typeof HTMLElement !== 'undefined' && HTMLElement,
	HTMLIFrameElement: typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement,
};

/** @typedef {Partial<Window & typeof defaults & typeof globals & {iframe?:HTMLIFrameElement}>} locals */

const tests = {
	['HTMLIFrameElement constructor in scope']:
		/** @param {locals} locals */
		({HTMLIFrameElement}) =>
			(typeof HTMLIFrameElement === 'function' &&
				typeof HTMLIFrameElement.prototype === 'object' &&
				HTMLIFrameElement) ||
			FAIL,

	['HTMLIFrameElement extends HTMLElement']:
		/** @param {locals} locals */
		({HTMLIFrameElement, HTMLElement}) =>
			(HTMLElement && HTMLIFrameElement.prototype instanceof HTMLElement && HTMLElement) || FAIL,
};

export default /** @param {locals} locals */
async locals => {
	try {
		// const results = {};

		const {
			iframe,
			document = iframe && iframe.ownerDocument,
			window = (document && document.defaultView) || globals.window,
		} = (locals = {...globals, ...defaults, ...locals});

		({
			HTMLElement: locals.HTMLElement = window.HTMLElement || defaults.HTMLElement,
			HTMLIFrameElement: locals.HTMLIFrameElement = window.HTMLIFrameElement || defaults.HTMLIFrameElement,
		} = locals);

		const results = await runTests({locals, tests});

		// for (const [testName, test] of entries(tests)) {
		// 	try {
		// 		const result = await test(locals);
		// 		results[testName] = (result === FAIL && {fail}) || {result, pass, collapsed};
		// 	} catch (error) {
		// 		results[testName] = {error, fail};
		// 	}
		// }

		return {[import.meta.url]: {results}};
	} catch (error) {
		return {[import.meta.url]: {error}};
	}
};

// /** @type {Console} */
// const {log, warn, group, groupCollapsed, groupEnd} = globals.console || defaults.globals.console;

// export const {getPrototypeOf, getOwnPropertyNames, entries: entries} = Object;

// const entries = entriesFrom(results);

// const logResults = results => {
// 	if (!results || typeof results !== 'object') return;
// 	const entries = Symbol.iterator in results ? results : entriesFrom(results);
// 	if (!entries.length) return;
// 	for (const [testName, testResult] of entries) {
// 		let status, error, result, fail, pass;

// 		typeof testResult === 'object'
// 			? (status = ({error, result, fail = !!error, pass = !fail} = testResult) && pass)
// 			: (status = !(fail = !(pass = testResult === true || (testResult !== false && ((result = testResult), true)))));

// 		const color = status ? 'color: green' : 'color: red';
// 		const mark = status ? '\u2713' : '\u2715';

// 		if (result && Symbol.iterator in result) {
// 			console.groupCollapsed(`%c%s %s`, color, mark, testName);
// 			try {
// 				logResults(result);
// 			} catch (exception) {
// 				console.warn(exception);
// 			}
// 			console.groupEnd();
// 		} else {
// 			console.group(`%c%s %s`, color, mark, testName);
// 			result && console.log('%o', result);
// 			error && console.warn('%o', error);
// 			console.groupEnd();
// 		}
// 	}
// };

// if (entries.length) {
// 	for (const [testName, testResult] of entries) {
// 		let status, error, result, fail, pass;

// 		typeof testResult === 'object'
// 			? (status = ({error, result, fail = !!error, pass = !fail} = testResult) && pass)
// 			: (status = !(fail = !(pass = testResult === true || (testResult !== false && ((result = testResult), true)))));

// 		console.groupCollapsed(`%c%s %s`, status ? 'color: green' : 'color: red', status ? '\u2713' : '\u2715', testName);
// 		result && console.log('%o', result);
// 		error && console.warn('%o', error);
// 		console.groupEnd();
// 	}
// }
