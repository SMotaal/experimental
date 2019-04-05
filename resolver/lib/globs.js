export const PathExpression = (source, flags = source.flags) =>
	new RegExp(
		(((source || '') && source.source) || source).replace(
			/\[\^\/\](?=[*+?])/g,
			PathExpression.SegmentParts.source.slice(0, -1),
		),
		flags,
	);

PathExpression.SegmentParts = /(?:\[(?:\[|\]|(?:\\.|[^\\])*?)]\|\\.|\\$|[^\\/]+)+/g;
PathExpression.DoubleAstrisksParts = PathExpression(/(^|\/)[^/]*\*\*[^/]*(?:\/\.\.|\/\.)*(?=\/|$)/g);
PathExpression.DotSlashParts = PathExpression(/(^|\/)\.(?:\/|$)/g);
PathExpression.DoubleDotSlashParts = PathExpression(/(^|\/?)(?:(?=[^/])[^/]+\/|)\.\.(?:\/|$)/g);
PathExpression.PathSegments = PathExpression(/^(?=\/+)|(?=[^/])[^/]+/g);

const matchAll = (string, pattern) => {
	pattern = new RegExp((pattern && pattern.source) || pattern, pattern && 'flags' in pattern ? pattern.flags : 'g');
	if (!/[gy]/.test(pattern.flags)) return (pattern.exec(string) || '')[0];
	let match;
	const results = [];
	while ((match = pattern.exec(string))) results.push(match[0]);
	return results;
};

PathExpression.split = path => [
	...((path || '') &&
		`${path}`
			.replace(PathExpression.DoubleAstrisksParts, '$1**')
			.replace(PathExpression.DotSlashParts, '$1')
			.replace(PathExpression.DoubleDotSlashParts, '$1')
			.matchAll(PathExpression.PathSegments)),
];

PathExpression.normalize = path => PathExpression.split(path).join('/');

PathExpression.fromGlob = glob => {
	const normlized = PathExpression.split(glob).join('/');
	return new RegExp(
		`^${
			normlized
				// .replace(/(^|[^\\])\[(\!|)(\[|\]|[^\[\]\\/]+?)\]/g, (m, a, b, c) =>
				.replace(/\\.|\[(\^?)(\[|\]|[^\[\]\\/]*?)\]|(\?)/g, (m, b, c, d) =>
					d ? `[^/]` : b || c ? `(?=[^\\\\/])[${b ? '^' : ''}${c === '[' || c === ']' ? `\\${c}` : c}]` : m,
				)
				// .replace(/(^|\/)\*\*($|\/)/g, `$1(?:${PathExpression.SegmentParts.source}/)*?`)
				// .replace(/(^|\/)\*\*($|\/)/g, '$1(?:.*$2|)')
				// .replace(/(^|\/)\*\*($|\/)/g, '(?:^|\\/).*(?:$|\\/)')
				.replace(/(^|\/)\*\*($|\/)/g, (m, a, b) => (a ? `/(?:.*(?:$|/))?` : b ? `(?:(?:^|/).*)?/` : m))
				.replace(/\*/g, '.*')
			// .replace(/(^|[^\*])\*($|[^\*])/g, `$1${PathExpression.SegmentParts.source}$2`)
			// .replace(/(^|\/)\*\*($|\/)/g, `$1.*$2`)
		}`,
	);
};
