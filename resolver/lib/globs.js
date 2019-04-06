const matchAll = Function.call.bind(
	String.prototype.matchAll ||
		{
			/**
			 * @this {string}
			 * @param {RegExp | string} pattern
			 */
			*matchAll() {
				const next = ((arguments[0] && arguments[0].exec) || RegExp.prototype.exec).bind(
					Object.assign(RegExp(arguments[0]), {lastIndex: null}),
					String(this),
				);
				for (
					let match, lastIndex = -1;
					lastIndex < ((match = next()) ? (lastIndex = match.index) : lastIndex);
					yield match
				);
			},
		}.matchAll,
);
export const PathExpression = (source, flags = source.flags) =>
	new RegExp(
		(((source || '') && source.source) || source).replace(
			/\[\^\\?\/\](?=[*+?])/g,
			PathExpression.SegmentParts.source.slice(0, -1),
		),
		flags,
	);

PathExpression.SegmentParts = /(?:\[(?:\[|\]|(?:\\.|[^\\\[\]]+)*)?\]|\\.|\\$|[^/\\]+)+/g;
PathExpression.DotSlashParts = PathExpression(/(\/|^)\.(?:\/|$)/g);
// PathExpression.DoubleDotSlashParts = PathExpression(/(\/?|^)(?:(?=[^\/])[^\/]+\/|)\.\.(?:\/|$)/g);
PathExpression.DoubleDotSlashParts = PathExpression(/([/]|^[/]?)(?:[^\/]+\/)?\.\.(?:[/]|[/]?$)/g);
// PathExpression.DoubleDotSlashParts = PathExpression(/^\/?\.\.\/?$|^\.\.\/|\/\.\.$|(?:\/?[^\/]+\/)?\.\./g);
// PathExpression.PathSegments = PathExpression(/^(?=\/+)|(?=[^\/])[^\/]+/g);
PathExpression.PathSegments = PathExpression(/(?=[^\/])[^\/]+/g);

PathExpression.split = path => [
	...((path = `${path || ''}`).startsWith('/') && (path = path.slice(1)) ? [''] : ''),
	...(path &&
		matchAll(
			`${path}`
				// .replace(PathExpression.DoubleAstrisksParts, '$1**')
				.replace(new RegExp(PathExpression.DotSlashParts), '$1')
				.replace(new RegExp(PathExpression.DoubleDotSlashParts), '/'),
			PathExpression.PathSegments,
		)),
	// ...(path.endsWith('/') ? [''] : ''),
];

PathExpression.normalize = path => PathExpression.split(path).join('/');

PathExpression.fromGlob = glob => {
	const normlized = PathExpression.split(glob).join('/');
	return new RegExp(
		`^${normlized
			.replace(/\\.|\[(\^?)(\[|\]|[^\[\]/\\]*?)\]|(\?)/g, (m, b, c, d) =>
				d
					? String.raw`[^\/]`
					: b || c
					? String.raw`(?=[^/\\])[${b ? '^' : ''}${c === '[' || c === ']' ? String.raw`\\${c}` : c}]`
					: m,
			)
			.replace(/\\.|(\/|^)(\*\*)(\/|$)|(\*)/g, (m, a, b, c, d) =>
				d
					? String.raw`${PathExpression.SegmentParts.source.slice(0, -1)}*`
					: a
					? String.raw`/(?:.*(?:$|/))?`
					: c
					? `(?:(?:^|/).*)?/`
					: b
					? '.*'
					: m,
			)}`,
	);
};

// PathExpression.SegmentParts = /(?:\[(?:\[|\]|(?:\\.|[^\\])*?)]\|\\.|\\$|[^\\/]+)+/g;
// PathExpression.DoubleAstrisksParts = PathExpression(/(^|\/)[^\/]*\*\*[^\/]*(?:\/\.\.|\/\.)*(?=\/|$)/g);

// .replace(/(^|\/)\*\*($|\/)/g, (m, a, b) => (a ? `/(?:.*(?:$|/))?` : b ? `(?:(?:^|/).*)?/` : m))
// .replace(/\*/g, '.*')
// ? String.raw`(?:(?:^|/)${PathExpression.SegmentParts.source.slice(0, -1)}*)?/`
