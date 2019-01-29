import {globals, FAIL, PASS} from './helpers.js';

export default async (locals = {}) => {
	try {
		// const {} = (locals = {...globals, ...locals});
		const results = {
			['PASS']: PASS,
			['{pass}']: {pass: true},
			['{result: PASS}']: {result: PASS},
			['{result: 1}']: {result: 1},
			['FAIL']: FAIL,
			['{fail}']: {fail: true},
			['{result: FAIL}']: {result: FAIL},
			['{error: Error}']: {error: new Error('not an error')},
		};

		return {[import.meta.url]: {results, collapsed: true}};
	} catch (error) {
		return {[import.meta.url]: {error}};
	}
};
