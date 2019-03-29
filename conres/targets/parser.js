import {Tokenizer} from './tokenizer.js';

const tokenizer = new Tokenizer();

const Normalizer = (() => {
	class Normalizer extends RegExp {
		replace(text, replacer = this.replacer) {
			return !text || replacer == null ? text : this[Symbol.replace](text, replacer);
		}
	}

	const Flags = /[yg]|$/;

	return (matcher, replacer, flags) =>
		Object.defineProperty(
			new Normalizer(
				(matcher && matcher.source) || matcher || undefined,
				`${flags || (flags = matcher && matcher.flags) ? Flags[Symbol.replace](flags, 'g') : 'g'}`,
			),
			'replacer',
			{value: replacer, enumerable: true},
		);
})();

export const LineBreaks = Normalizer(/\n|\r\n|\r/g, '\n');
export const Tabs = Normalizer(/\t/g);

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

export const mode = {
	matcher: / *(?:([\t]+)|((?:\n+|(?:\r\n)+|\r+))|((?:[-+]|\b)(?:\d*\.\d+|\d+(?:\.(?:\d*)|)|\d+)%?(?=\W|$)|(?:\d+E-?\d+|\d+\.\d+E-?\d+))|(\(\b\D\S*?(?:\b[.%]?|\b)\))|(\b(?:(?: *|\b *[-._/:,] *)\w.*?\b)+\S*|\S+?))/giu,

	// |(\(?=.*?[\w\.]\))(\w[\w\. ]*\))
	types: ['tabs', 'feed', 'numeric', 'unit', 'sequence'],
};
