import {Tokenizer} from './tokenizer.js';

const tokenizer = new Tokenizer();

export const parse = source => {
  const mode = {
			// matcher: /([ \t]+)|([\s\n]+)|(.+?(?=\s|\n|$))|(.*)/gu,
			// matcher: /([ \t]+)|([\s\n]+)|(.+?(?=\s|\n|$))/gu,
			matcher: /([\t]+)|(\n+\s*)|([^\n\t]+)/g,
			types: ['tabs', 'feed', 'sequence'],
  };
	const state = {
		mode,
	};
	const tokens = tokenizer.tokenize(source, state);

	tokens.state = state;

	return tokens;
};
