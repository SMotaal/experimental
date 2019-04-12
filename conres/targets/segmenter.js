import {sequence, matchAll, Segmenter, INSET, LOOKAHEAD} from './helpers.js';

// console.log(import.meta.url);

export const TabularSegmenter = (() => {
	// const Start = sequence`(?:[^#${'`'}~<>|\n\s]|${'`'}{1,2}(?!${'`'})|~{1, 2}(?!~))`;
	// const Line = sequence`(?:${Start})(?:.*)*$`;
	const Segments = Segmenter.define(
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
	return Segments;
})();
