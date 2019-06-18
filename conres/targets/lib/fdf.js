import {loadSourceTextFrom, matchAll, LineBreaks, dynamicImport, debugMatcher} from '../helpers.js';

// FDF Fluent Data Format

/**
 * @param {string} sourceText
 * @param {{copy?(output: string): void}} [options]
 */
export const parse = (sourceText, options) => {
	const {copy} = {...options};
};

export const normalize = text => text.replace(/((?=^ *)|(?= *$)|[^\r\n\t\s] (?= *[^\r\n\t\s])|) */gm, '$1');

/**
 * @param {string | URL} source
 * @param {} [options]
 */
export const load = async (specifier, options) => {
	const sourceText = await loadSourceTextFrom(specifier);
	if (sourceText && sourceText.trim()) {
		// const {copy} = {...options} = {...options};
		return parse(normalize(sourceText, options));
	}
	warn(`The requested location %O returned %O`, specifier || `${url}`, sourceText);
};

/** @typedef {Partial<{copy: (output: string) => void}>} Options */

export default globalThis.FDF = Object.create(null, {
	parse: {value: parse, enumerable: true},
	load: {value: load, enumerable: true},
	normalize: {value: normalize, enumerable: true},
	[Symbol.toStringTag]: {value: 'FDF [Fluent Data Format]', enumerable: true},
});
