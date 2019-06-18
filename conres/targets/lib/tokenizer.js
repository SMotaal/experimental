const defaults = {
	mode: {
		matcher: /([\s\n]+)|(\S.*?(?=\s|\n|$))/g,
		types: ['whitespace', 'sequence'],
	},
};

export class Tokenizer {
	*tokenize(source, state = {}) {
		const {mode = (state.mode = defaults.mode), range = (state.range = {})} = state;

		this.prime(state, source);

		/** @type {{matcher: RegExp, types: string[]}} */
		const {
			matcher,
			matcher: {types},
		} = mode;

		let matchIndex = state.matchIndex;

		while (!(matchIndex > state.matchIndex) && !(matchIndex > state.finalIndex)) {
			matchIndex = matcher.lastIndex = state.matchIndex;
			const match = matcher.exec(source);
			state.matchIndex = matcher.lastIndex;

			// TODO: Decide on how to handle unmatched deadlock
			if (!match || !match[0]) return;

			const [matched, ...matches] = match;
			const typeIndex = matches.findIndex(Boolean);
			const type = types[typeIndex];
			const text = typeIndex >= 0 ? matches[typeIndex] : matched;
			const index = typeIndex >= 0 ? match.index + matched.indexOf(text) : match.index;
			const length = text.length;

			yield {type, text, index, length};
		}
	}

	prime(state, source) {
		if (state.source === source) return state;

		const length = typeof source === 'string' || (source && source instanceof String) ? source.length : undefined;

		let {start = 0, end = length} = {...state.range};

		start >= 0 && (start <= length || (start = length));
		end >= 0 || (end = length) >= start || (end = start);

		state.range = {
			start: (state.startIndex = start),
			end: (state.finalIndex = end),
		};

		state.matchIndex = start > 0 ? start - 1 : null;

		return state;
	}
}
