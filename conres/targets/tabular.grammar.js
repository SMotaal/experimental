import {sequence, Segmenter, INSET, LOOKAHEAD} from './helpers.js';

export const tabular = (() => {
	const SPACE = ' ';
	const TAB = sequence`\t`;
	const FEED = sequence`\n|\r\n|\r`;
	const NUMERIC = sequence`
		(?:
			(?:[-+]|\b)
			(?:
				\d*\.\d+|
				\d+(?:\.(?:\d*)|)|
				\d+
			)%?(?=\W|$)
		)|
		\d+E-?\d+|
		\d+\.\d+E-?\d+
	`;
	const UNIT = sequence`\(\b\D\S*?(?:\b[.%]?|\b)\)`;
	const SEQUENCE = sequence`\b(?:(?: *|\b *[-._/:,] *)\w.*?\b)+\S*|\S+?`;

	// for (const sequence of [SPACE, FEED, TAB, NUMERIC, UNIT, SEQUENCE]) console.log(sequence, new RegExp(sequence));

	// TODO: Why not just `const types = [,];` for parity
	const types = [];
	const matcher = new RegExp(
		sequence`
			(?: *)
			(?:
				(${(types.push('feed'), FEED)})|
				(${(types.push('tab'), TAB)})|
				(${(types.push('numeric'), NUMERIC)})|
				(${(types.push('unit'), UNIT)})|
				(${(types.push('sequence'), SEQUENCE)})
			)
			(?: *)
		`,
		'giu',
	);

	const segmenter = Segmenter.define(
		type =>
			sequence`^
        (?:
          ${type(INSET)}((?:\t)*?)
          (?:
            ${type('feed')}(?:(\t*(?:\n\1\t)*)$)|
            ${type('row')}(?:(.*\t.*)$)|
            ${type('slug')}(?:(.*)$)
          )
        )(?=${type(LOOKAHEAD)}(.*))
      `,
		'gmi',
	);

	// const INDEX = sequence`\[\d+\]`;

	// const SEPARATOR = sequence``;

	const inset = type => sequence`(${type(INSET)}${TAB}|${FEED})`;

	// (${type('empty')}(?:^(?= *[\t\n\r]| *$)|${inset(type)}) *)|

	segmenter.row = Segmenter.define(
		type =>
			sequence`
				(^${type('empty')} *(?=[\t\n\r]))|
				(?:^|${inset(type)})?
				(?:
					(?:
						(?: *)
						(?:
							(?:\((${type('comment')}[^\t\n\r\)]+)\))|
							(?:
								(${(type('numeric'), NUMERIC)})|
								(${(type('sequence'), SEQUENCE)})
							)
							(?:(${(type('unit'), UNIT)})|)
						)
						(?: *)
					)|
					(${type('empty')} *(?=${TAB}|${FEED}))
				)(?=${type(LOOKAHEAD)}((?:${TAB}|${FEED}).*|$))
      `,
		'giu',
	);

	return {matcher, types, segmenter};
})();
