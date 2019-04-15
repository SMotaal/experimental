import {Tokenizer} from './lib/tokenizer.js';
import {tabular} from './tabular.grammar.js';

// import {sequence, matchAll, Segmenter, INSET, LOOKAHEAD} from './helpers.js';

const tokenizer = new Tokenizer();

export const tokenize = source => {
	const state = {mode};
	const tokens = tokenizer.tokenize(source, state);
	tokens.state = state;
	return tokens;
};

export const parse = source => {
	const tokens = tokenize(source);
	const data = {};
	return {data, tokens};
};

export const normalize = source => source.replace(/((?=^ *)|(?= *$)|\b (?= *\b)|) */gm, '$1');

export const segment = source  => {

}

export const mode = tabular;

// export const mode = {
// 	matcher: / *(?:([\t]+)|((?:\n+|(?:\r\n)+|\r+))|((?:[-+]|\b)(?:\d*\.\d+|\d+(?:\.(?:\d*)|)|\d+)%?(?=\W|$)|(?:\d+E-?\d+|\d+\.\d+E-?\d+))|(\(\b\D\S*?(?:\b[.%]?|\b)\))|(\b(?:(?: *|\b *[-._/:,] *)\w.*?\b)+\S*|\S+?))/giu,

// 	// |(\(?=.*?[\w\.]\))(\w[\w\. ]*\))
// 	types: ['tabs', 'feed', 'numeric', 'unit', 'sequence'],
// };
