import {sequence, matchAll, Segmenter, INSET, LOOKAHEAD} from './helpers.js';

console.log(import.meta.url);

export const TabularSegmenter = (() => {
	const Start = sequence`(?:[^#${'`'}~<>|\n\s]|${'`'}{1,2}(?!${'`'})|~{1, 2}(?!~))`;
	const Line = sequence`(?:${Start})(?:.*)*$`;
	const Segments = Segmenter.define(
		type =>
			sequence`^
      (?:
        ${type(INSET)}((?:\t)*?)
        (?:
          ${type('feed')}(?:(\t*(?:\n\1\t)*)$)|
          ${type('paragraph')}(?:(${Line}(?:\n\1 {0,2}${Line})*)$)
        )
      )(?=${type(LOOKAHEAD)}(.*))
    `,
		'gmi',
	);
	return Segments;
})();
