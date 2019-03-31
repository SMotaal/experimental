import {loadSourceTextFrom} from './helpers.js';
import {parse, tokenize, LineBreaks, Tabs} from './parser.js';

const options = {
	// benchmark: true,
	tokenization: true,
};

setTimeout(async () => {
	const sourceText = await loadSourceTextFrom(`${new URL('./examples/conres-35X-c.log', import.meta.url)}`);

	benchmarks: if (options.benchmark) {
		tokenization: if (options.tokenization) {
			await new Promise(resolve => setTimeout(resolve, 1000));
			group('Tokenization');
			time('cool');
			for (let n = 10; n--; all(tokenize(sourceText)));
			timeEnd('cool');
			time('warm');
			for (let n = 10; n--; all(tokenize(sourceText)));
			timeEnd('warm');
			time('hot');
			for (let n = 10; n--; all(tokenize(sourceText)));
			timeEnd('hot');
			groupEnd();
		}
	}

	tokenizer: if (options.tokenization) {
		const tokenizer = tokenize(sourceText);
		const {state} = tokenizer;
		const tokens = all(tokenizer);
		group('Tokenization');
		log('state: %o', state);
		groupCollapsed(`Source ‹${typeof sourceText}›`);
		log(
			'%c%s',
			'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
			LineBreaks.replace(sourceText),
		);
		groupEnd();
		groupCollapsed(`Output ‹tokens›`);
		// log({tokenizer, state});
		const output = {};
		let nextIndex, skipped;
		for (const token of tokens) {
			const {index, text, type} = token;
			if (index > nextIndex) {
				output[nextIndex] = {skipped: sourceText.slice(nextIndex, index)};
			}
			output[index] = {type, text: renderWhitespace(text), skipped};
			nextIndex = index + text.length;
		}
		table(output);
		groupEnd();
		groupEnd();
	}
});

const {log, warn, group, groupCollapsed, groupEnd, table, time, timeEnd} = console;

const renderWhitespace = text =>
	text
		? Tabs.replace(LineBreaks.replace(text, '¶'), '\u21E8')
		: // .replace(/ /g, '\u2423')
		  // .replace(/\t/g, '\u21E8')
		  '';

const dumpTokens = tokens => {
	for (const token of tokens) {
		const preview = renderWhitespace(token.text);
		console.groupCollapsed(preview);
		console.log(token);
		console.groupEnd();
	}
};

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
