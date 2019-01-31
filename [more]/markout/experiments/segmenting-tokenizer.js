{
	const modes = {
		regexp: {
      syntax: 'regexp',
			segmenters: {
				regexp: {open: /\(|\[/, close: /\)|\]/, escape: /\\/},
				'[': {open: /\[/, close: /\]/},
			},
		},
	};

	class Tokenizer {
		constructor({syntax = 'regexp', mode = modes[syntax], segmenters = (mode && mode.segmenters) || {}}) {
			this.syntax = syntax;
			this.mode = mode;
			this.segmenters = segmenters;
		}

		segment() {}

		*tokenize(sourceText, segment = {}) {
			let done, goal, index, segmenter, start, end;

			const {syntax, segmenters} = this;

			while (!done) {
				segment = {
					previous: ({goal = syntax, end: index = -1} = segment),
					goal,
					index,
					segmenter: goal === segment.goal ? segmenter : segmenters[goal],
					// start,
					// end,
				};
				// segment.goal
				// segment.start
				// segment.end
				// segment.tokens
			}
		}
	}
}
