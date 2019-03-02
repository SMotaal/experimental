import {loadSourceTextFrom} from './helpers.js';
import {parse} from './parser.js';

const dumpTokens = tokens => {
	for (const token of tokens) {
		const preview = token.text
			.replace(/\n/g, '\u23CE')
			.replace(/ /g, '\u2423')
			.replace(/\t/g, '\u21E5');
		console.groupCollapsed(preview);
		console.log(token);
		console.groupEnd();
	}
};

(async () => {
	const sourceText = await loadSourceTextFrom('./examples/conres-35-z.log');

	await new Promise(resolve => setTimeout(resolve, 2000));

	// const {from: all} = Array;
	// const all = source => Array.from(source);
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

	benchmark: {
		console.time('cool');
		// for (let n = 10; n--; [...parse(sourceText)]);
		for (let n = 10; n--; all(parse(sourceText)));
		console.timeEnd('cool');
		console.time('warm');
		for (let n = 10; n--; all(parse(sourceText)));
		console.timeEnd('warm');
		console.time('hot');
		for (let n = 10; n--; all(parse(sourceText)));
		console.timeEnd('hot');
	}

	spec: {
		// console.log(sourceText);
		const tokenizer = parse(sourceText);
		const {state} = tokenizer;
		const tokens = all(tokenizer);
		console.group(sourceText);
		console.log('state: %o', state);
		// console.log({tokenizer, state});
		const table = {};
		for (const token of tokens) {
			const {index, text, type} = token;
			table[index] = {
				text: text
					.replace(/\n/g, '\u23CE')
					.replace(/ /g, '\u2423')
					.replace(/\t/g, '\u21E5'),
				type,
			};
			// token.text = ;
		}
		console.table(table);
		console.groupEnd();
	}
})();
