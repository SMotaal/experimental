import {Matcher} from './helpers.js';

export const tabular = (() => {
	const {sequence, define, INSET, LOOKAHEAD, UNKNOWN, OUTSET, DELIMITER} = Matcher;
	const sequences = {
		NUMERIC: sequence`
			(?:(?:[-+]|\b)(?:\d*\.\d+|\d+(?:\.(?:\d*)|)|\d+)%?(?=\W|$))|
			\d+E-?\d+|
			\d+\.\d+E-?\d+
		`,
		UNIT: sequence`\(\b\D\S*?(?:\b[.%]?|\b)\)`,
		SEQUENCE: sequence`\b(?:(?: *|\b *[-._/:,] *)\w.*?\b)+\S*?|\S+?`,
	};

	const matcher = Matcher.define(
		entity =>
			sequence`^(?:
				${entity('row')}(?: *(.*\t.*) *)|
				${entity('slug')}(?: *\[ +(.*\w.*) +\] *)|
				${entity('slug')}(?: *(.*\w.*) *)|
				${entity('feed')}(?: *())
			)$(?:\r\n|\n)?`,
		'gmi',
	);

	matcher.row = Matcher.define(
		entity =>
			sequence`
				(?:
					(?: *)
					(?:
						(?=[^\s\t\n\r]+.*? *(?:[\t\n\r]|$))
						(?:
							(?:\[ +(${entity('comment')}[^\t\n\r\)]+) +\])|
							(?:
								(${(entity('numeric'), sequences.NUMERIC)})|
								(${(entity('sequence'), sequences.SEQUENCE)})
							)
							(?:(${(entity('unit'), sequences.UNIT)})|)
						)|
						(${entity('empty')}(?= *\t))
					)
					(?: *)
				)(${entity(DELIMITER)}[\t\n\r]|$)
				`,
		'giu',
	);

	return {matcher};
})();

// SPACE: sequence` `,
// TAB: sequence`\t`,
// FEED: sequence`\n|\r\n|\r`,
