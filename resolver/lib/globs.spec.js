import {PathExpression} from './globs.js';

export default ({logger = console} = {}) => {
	const paths = [`a/./b/?/c/../c/d/../d/e`]
		.flatMap(path => [
			path,
			(path = path.replace('/b/', '/b/**/../')),
			(path = path.replace('/c/', '/c[123][1-3][^1-3][[]/*/')),
			(path = path.replace('/e', '/*/e*/f')),
		])
		.flatMap(path => [
			(path = path.replace(/^\/?/, '')),
			(path = `../${path}`),
			(path = `/${path}`),
			(path = path.replace(/\/?$/, '/*')),
			(path = path.replace(/^\/?/, '**/')),
			(path = `/${path}`),
		]);

	const results = {};
	const rows = [];

	for (const source of paths) {
		const glob = PathExpression.normalize(source);
		const matcher = PathExpression.fromGlob(glob);
		const pass = [];
		const fail = [];
		const base = glob
			.replace(/\\.|\[(\^?)(\[|\]|[^\[\]\\/]*?)\]/g, (m, b, c) => (b || c ? `${b ? '×' : c[0]}` : m))
			.replace(/\?/g, '$');

		let spec;

		(matcher.test((spec = base.replace(/(^|\/)\*\*($|\/)/g, '/').replace(/\*/g, '×'))) ? pass : fail).push(spec),
			(matcher.test((spec = spec.replace('/b/', '/'))) ? fail : pass).push(spec);
		(matcher.test((spec = base.replace(/(^|\/)\*\*($|\/)/g, '$1××/××$2').replace(/\*/g, '×'))) ? pass : fail).push(
			spec,
		),
			(matcher.test((spec = spec.replace('/b/', '/'))) ? fail : pass).push(spec);

		rows.push((results[source] = {source, glob, specs: {pass, fail}}));
	}

	logger && typeof logger.table === 'function' && logger.table(rows);

	return results;
};
