import {loadSourceTextFrom} from './helpers.js';

const options = {
	example: 'RIT_c CirRe35X/c CirRe35X.LOG',
};

globalThis.$tabular = async function debug(specifier) {
	const timestamp = `?${encodeURIComponent(Date.now())}`;
	const {TabularSegmenter} = await import(`./segmenter.js${timestamp}`);
	const url = specifier ? new URL(specifier, location) : `${new URL(`./examples/${options.example}`, import.meta.url)}`;
	const response = await fetch(url);
	if (!response.ok) console.warn(Error(`Failed to fetch ${url}`));
	const sourceText = await response.text();
	TabularSegmenter.debug(sourceText);
};

// import {parse, tokenize, LineBreaks, Tabs} from './parser.js';

// setTimeout(async () => {
// 	// const example = 'RIT_c CirRe35X/c CirRe35X.LOG';
// 	const {example = 'conres-35x-c.log'} = options;
// 	const sourceText = await loadSourceTextFrom(`${new URL(`./examples/${example}`, import.meta.url)}`);

// 	// benchmarks: if (options.benchmark) {
// 	// 	tokenization: if (options.tokenization) {
// 	// 		await new Promise(resolve => setTimeout(resolve, 1000));
// 	// 		group('Tokenization');
// 	// 		time('cool');
// 	// 		for (let n = 10; n--; all(tokenize(sourceText)));
// 	// 		timeEnd('cool');
// 	// 		time('warm');
// 	// 		for (let n = 10; n--; all(tokenize(sourceText)));
// 	// 		timeEnd('warm');
// 	// 		time('hot');
// 	// 		for (let n = 10; n--; all(tokenize(sourceText)));
// 	// 		timeEnd('hot');
// 	// 		groupEnd();
// 	// 	}
// 	// }

// 	// tokenizer: if (options.tokenization) {
// 	// 	const tokenizer = tokenize(sourceText);
// 	// 	const {state} = tokenizer;
// 	// 	const tokens = all(tokenizer);
// 	// 	group('Tokenization');
// 	// 	log('state: %o', state);
// 	// 	groupCollapsed(`Source ‹${typeof sourceText}›`);
// 	// 	log(
// 	// 		'%c%s',
// 	// 		'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
// 	// 		LineBreaks.replace(sourceText),
// 	// 	);
// 	// 	groupEnd();
// 	// 	groupCollapsed(`Output ‹tokens›`);
// 	// 	// log({tokenizer, state});
// 	// 	const output = {};
// 	// 	let nextIndex, skipped;
// 	// 	for (const token of tokens) {
// 	// 		const {index, text, type} = token;
// 	// 		if (index > nextIndex) {
// 	// 			output[nextIndex] = {skipped: sourceText.slice(nextIndex, index)};
// 	// 		}
// 	// 		output[index] = {type, text: renderWhitespace(text), skipped};
// 	// 		nextIndex = index + text.length;
// 	// 	}
// 	// 	table(output);
// 	// 	groupEnd();
// 	// 	groupEnd();
// 	// }
// });

const {log, warn, group, groupCollapsed, groupEnd, table, time, timeEnd} = console;

const renderWhitespace = text =>
	text
		? Tabs.replace(LineBreaks.replace(text, '¶'), '\u21E8')
		: // .replace(/ /g, '\u2423')
		  // .replace(/\t/g, '\u21E8')
		  '';

const all = {
	from: Array.from,
	spread: source => [...source],
	forOf: source => {
		const array = [];
		for (const item of source) array.push(item);
		return array;
	},
	for: source => {
		const array = [];
		for (let result = source.next(); result && !result.done; array.push(result.value), result = source.next());
		return array;
	},
}.from;
