import {global, self} from '../core/globals.js';

const process = global && global.process;
const gap = () => process && console.log();

/** @type {ObjectConstructor} */
export const Object = {}.constructor;

/** @type {ObjectConstructor} */
export const {getPrototypeOf, getOwnPropertyNames, entries} = Object;

export const defaults = {
	globals: {Object, console, self, window: self && self.window},
};
export const {globals} = defaults;

export const FAIL = Symbol('fail');
export const PASS = Symbol('pass');

export const importFrom = async (name, from) => {
	try {
		return (await import(`../../${from}`))[name];
	} catch (exception) {
		console.warn(exception);
	}
};

export const runTests = async ({tests = {}, locals = globals, results = {}}) => {
	let testEntries;
	if (Array.isArray(tests)) {
		testEntries = new Array(tests.length);
		let index = 0;
		for (const test of tests) {
			testEntries[index++] = [
				test.description ||
					(test.description = `${test}`
						.replace(/^.*=> */, '')
						.trim()
						.replace(/^\(.*?= *(.*) *\)$/, '$1')),
				test,
			];
		}
	} else {
		testEntries = entries(tests);
	}
	const {variables = (locals.variables = {})} = locals;
	for (const [testName, test] of testEntries) {
		if (!test || typeof test !== 'function' || test.skip) continue;
		try {
			const result = await test(locals, variables);
			results[testName] = (result === FAIL && {fail}) || {result, pass: true, collapsed: !!test.collapsed};
		} catch (error) {
			results[testName] = {error, fail: true};
		}
	}
	return results;
};

export const logResults = (results, globals = defaults.globals) => {
	const records =
		results && typeof results === 'object' && ((Symbol.iterator in results && results) || entries(results));

	if (!records || !records.length) return;

	const {
		console: {log, dir, warn, group, groupCollapsed, groupEnd},
	} = globals === defaults.globals ? defaults.globals : {...defaults.globals, ...globals};

	for (const [name, record] of records) {
		const type = (record == null && `${record}`) || typeof record;
		if (type === 'object' && record.results && typeof record.results === 'object') {
			gap();
			(record.collapsed ? groupCollapsed : group)(`%s %s`, '+', name);
			try {
				logResults(record.results, globals);
			} catch (exception) {
				warn(exception);
			}
			groupEnd();
		} else if (record != null) {
			gap();
			let status, error, result, fail, pass;

			type === 'object'
				? (status = ({error, result, fail = !!error && result !== FAIL, pass = !fail} = record) && pass)
				: (status = !(fail = !(pass = record === PASS || (record !== FAIL && ((result = record), true)))));

			const color = status ? 'color: green' : 'color: red';
			const mark = status ? '\u2713' : '\u2715';

			Reflect.apply(
				((result === true || result === PASS || result === FAIL || result === false || result == undefined) &&
					((result = undefined), !error)) ||
					record.collapsed
					? groupCollapsed
					: group,
				null,
				process ? ['%s %s', mark, name] : [`%c%s %s`, color, mark, name],
			);

			// result !== undefined && log('%o', result);
			result !== undefined && dir(result);
			error !== undefined && warn('%o', error);
			groupEnd();
		}
	}
};
