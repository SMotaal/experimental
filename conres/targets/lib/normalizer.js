export const Normalizer = (() => {
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
